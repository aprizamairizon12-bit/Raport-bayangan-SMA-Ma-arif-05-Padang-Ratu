import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
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
import { AppDatabaseState, SchoolClass, Student, Subject, GradeRecord, SchoolSetting } from './types';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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

// Defensive sanitization helpers matching firebase-blueprint.json & firestore.rules
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

export async function syncStateToFirestore(state: AppDatabaseState): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const uid = user.uid;

  // 1. Sync Classes
  for (const cls of state.classes) {
    const docId = sanitizeId(`${uid}_${cls.id}`);
    const path = `classes/${docId}`;
    try {
      await setDoc(doc(db, 'classes', docId), {
        name: clampNonEmptyString(cls.name, 50, 'X 1'),
        homeroomTeacherName: clampNonEmptyString(cls.homeroomTeacherName, 120, '-'),
        homeroomTeacherNip: clampString(cls.homeroomTeacherNip, 50, ''),
        homeroomTeacherRole: clampNonEmptyString(cls.homeroomTeacherRole, 80, 'Wali Kelas'),
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // 2. Sync Students
  for (const std of state.students) {
    const docId = sanitizeId(`${uid}_${std.id}`);
    const path = `students/${docId}`;
    const validPredicate = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Pembinaan'].includes(std.behaviorPredicate)
      ? std.behaviorPredicate
      : 'Baik';
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
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // 3. Sync Subjects
  for (const sub of state.subjects) {
    const docId = sanitizeId(`${uid}_${sub.id}`);
    const path = `subjects/${docId}`;
    try {
      await setDoc(doc(db, 'subjects', docId), {
        code: clampNonEmptyString(sub.code, 30, 'MAPEL'),
        name: clampNonEmptyString(sub.name, 120, 'Mata Pelajaran'),
        className: clampNonEmptyString(sub.className, 100, 'Semua Kelas'),
        teacherName: clampNonEmptyString(sub.teacherName, 120, '-'),
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

  // 4. Sync Grades (only non-null scores whose student and subject exist)
  const validStudentIds = new Set(state.students.map((s) => s.id));
  const validSubjectIds = new Set(state.subjects.map((s) => s.id));
  for (const grd of state.grades) {
    if (grd.astsScore === null || grd.astsScore === undefined) continue;
    if (!validStudentIds.has(grd.studentId) || !validSubjectIds.has(grd.subjectId)) continue;
    const docId = sanitizeId(`${uid}_${grd.id}`);
    const studentDocId = sanitizeId(`${uid}_${grd.studentId}`);
    const subjectDocId = sanitizeId(`${uid}_${grd.subjectId}`);
    const path = `grades/${docId}`;
    try {
      await setDoc(doc(db, 'grades', docId), {
        studentId: studentDocId,
        subjectId: subjectDocId,
        className: clampNonEmptyString(grd.className, 50, 'X 1'),
        semester: grd.semester === 'Genap' ? 'Genap' : 'Ganjil',
        academicYear: clampNonEmptyString(grd.academicYear, 30, '2026/2027'),
        astsScore: clampInt(grd.astsScore, 0, 100, 0),
        updatedByTeacher: clampNonEmptyString(grd.updatedByTeacher, 120, 'Guru'),
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // 5. Sync Settings
  const s = state.settings;
  const settingDocId = sanitizeId(`${uid}_main_settings`);
  const settingPath = `settings/${settingDocId}`;
  try {
    await setDoc(doc(db, 'settings', settingDocId), {
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
      paperSize: s.paperSize === 'F4' ? 'F4' : 'A4',
      orientation: s.orientation === 'Landscape' ? 'Landscape' : 'Portrait',
      fontFamily: clampNonEmptyString(s.fontFamily, 60, 'Times New Roman'),
      fontSize: clampInt(s.fontSize, 8, 20, 11),
      themeColor: clampNonEmptyString(s.themeColor, 30, '#065f46'),
      marginMm: clampInt(s.marginMm, 5, 40, 15),
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
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingPath);
  }
}

export async function loadStateFromFirestore(fallback: AppDatabaseState): Promise<AppDatabaseState | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;
  const uid = user.uid;
  const prefix = `${uid}_`;
  const stripPrefix = (id: string) => (id.startsWith(prefix) ? id.slice(prefix.length) : id);

  try {
    const classesSnap = await getDocs(query(collection(db, 'classes'), where('ownerId', '==', uid)));
    if (classesSnap.empty) return null;

    const studentsSnap = await getDocs(query(collection(db, 'students'), where('ownerId', '==', uid)));
    const subjectsSnap = await getDocs(query(collection(db, 'subjects'), where('ownerId', '==', uid)));
    const gradesSnap = await getDocs(query(collection(db, 'grades'), where('ownerId', '==', uid)));
    const settingsSnap = await getDocs(query(collection(db, 'settings'), where('ownerId', '==', uid)));

    const classes: SchoolClass[] = classesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: stripPrefix(d.id),
        name: data.name,
        homeroomTeacherName: data.homeroomTeacherName,
        homeroomTeacherNip: data.homeroomTeacherNip || '',
        homeroomTeacherRole: data.homeroomTeacherRole || 'Wali Kelas',
        homeroomSignatureUrl: '',
      };
    });

    const students: Student[] = studentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: stripPrefix(d.id),
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
      };
    });

    const subjects: Subject[] = subjectsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: stripPrefix(d.id),
        code: data.code,
        name: data.name,
        className: data.className,
        teacherName: data.teacherName,
        isVisible: Boolean(data.isVisible),
        learningOutcome: data.learningOutcome || '',
      };
    });

    const grades: GradeRecord[] = gradesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: stripPrefix(d.id),
        studentId: stripPrefix(data.studentId),
        subjectId: stripPrefix(data.subjectId),
        className: data.className,
        semester: data.semester === 'Genap' ? 'Genap' : 'Ganjil',
        academicYear: data.academicYear,
        astsScore: Number(data.astsScore),
        updatedByTeacher: data.updatedByTeacher,
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
        paperSize: sData.paperSize === 'F4' ? 'F4' : 'A4',
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
  const docId = sanitizeId(`${user.uid}_${rawId}`);
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
