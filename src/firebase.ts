import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AppDatabaseState,
  SchoolClass,
  Student,
  Subject,
  GradeRecord,
  SchoolSetting,
  UserAccount,
  TeacherAssignment,
  AcademicYear,
  normalizeRole,
} from './types';
import { BOOTSTRAPPED_ADMIN_EMAIL } from './data/initialData';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned.length > 0 && ID_REGEX.test(cleaned) ? cleaned : `id_${Date.now()}`;
}

function clampString(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = (val ?? fallback).trim();
  return str.slice(0, maxLen);
}

function clampNonEmptyString(val: string | undefined | null, maxLen: number, fallback: string): string {
  const str = (val ?? '').trim();
  return (str.length > 0 ? str : fallback).slice(0, maxLen);
}

function clampInt(val: number | undefined | null, min: number, max: number, fallback = 0): number {
  const n = Number.isFinite(Number(val)) ? Math.round(Number(val)) : fallback;
  return Math.max(min, Math.min(max, n));
}

export async function signInWithGooglePopup() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutGoogleUser() {
  return signOut(auth);
}

/**
 * Bootstraps or resolves the signed-in Firebase user against the centralized school database.
 * - If user email matches BOOTSTRAPPED_ADMIN_EMAIL, ensures `/admins/{uid}` and `/users/{uid}` exist as admin.
 * - Otherwise checks if `/users/{uid}` exists or matches a pre-registered teacher email.
 */
export async function resolveOrBootstrapFirebaseUser(
  currentUsers: UserAccount[]
): Promise<UserAccount | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) return null;

  const uid = sanitizeId(user.uid);
  const emailLower = user.email.toLowerCase();
  const isBootstrapAdmin = emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  if (isBootstrapAdmin) {
    const adminPath = `admins/${uid}`;
    try {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: clampNonEmptyString(user.email, 120, BOOTSTRAPPED_ADMIN_EMAIL),
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, adminPath);
    }

    const adminUser: UserAccount = {
      uid,
      email: user.email,
      name: user.displayName || 'Administrator Utama Sekolah',
      nip: '19720815 200003 1 002',
      role: 'admin',
      homeroomClass: '',
      assignedSubjectIds: [],
      assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
      isActive: true,
      active: true,
    };

    const userPath = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: clampNonEmptyString(adminUser.email, 120, BOOTSTRAPPED_ADMIN_EMAIL),
        name: clampNonEmptyString(adminUser.name, 120, 'Admin Sekolah'),
        nip: clampString(adminUser.nip, 50, ''),
        role: 'admin',
        homeroomClass: '',
        assignedSubjectIds: '',
        assignedClasses: adminUser.assignedClasses.join(','),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }

    return adminUser;
  }

  // Check if user document already exists in Firestore `/users/{uid}`
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      return {
        uid: d.uid,
        email: d.email,
        name: d.name,
        nip: d.nip || '',
        role: normalizeRole(d.role),
        homeroomClass: d.homeroomClass || '',
        assignedSubjectIds: d.assignedSubjectIds ? String(d.assignedSubjectIds).split(',').filter(Boolean) : [],
        assignedClasses: d.assignedClasses ? String(d.assignedClasses).split(',').filter(Boolean) : [],
        isActive: Boolean(d.isActive),
        active: Boolean(d.isActive),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  // Check if email matches an admin-created account in currentUsers
  const matchedByEmail = currentUsers.find(
    (u) => u.email.toLowerCase() === emailLower
  );
  if (matchedByEmail) {
    return {
      ...matchedByEmail,
      uid,
      role: normalizeRole(matchedByEmail.role),
    };
  }

  // Otherwise create a pending non-admin teacher registration (requires admin activation)
  const pendingUser: UserAccount = {
    uid,
    email: user.email,
    name: user.displayName || user.email.split('@')[0],
    nip: '',
    role: 'teacher',
    homeroomClass: '',
    assignedSubjectIds: [],
    assignedClasses: [],
    isActive: false,
    active: false,
  };

  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email: clampNonEmptyString(pendingUser.email, 120, 'guru@sekolah.sch.id'),
      name: clampNonEmptyString(pendingUser.name, 120, 'Guru Baru'),
      nip: '',
      role: 'teacher',
      homeroomClass: '',
      assignedSubjectIds: '',
      assignedClasses: '',
      isActive: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
  }

  return pendingUser;
}

/**
 * Synchronizes centralized school state to Firestore collections (`users`, `subjects`, `classes`, `students`,
 * `teacherAssignments`, `academicYears`, `grades`, `attendance`, `reportNotes`, `settings`, `schoolSettings`).
 */
export async function syncStateToFirestore(
  state: AppDatabaseState,
  activeUser: UserAccount
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;
  const uid = sanitizeId(fbUser.uid);
  const isAdminUser =
    activeUser.role === 'admin' &&
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  if (isAdminUser) {
    // 1. Sync Users
    for (const usr of state.users) {
      const docId = sanitizeId(usr.uid);
      const path = `users/${docId}`;
      const normalizedRole = normalizeRole(usr.role);
      try {
        await setDoc(doc(db, 'users', docId), {
          uid: docId,
          email: clampNonEmptyString(usr.email, 120, 'guru@smamaarif05.sch.id'),
          name: clampNonEmptyString(usr.name, 120, 'Guru'),
          nip: clampString(usr.nip, 50, ''),
          role: normalizedRole,
          homeroomClass: clampString(usr.homeroomClass, 50, ''),
          assignedSubjectIds: clampString(usr.assignedSubjectIds.join(','), 500, ''),
          assignedClasses: clampString(usr.assignedClasses.join(','), 300, ''),
          isActive: Boolean(usr.isActive),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 2. Sync Subjects (must exist before teacherAssignments & grades)
    for (const sub of state.subjects) {
      const docId = sanitizeId(sub.id);
      const path = `subjects/${docId}`;
      try {
        await setDoc(doc(db, 'subjects', docId), {
          code: clampNonEmptyString(sub.code, 30, 'MAPEL'),
          name: clampNonEmptyString(sub.name, 120, 'Mata Pelajaran'),
          className: clampNonEmptyString(sub.className, 100, 'Semua Kelas'),
          teacherName: clampNonEmptyString(sub.teacherName, 120, '-'),
          teacherUid: sanitizeId(sub.teacherUid || uid),
          isVisible: Boolean(sub.isVisible),
          learningOutcome: clampString(sub.learningOutcome, 1000, ''),
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 3. Sync Classes
    for (const cls of state.classes) {
      const docId = sanitizeId(cls.id);
      const path = `classes/${docId}`;
      try {
        await setDoc(doc(db, 'classes', docId), {
          name: clampNonEmptyString(cls.name, 50, 'X 1'),
          homeroomTeacherName: clampNonEmptyString(cls.homeroomTeacherName, 120, '-'),
          homeroomTeacherNip: clampString(cls.homeroomTeacherNip, 50, ''),
          homeroomTeacherRole: clampNonEmptyString(cls.homeroomTeacherRole, 80, 'Wali Kelas'),
          homeroomUid: sanitizeId(cls.homeroomUid || uid),
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 4. Sync Students + Attendance + ReportNotes
    for (const std of state.students) {
      const docId = sanitizeId(std.id);
      const path = `students/${docId}`;
      const validPredicate = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Pembinaan'].includes(
        std.behaviorPredicate
      )
        ? std.behaviorPredicate
        : 'Baik';
      const homeroomUid = sanitizeId(std.homeroomUid || uid);
      try {
        await setDoc(doc(db, 'students', docId), {
          nisn: clampNonEmptyString(std.nisn, 30, '0000000000'),
          name: clampNonEmptyString(std.name, 120, 'Siswa'),
          gender: std.gender === 'P' ? 'P' : 'L',
          className: clampNonEmptyString(std.className, 50, 'X 1'),
          sakit: clampInt(std.sakit, 0, 365, 0),
          izin: clampInt(std.izin, 0, 365, 0),
          alpa: clampInt(std.alpa, 0, 365, 0),
          behaviorPredicate: validPredicate,
          behaviorNote: clampString(std.behaviorNote, 500, ''),
          homeroomNote: clampString(std.homeroomNote, 500, ''),
          homeroomUid,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'attendance', `att_${docId}`), {
          studentId: docId,
          className: clampNonEmptyString(std.className, 50, 'X 1'),
          academicYear: clampNonEmptyString(state.settings.academicYear, 30, '2026/2027'),
          semester: state.settings.semester === 'Genap' ? 'Genap' : 'Ganjil',
          sakit: clampInt(std.sakit, 0, 365, 0),
          izin: clampInt(std.izin, 0, 365, 0),
          alpa: clampInt(std.alpa, 0, 365, 0),
          homeroomUid,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'reportNotes', `note_${docId}`), {
          studentId: docId,
          className: clampNonEmptyString(std.className, 50, 'X 1'),
          academicYear: clampNonEmptyString(state.settings.academicYear, 30, '2026/2027'),
          semester: state.settings.semester === 'Genap' ? 'Genap' : 'Ganjil',
          behaviorPredicate: validPredicate,
          behaviorNote: clampString(std.behaviorNote, 500, ''),
          homeroomNote: clampString(std.homeroomNote, 500, ''),
          homeroomUid,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 5. Sync Teacher Assignments
    const validSubjectIds = new Set(state.subjects.map((s) => sanitizeId(s.id)));
    for (const asg of state.teacherAssignments) {
      const subId = sanitizeId(asg.subjectId);
      if (!validSubjectIds.has(subId)) continue;
      const docId = sanitizeId(asg.id);
      const path = `teacherAssignments/${docId}`;
      try {
        await setDoc(doc(db, 'teacherAssignments', docId), {
          teacherUid: sanitizeId(asg.teacherUid || uid),
          teacherName: clampNonEmptyString(asg.teacherName, 120, 'Guru'),
          subjectId: subId,
          className: clampNonEmptyString(asg.className, 50, 'X 1'),
          academicYear: clampNonEmptyString(asg.academicYear, 30, '2026/2027'),
          semester: asg.semester === 'Genap' ? 'Genap' : 'Ganjil',
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 6. Sync Academic Years
    for (const ay of state.academicYears) {
      const docId = sanitizeId(ay.id);
      const path = `academicYears/${docId}`;
      try {
        await setDoc(doc(db, 'academicYears', docId), {
          year: clampNonEmptyString(ay.year, 30, '2026/2027'),
          semester: ay.semester === 'Genap' ? 'Genap' : 'Ganjil',
          isActive: Boolean(ay.isActive),
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 7. Sync Grades
    const validStudentIds = new Set(state.students.map((s) => sanitizeId(s.id)));
    for (const grd of state.grades) {
      if (grd.astsScore === null || grd.astsScore === undefined) continue;
      const studentDocId = sanitizeId(grd.studentId);
      const subjectDocId = sanitizeId(grd.subjectId);
      if (!validStudentIds.has(studentDocId) || !validSubjectIds.has(subjectDocId)) continue;
      const docId = sanitizeId(grd.id);
      const cleanCls = grd.className.replace(/\s+/g, '_').toLowerCase();
      const assignmentDocId = sanitizeId(grd.assignmentId || `asg_${subjectDocId}_${cleanCls}`);
      const path = `grades/${docId}`;
      try {
        await setDoc(doc(db, 'grades', docId), {
          studentId: studentDocId,
          subjectId: subjectDocId,
          assignmentId: assignmentDocId,
          className: clampNonEmptyString(grd.className, 50, 'X 1'),
          semester: grd.semester === 'Genap' ? 'Genap' : 'Ganjil',
          academicYear: clampNonEmptyString(grd.academicYear, 30, '2026/2027'),
          astsScore: clampInt(grd.astsScore, 0, 100, 0),
          updatedByTeacher: clampNonEmptyString(grd.updatedByTeacher, 120, 'Guru'),
          teacherUid: sanitizeId(grd.teacherUid || uid),
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // 8. Sync Settings & schoolSettings
    const s = state.settings;
    const settingDocId = 'main_settings';
    const settingPayload = {
      schoolName: clampNonEmptyString(s.schoolName, 150, 'SMA MA’ARIF 05 PADANG RATU'),
      npsn: clampNonEmptyString(s.npsn, 30, '10802055'),
      address: clampNonEmptyString(s.address, 300, 'Padang Ratu'),
      phone: clampString(s.phone, 50, ''),
      email: clampString(s.email, 100, ''),
      website: clampString(s.website, 120, ''),
      principalName: clampNonEmptyString(s.principalName, 120, 'Kepala Sekolah'),
      principalNip: clampString(s.principalNip, 50, ''),
      academicYear: clampNonEmptyString(s.academicYear, 30, '2026/2027'),
      semester: s.semester === 'Genap' ? 'Genap' : 'Ganjil',
      paperSize: s.paperSize === 'A4' ? 'A4' : 'F4',
      orientation: s.orientation === 'Landscape' ? 'Landscape' : 'Portrait',
      fontFamily: clampNonEmptyString(s.fontFamily, 60, 'Times New Roman'),
      fontSize: clampInt(s.fontSize, 8, 20, 11),
      themeColor: clampNonEmptyString(s.themeColor, 30, '#065f46'),
      marginMm: clampInt(s.marginMm, 5, 40, 12),
      showLogo: Boolean(s.showLogo),
      showCp: Boolean(s.showCp),
      showGrades: Boolean(s.showGrades),
      showAttendance: Boolean(s.showAttendance),
      showBehavior: Boolean(s.showBehavior),
      showHomeroomNote: Boolean(s.showHomeroomNote),
      showSignatures: Boolean(s.showSignatures),
      showRanking: Boolean(s.showRanking),
      ownerId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'settings', settingDocId), settingPayload);
      await setDoc(doc(db, 'schoolSettings', settingDocId), settingPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/${settingDocId}`);
    }
  }
}

export async function loadStateFromFirestore(
  fallback: AppDatabaseState
): Promise<AppDatabaseState | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;
  const uid = sanitizeId(user.uid);
  const isBootstrapAdmin =
    user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  if (!isBootstrapAdmin) {
    return null;
  }

  try {
    const classesSnap = await getDocs(
      query(collection(db, 'classes'), where('ownerId', '==', uid))
    );
    if (classesSnap.empty) return null;

    const studentsSnap = await getDocs(
      query(collection(db, 'students'), where('ownerId', '==', uid))
    );
    const subjectsSnap = await getDocs(
      query(collection(db, 'subjects'), where('ownerId', '==', uid))
    );
    const gradesSnap = await getDocs(
      query(collection(db, 'grades'), where('ownerId', '==', uid))
    );
    const settingsSnap = await getDocs(
      query(collection(db, 'settings'), where('ownerId', '==', uid))
    );

    const classes: SchoolClass[] = classesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        homeroomTeacherName: data.homeroomTeacherName,
        homeroomTeacherNip: data.homeroomTeacherNip || '',
        homeroomTeacherRole: data.homeroomTeacherRole || 'Wali Kelas',
        homeroomUid: data.homeroomUid || '',
        homeroomSignatureUrl: '',
      };
    });

    const students: Student[] = studentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nisn: data.nisn,
        name: data.name,
        gender: data.gender === 'P' ? 'P' : 'L',
        className: data.className,
        sakit: Number(data.sakit) || 0,
        izin: Number(data.izin) || 0,
        alpa: Number(data.alpa) || 0,
        behaviorPredicate: data.behaviorPredicate || 'Baik',
        behaviorNote: data.behaviorNote || '',
        homeroomNote: data.homeroomNote || '',
        homeroomUid: data.homeroomUid || '',
      };
    });

    const subjects: Subject[] = subjectsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        code: data.code,
        name: data.name,
        className: data.className,
        teacherName: data.teacherName,
        teacherUid: data.teacherUid || '',
        isVisible: Boolean(data.isVisible),
        learningOutcome: data.learningOutcome || '',
      };
    });

    const grades: GradeRecord[] = gradesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        studentId: data.studentId,
        subjectId: data.subjectId,
        assignmentId: data.assignmentId,
        className: data.className,
        semester: data.semester === 'Genap' ? 'Genap' : 'Ganjil',
        academicYear: data.academicYear,
        astsScore: Number(data.astsScore),
        updatedByTeacher: data.updatedByTeacher,
        teacherUid: data.teacherUid || '',
      };
    });

    let settings: SchoolSetting = { ...fallback.settings };
    if (!settingsSnap.empty) {
      const sData = settingsSnap.docs[0].data();
      settings = {
        ...settings,
        schoolName: sData.schoolName || settings.schoolName,
        npsn: sData.npsn || settings.npsn,
        address: sData.address || settings.address,
        phone: sData.phone ?? settings.phone,
        email: sData.email ?? settings.email,
        website: sData.website ?? settings.website,
        principalName: sData.principalName || settings.principalName,
        principalNip: sData.principalNip ?? settings.principalNip,
        academicYear: sData.academicYear || settings.academicYear,
        semester: sData.semester === 'Genap' ? 'Genap' : 'Ganjil',
        paperSize: sData.paperSize === 'A4' ? 'A4' : 'F4',
        orientation: sData.orientation === 'Landscape' ? 'Landscape' : 'Portrait',
        fontFamily: sData.fontFamily || settings.fontFamily,
        fontSize: Number(sData.fontSize) || settings.fontSize,
        themeColor: sData.themeColor || settings.themeColor,
        marginMm: Number(sData.marginMm) || settings.marginMm,
        showLogo: Boolean(sData.showLogo),
        showCp: Boolean(sData.showCp),
        showGrades: Boolean(sData.showGrades),
        showAttendance: Boolean(sData.showAttendance),
        showBehavior: Boolean(sData.showBehavior),
        showHomeroomNote: Boolean(sData.showHomeroomNote),
        showSignatures: Boolean(sData.showSignatures),
        showRanking: Boolean(sData.showRanking),
      };
    }

    return {
      ...fallback,
      classes,
      students,
      subjects,
      grades,
      settings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'classes');
  }
}

export async function deleteFirestoreDoc(collectionName: string, rawId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const docId = sanitizeId(rawId);
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
