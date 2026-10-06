import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  UserCheck,
  BookOpen,
  FileCheck2,
  ClipboardEdit,
  CalendarCheck,
  HeartHandshake,
  MessageSquareQuote,
  FileText,
  Table2,
  FileSpreadsheet,
  Settings,
  Database,
  Menu,
  X,
  CheckCircle2,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
  Laptop,
  Monitor,
  ArrowDown,
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  AppDatabaseState,
  ActiveMenu,
  Student,
  SchoolClass,
  Subject,
  SemesterType,
  SchoolSetting,
  UserAccount,
  TeacherAssignment,
  AcademicYear,
  isAdminRole,
  isHomeroomRole,
  isTeacherRole,
} from './types';
import {
  INITIAL_DATABASE_STATE,
  migrateDatabaseState,
} from './data/initialData';
import {
  auth,
  signInWithGooglePopup,
  signOutGoogleUser,
  syncStateToFirestore,
  loadStateFromFirestore,
  resolveOrBootstrapFirebaseUser,
} from './firebase';
import {
  StudentsView,
  ClassesAndHomeroomView,
  SubjectsAndCpView,
} from './components/DataManagementViews';
import {
  InputGradesView,
  StudentAttributesView,
} from './components/AcademicInputViews';
import { ReportCardView } from './components/ReportCardView';
import { LegerView } from './components/LegerView';
import {
  ExcelTemplatesView,
  ReportSettingsView,
  BackupRestoreView,
} from './components/SettingsAndBackupView';
import { UserAndAccessManagementView } from './components/UserAndAccessManagementView';

export default function App() {
  // 1. Central Cloud Database State
  const [dbState, setDbState] = useState<AppDatabaseState>(INITIAL_DATABASE_STATE);
  const [isLoadedFromCloud, setIsLoadedFromCloud] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // 2. Multi-Guru Role & Session State (Admin Sekolah / Guru Mapel / Wali Kelas)
  const [currentUser, setCurrentUser] = useState<UserAccount>(
    INITIAL_DATABASE_STATE.users[0]
  );
  const [selectedClass, setSelectedClass] = useState<string>('X 1');
  const [showTeacherSelectorModal, setShowTeacherSelectorModal] = useState<boolean>(true);
  const [loginRoleFilter, setLoginRoleFilter] = useState<'all' | 'admin' | 'guru'>('all');

  // 3. Navigation & UI State
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastSavedRef = useRef<string>(INITIAL_DATABASE_STATE.lastUpdated);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const activeTeacherName = currentUser.name;
  const isAdmin = currentUser.role === 'admin';

  // Keep currentUser synchronized if dbState.users updates
  useEffect(() => {
    const updatedAcc = dbState.users.find(
      (u) => u.uid === currentUser.uid || u.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (updatedAcc && JSON.stringify(updatedAcc) !== JSON.stringify(currentUser)) {
      setCurrentUser(updatedAcc);
    }
  }, [dbState.users, currentUser]);

  // Listen to Firebase Auth state & resolve teacher/admin account
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        try {
          const resolvedAccount = await resolveOrBootstrapFirebaseUser(dbState.users);
          if (resolvedAccount) {
            setCurrentUser(resolvedAccount);
            if (resolvedAccount.homeroomClass) {
              setSelectedClass(resolvedAccount.homeroomClass);
            } else if (resolvedAccount.assignedClasses.length > 0) {
              setSelectedClass(resolvedAccount.assignedClasses[0]);
            }
          }
          const cloudFirestoreState = await loadStateFromFirestore(INITIAL_DATABASE_STATE);
          if (cloudFirestoreState && cloudFirestoreState.classes.length > 0) {
            const migrated = migrateDatabaseState(cloudFirestoreState);
            lastSavedRef.current = migrated.lastUpdated;
            setDbState(migrated);
          }
        } catch {
          // Fallback to shared server cloud state if Firestore is initializing
        }
      }
    });
    return () => unsub();
  }, []);

  // Load shared online state from /api/cloud-state on mount & poll every 6s so all teachers see real-time updates
  const fetchServerCloudState = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch('/api/cloud-state');
      if (res.ok) {
        const rawData = (await res.json()) as Partial<AppDatabaseState>;
        if (rawData && Array.isArray(rawData.classes)) {
          const migrated = migrateDatabaseState(rawData);
          if (migrated.lastUpdated !== lastSavedRef.current) {
            lastSavedRef.current = migrated.lastUpdated;
            setDbState(migrated);
          }
        }
      } else if (res.status === 404 && isInitial) {
        await fetch('/api/cloud-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(INITIAL_DATABASE_STATE),
        });
      }
    } catch {
      // Ignore transient network errors
    } finally {
      if (isInitial) setIsLoadedFromCloud(true);
    }
  }, []);

  useEffect(() => {
    fetchServerCloudState(true);
    const interval = setInterval(() => {
      fetchServerCloudState(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchServerCloudState]);

  // Persist state to Cloud Server + Firebase Firestore
  const commitDatabaseUpdate = useCallback(
    (updater: (prev: AppDatabaseState) => AppDatabaseState) => {
      setDbState((prev) => {
        const next = updater(prev);
        const stamped: AppDatabaseState = {
          ...next,
          lastUpdated: new Date().toISOString(),
        };
        lastSavedRef.current = stamped.lastUpdated;

        setIsSyncing(true);
        fetch('/api/cloud-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stamped),
        })
          .then(() => {
            if (auth.currentUser && auth.currentUser.emailVerified) {
              return syncStateToFirestore(stamped, currentUser);
            }
          })
          .catch(() => {})
          .finally(() => setIsSyncing(false));

        return stamped;
      });
    },
    [currentUser]
  );

  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/cloud-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbState),
      });
      if (auth.currentUser && auth.currentUser.emailVerified) {
        await syncStateToFirestore(dbState, currentUser);
      }
      notify('Data berhasil disinkronkan ke Database Cloud.');
    } catch {
      notify('Sinkronisasi ke server selesai.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectUserAccount = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.homeroomClass) {
      setSelectedClass(user.homeroomClass);
    } else if (user.assignedClasses.length > 0) {
      setSelectedClass(user.assignedClasses[0]);
    }
    notify(
      `Login Aktif: ${user.name} (${
        isAdminRole(user.role)
          ? 'Admin Sekolah'
          : isHomeroomRole(user.role)
          ? `Wali Kelas ${user.homeroomClass}`
          : 'Guru Mata Pelajaran'
      })`
    );
  };

  // Dashboard Metrics Calculation
  const dashboardStats = useMemo(() => {
    const totalClasses = dbState.classes.length;
    const totalStudents = dbState.students.length;
    const visibleSubjects = dbState.subjects.filter((s) => s.isVisible);
    const totalSubjects = dbState.subjects.length;

    let expectedSlots = 0;
    let filledSlots = 0;

    dbState.students.forEach((st) => {
      const applicableSubjects = visibleSubjects.filter(
        (sub) => sub.className === 'Semua Kelas' || sub.className === st.className
      );
      applicableSubjects.forEach((sub) => {
        expectedSlots += 1;
        const g = dbState.grades.find(
          (rec) =>
            rec.studentId === st.id &&
            rec.subjectId === sub.id &&
            rec.semester === dbState.settings.semester &&
            rec.academicYear === dbState.settings.academicYear
        );
        if (g && g.astsScore !== null && g.astsScore !== undefined) {
          filledSlots += 1;
        }
      });
    });

    const emptySlots = Math.max(0, expectedSlots - filledSlots);
    return {
      totalClasses,
      totalStudents,
      totalSubjects,
      filledSlots,
      emptySlots,
      expectedSlots,
    };
  }, [dbState]);

  // CRUD Handlers for Users, Assignments, and Academic Years
  const handleAddUser = (newUser: UserAccount) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)),
    }));
    if (currentUser.uid === updatedUser.uid) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (uid: string) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.uid !== uid),
    }));
  };

  const handleAddAssignment = (asg: Omit<TeacherAssignment, 'id'>) => {
    const cleanCls = asg.className.replace(/\s+/g, '_').toLowerCase();
    const id = `asg_${asg.subjectId}_${cleanCls}_${Date.now()}`;
    commitDatabaseUpdate((prev) => ({
      ...prev,
      teacherAssignments: [...prev.teacherAssignments, { ...asg, id }],
    }));
  };

  const handleDeleteAssignment = (id: string) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      teacherAssignments: prev.teacherAssignments.filter((a) => a.id !== id),
    }));
  };

  const handleAddAcademicYear = (ay: Omit<AcademicYear, 'id'>) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      academicYears: [
        ...prev.academicYears,
        { ...ay, id: `ay_${Date.now()}` },
      ],
    }));
  };

  const handleActivateAcademicYear = (id: string) => {
    commitDatabaseUpdate((prev) => {
      const target = prev.academicYears.find((a) => a.id === id);
      if (!target) return prev;
      return {
        ...prev,
        academicYears: prev.academicYears.map((a) => ({
          ...a,
          isActive: a.id === id,
        })),
        settings: {
          ...prev.settings,
          academicYear: target.year,
          semester: target.semester,
        },
      };
    });
  };

  // CRUD Handlers for Students, Classes, Subjects, Grades, Settings
  const handleAddStudent = (st: Omit<Student, 'id'>) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: [
        ...prev.students,
        {
          ...st,
          id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        },
      ],
    }));
  };

  const handleUpdateStudent = (updated: Student) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleBulkUpdateStudents = (updatedList: Student[]) => {
    const map = new Map(updatedList.map((s) => [s.id, s]));
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: prev.students.map((s) => map.get(s.id) || s),
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat menghapus data utama siswa.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      grades: prev.grades.filter((g) => g.studentId !== studentId),
    }));
  };

  const handleBulkImportStudents = (newStudents: Omit<Student, 'id'>[]) => {
    commitDatabaseUpdate((prev) => {
      const existingNisns = new Set(prev.students.map((s) => s.nisn.trim()));
      const added: Student[] = [];
      newStudents.forEach((st, idx) => {
        if (!existingNisns.has(st.nisn.trim())) {
          existingNisns.add(st.nisn.trim());
          added.push({
            ...st,
            id: `std_${Date.now()}_${idx}`,
          });
        }
      });
      return {
        ...prev,
        students: [...prev.students, ...added],
      };
    });
  };

  const handleAddClass = (cls: Omit<SchoolClass, 'id'>) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat menambah kelas baru.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      classes: [...prev.classes, { ...cls, id: `cls_${Date.now()}` }],
    }));
  };

  const handleUpdateClass = (updated: SchoolClass) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteClass = (classId: string) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat menghapus kelas.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== classId),
    }));
  };

  const handleBulkImportClasses = (clsList: Omit<SchoolClass, 'id'>[]) => {
    commitDatabaseUpdate((prev) => {
      const existingNames = new Set(prev.classes.map((c) => c.name));
      const newOnes: SchoolClass[] = [];
      clsList.forEach((c, idx) => {
        if (!existingNames.has(c.name)) {
          newOnes.push({ ...c, id: `cls_${Date.now()}_${idx}` });
        }
      });
      return {
        ...prev,
        classes: [...prev.classes, ...newOnes],
      };
    });
  };

  const handleAddSubject = (sub: Omit<Subject, 'id'>) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat menambah mata pelajaran utama.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { ...sub, id: `sub_${Date.now()}` }],
    }));
  };

  const handleUpdateSubject = (updated: Subject) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat menghapus mata pelajaran.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
      grades: prev.grades.filter((g) => g.subjectId !== subjectId),
    }));
  };

  const handleBulkImportSubjects = (subs: Omit<Subject, 'id'>[]) => {
    commitDatabaseUpdate((prev) => {
      const updatedExisting = [...prev.subjects];
      subs.forEach((incoming, idx) => {
        const matchIdx = updatedExisting.findIndex(
          (s) => s.code.toUpperCase() === incoming.code.toUpperCase()
        );
        if (matchIdx >= 0) {
          updatedExisting[matchIdx] = {
            ...updatedExisting[matchIdx],
            ...incoming,
            learningOutcome:
              incoming.learningOutcome || updatedExisting[matchIdx].learningOutcome,
          };
        } else if (isAdmin) {
          updatedExisting.push({
            ...incoming,
            id: `sub_${Date.now()}_${idx}`,
          });
        }
      });
      return {
        ...prev,
        subjects: updatedExisting,
      };
    });
  };

  const handleUpsertGrade = (
    studentId: string,
    subjectId: string,
    className: string,
    semester: SemesterType,
    academicYear: string,
    score: number | null
  ) => {
    commitDatabaseUpdate((prev) => {
      const id = `${studentId}_${subjectId}_${semester}_${academicYear.replace(/\//g, '-')}`;
      const cleanCls = className.replace(/\s+/g, '_').toLowerCase();
      const filtered = prev.grades.filter(
        (g) =>
          !(
            g.studentId === studentId &&
            g.subjectId === subjectId &&
            g.semester === semester &&
            g.academicYear === academicYear
          )
      );
      if (score === null) {
        return { ...prev, grades: filtered };
      }
      return {
        ...prev,
        grades: [
          ...filtered,
          {
            id,
            studentId,
            subjectId,
            assignmentId: `asg_${subjectId}_${cleanCls}`,
            className,
            semester,
            academicYear,
            astsScore: score,
            updatedByTeacher: activeTeacherName,
            teacherUid: currentUser.uid,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const handleBulkUpsertGrades = (
    entries: {
      studentId: string;
      subjectId: string;
      className: string;
      semester: SemesterType;
      academicYear: string;
      score: number | null;
    }[]
  ) => {
    commitDatabaseUpdate((prev) => {
      let nextGrades = [...prev.grades];
      entries.forEach((entry) => {
        const id = `${entry.studentId}_${entry.subjectId}_${entry.semester}_${entry.academicYear.replace(/\//g, '-')}`;
        const cleanCls = entry.className.replace(/\s+/g, '_').toLowerCase();
        nextGrades = nextGrades.filter(
          (g) =>
            !(
              g.studentId === entry.studentId &&
              g.subjectId === entry.subjectId &&
              g.semester === entry.semester &&
              g.academicYear === entry.academicYear
            )
        );
        if (entry.score !== null) {
          nextGrades.push({
            id,
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            assignmentId: `asg_${entry.subjectId}_${cleanCls}`,
            className: entry.className,
            semester: entry.semester,
            academicYear: entry.academicYear,
            astsScore: entry.score,
            updatedByTeacher: activeTeacherName,
            teacherUid: currentUser.uid,
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return { ...prev, grades: nextGrades };
    });
  };

  const handleUpdateSettings = (partial: Partial<SchoolSetting>) => {
    if (!isAdmin) {
      notify('Akses Ditolak: Hanya Admin Sekolah yang dapat mengubah pengaturan identitas sekolah.');
      return;
    }
    commitDatabaseUpdate((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partial,
      },
    }));
  };

  // Sidebar Navigation Groups (Role-Aware)
  const sidebarItems: {
    id: ActiveMenu;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard, group: 'Ringkasan' },
    { id: 'user_management', label: 'Akun Guru & Hak Akses', icon: ShieldCheck, group: 'Ringkasan' },
    { id: 'classes', label: 'Data Kelas', icon: School, group: 'Data Master' },
    { id: 'homeroom_teachers', label: 'Data Wali Kelas', icon: UserCheck, group: 'Data Master' },
    { id: 'students', label: 'Data Siswa', icon: Users, group: 'Data Master' },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen, group: 'Data Master' },
    { id: 'learning_outcomes', label: 'Capaian Pembelajaran (CP)', icon: FileCheck2, group: 'Data Master' },
    { id: 'input_grades', label: 'Input Nilai ASTS', icon: ClipboardEdit, group: 'Penilaian & Wali Kelas' },
    { id: 'attendance', label: 'Absensi Siswa', icon: CalendarCheck, group: 'Penilaian & Wali Kelas' },
    { id: 'behavior', label: 'Perilaku Siswa', icon: HeartHandshake, group: 'Penilaian & Wali Kelas' },
    { id: 'homeroom_notes', label: 'Catatan Wali Kelas', icon: MessageSquareQuote, group: 'Penilaian & Wali Kelas' },
    { id: 'report_card', label: 'Raport Bayangan & Cetak', icon: FileText, group: 'Output & Laporan' },
    { id: 'leger', label: 'Leger Nilai Per Kelas', icon: Table2, group: 'Output & Laporan' },
    { id: 'excel_templates', label: 'Template Excel', icon: FileSpreadsheet, group: 'Sistem & Pengaturan' },
    { id: 'report_settings', label: 'Pengaturan Raport (F4)', icon: Settings, group: 'Sistem & Pengaturan' },
    { id: 'backup_restore', label: 'Backup & Restore Data', icon: Database, group: 'Sistem & Pengaturan' },
  ];

  const groups = ['Ringkasan', 'Data Master', 'Penilaian & Wali Kelas', 'Output & Laporan', 'Sistem & Pengaturan'];

  const filteredModalUsers = useMemo(() => {
    if (loginRoleFilter === 'admin') {
      return dbState.users.filter((u) => u.role === 'admin');
    }
    if (loginRoleFilter === 'guru') {
      return dbState.users.filter((u) => u.role !== 'admin');
    }
    return dbState.users;
  }, [dbState.users, loginRoleFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* LOGIN GURU & HIERARKI AKSES MODAL (ADMIN vs GURU -> FIREBASE DATABASE -> HP/LAPTOP/PC) */}
      {showTeacherSelectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* School Header */}
            <div className="flex items-center justify-between gap-3.5 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                {dbState.settings.logoUrl && (
                  <img
                    src={dbState.settings.logoUrl}
                    alt="Logo SMA Ma'arif 05 Padang Ratu"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-contain shrink-0"
                  />
                )}
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    RAPORT BAYANGAN ONLINE MULTI-GURU
                  </p>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900">
                    {dbState.settings.schoolName}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Tahun Pelajaran {dbState.settings.academicYear} · Semester {dbState.settings.semester} · Kertas Cetak {dbState.settings.paperSize}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherSelectorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Runtutan Akses Visual Banner (Sesuai Skema User) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider">
                Alur Akses Terpusat — {dbState.settings.schoolName}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRoleFilter('admin');
                    const adminAcc = dbState.users.find((u) => u.role === 'admin');
                    if (adminAcc) handleSelectUserAccount(adminAcc);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    currentUser.role === 'admin'
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className="font-bold">1. LOGIN ADMIN</div>
                  <div className={`text-[11px] mt-0.5 ${currentUser.role === 'admin' ? 'text-emerald-200' : 'text-slate-500'}`}>
                    Akses Semua Data, Akun Guru, Siswa, Mapel & Pengaturan
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginRoleFilter('guru');
                    const guruAcc = dbState.users.find((u) => isTeacherRole(u.role));
                    if (guruAcc) handleSelectUserAccount(guruAcc);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isTeacherRole(currentUser.role)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className="font-bold">2. GURU MAPEL</div>
                  <div className={`text-[11px] mt-0.5 ${isTeacherRole(currentUser.role) ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Input & Impor Nilai ASTS Sesuai Kelas/Mapel Diampu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginRoleFilter('guru');
                    const waliAcc = dbState.users.find((u) => isHomeroomRole(u.role));
                    if (waliAcc) handleSelectUserAccount(waliAcc);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isHomeroomRole(currentUser.role)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className="font-bold">3. WALI KELAS</div>
                  <div className={`text-[11px] mt-0.5 ${isHomeroomRole(currentUser.role) ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Kelola Absensi, Sikap, Catatan, Leger & Cetak Raport F4
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                  <Database className="w-3.5 h-3.5" />
                  Firebase Database Terpusat
                </span>
                <span>→</span>
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> HP
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" /> Laptop
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" /> PC
                </span>
              </div>
            </div>

            {/* Account & Class Selection */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Pilih Akun Pengguna (Admin / Guru Mapel / Wali Kelas):
                  </label>
                  <button
                    type="button"
                    onClick={() => setLoginRoleFilter('all')}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Tampilkan Semua ({dbState.users.length} Akun)
                  </button>
                </div>
                <select
                  value={currentUser.uid}
                  onChange={(e) => {
                    const found = dbState.users.find((u) => u.uid === e.target.value);
                    if (found) handleSelectUserAccount(found);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {filteredModalUsers.map((u) => {
                    const subCodes = u.assignedSubjectIds
                      .map((id) => dbState.subjects.find((s) => s.id === id)?.code || id)
                      .join(', ');
                    const roleInfo =
                      isAdminRole(u.role)
                        ? 'ADMIN SEKOLAH — Semua Data'
                        : isHomeroomRole(u.role)
                        ? `WALI KELAS ${u.homeroomClass} — Mapel: ${subCodes || '-'}`
                        : `GURU MAPEL — Mapel: ${subCodes || '-'}`;
                    return (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({roleInfo})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Kelas Aktif:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {dbState.classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.name)}
                      className={`py-2 px-2.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        selectedClass === cls.name
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Login CTA & Google Auth */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowTeacherSelectorModal(false);
                  notify(`Selamat datang, ${currentUser.name} (Kelas ${selectedClass})`);
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Masuk sebagai {currentUser.name} ({isAdminRole(currentUser.role) ? 'Admin Sekolah' : isHomeroomRole(currentUser.role) ? `Wali Kelas ${currentUser.homeroomClass}` : 'Guru Mapel'})
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Status Database: <strong className="text-emerald-700">Online Terpusat (Real-Time)</strong>
                </span>
                {firebaseUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-medium">
                      Google Auth: {firebaseUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOutGoogleUser();
                        notify('Telah keluar dari sesi Google Auth.');
                      }}
                      className="inline-flex items-center gap-1 text-red-600 font-semibold hover:underline cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout Google
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signInWithGooglePopup();
                        notify('Berhasil login dengan Google Firebase Authentication!');
                      } catch {
                        notify('Sesi akun sekolah lokal/server tetap aktif.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login dengan Akun Google (Firebase Auth)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {dbState.settings.logoUrl && (
              <img
                src={dbState.settings.logoUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg bg-white p-0.5 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                SMA MA’ARIF 05
              </div>
              <div className="text-[11px] text-emerald-400 truncate">
                PADANG RATU
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active User Role & Class Summary in Sidebar */}
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              {isAdminRole(currentUser.role)
                ? 'Admin Sekolah'
                : isHomeroomRole(currentUser.role)
                ? `Wali Kelas ${currentUser.homeroomClass}`
                : 'Guru Mapel'}
            </span>
            <button
              type="button"
              onClick={() => setShowTeacherSelectorModal(true)}
              className="text-[11px] text-emerald-400 underline hover:text-emerald-300 cursor-pointer"
            >
              Ganti Akun
            </button>
          </div>
          <div className="font-semibold text-white truncate">{currentUser.name}</div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-300 font-mono text-[11px]">
              Kelas Aktif: <strong className="text-white">{selectedClass}</strong>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Kertas {dbState.settings.paperSize}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => {
            const items = sidebarItems.filter((i) => i.group === grp);
            return (
              <div key={grp}>
                <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
                  {grp}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveMenu(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>TP {dbState.settings.academicYear}</span>
          <span>·</span>
          <span>Smtr {dbState.settings.semester}</span>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden print:hidden"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR CONTRACT (3 Clean Zones: Brand/Context — Quick Nav — Primary Actions) */}
        <header className="print:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('dashboard')}
              className="text-sm sm:text-base font-bold tracking-tight text-slate-900 text-left truncate cursor-pointer"
            >
              {dbState.settings.schoolName}
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveMenu('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'dashboard' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('user_management')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'user_management' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Akun & Hak Akses
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('input_grades')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'input_grades' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Input Nilai
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('report_card')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'report_card' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Raport Bayangan (F4)
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('leger')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'leger' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Leger Nilai
            </button>
          </nav>

          {/* Zone 3: 1-2 Primary Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowTeacherSelectorModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap truncate max-w-[230px] cursor-pointer"
            >
              {currentUser.name} · {selectedClass}
            </button>
            <button
              type="button"
              onClick={handleManualCloudSync}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isSyncing ? 'Menyimpan...' : 'Cloud Sync'}
            </button>
          </div>
        </header>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. DASHBOARD HEADER BANNER */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  {dbState.settings.logoUrl && (
                    <img
                      src={dbState.settings.logoUrl}
                      alt="Logo SMA Ma'arif 05 Padang Ratu"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Sistem Administrasi Akademik & Raport Bayangan Online</span>
                      <span>·</span>
                      <span>NPSN {dbState.settings.npsn}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                      {dbState.settings.schoolName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1.5">
                      <span>
                        Tahun Pelajaran:{' '}
                        <strong className="font-mono text-slate-900">
                          {dbState.settings.academicYear}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Semester:{' '}
                        <strong className="text-slate-900">
                          {dbState.settings.semester}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Pengguna Aktif:{' '}
                        <strong className="text-emerald-800">
                          {currentUser.name} (
                          {isAdminRole(currentUser.role)
                            ? 'Admin Sekolah'
                            : isHomeroomRole(currentUser.role)
                            ? `Wali Kelas ${currentUser.homeroomClass}`
                            : 'Guru Mapel'}
                          )
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Kelas Aktif:{' '}
                        <strong className="font-mono text-slate-900">{selectedClass}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveMenu('input_grades')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <ClipboardEdit className="w-4 h-4" />
                    Input Nilai ASTS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenu('report_card')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Cetak Raport ({dbState.settings.paperSize})
                  </button>
                </div>
              </div>

              {/* 2. FIVE INFORMATION CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500">Jumlah Kelas</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                    {dashboardStats.totalClasses}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Rombel Kelas X, XI, XII
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500">Jumlah Siswa</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                    {dashboardStats.totalStudents}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Peserta didik terdaftar
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500">
                    Jumlah Mata Pelajaran
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                    {dashboardStats.totalSubjects}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Mapel Kurikulum Merdeka
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500">
                    Nilai Sudah Diinput
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
                    {dashboardStats.filledSlots}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">
                    Tersimpan di database cloud
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500">
                    Nilai Belum Diinput
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
                    {dashboardStats.emptySlots}
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Menunggu input guru mapel
                  </div>
                </div>
              </div>

              {/* 3. RUNTUTAN AKSES SISTEM INTERAKTIF (SESUAI DIAGRAM USER) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Runtutan Akses Sistem Multi-Guru & Firebase Database
                    </h2>
                    <p className="text-xs text-slate-500">
                      Klik pada kotak peran di bawah untuk beralih cepat antara tampilan Admin Sekolah, Guru Mapel, atau Wali Kelas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMenu('user_management')}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer w-fit"
                  >
                    Kelola Semua Akun ({dbState.users.length} Guru)
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                  {/* Step 1: Login Guru -> Role */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      1. Login Guru & Pembagian Hak Akses
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const adminAcc = dbState.users.find((u) => u.role === 'admin');
                          if (adminAcc) handleSelectUserAccount(adminAcc);
                        }}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          currentUser.role === 'admin'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600'
                        }`}
                      >
                        <div className="text-xs font-bold">ADMIN SEKOLAH</div>
                        <div className={`text-[11px] mt-1 ${currentUser.role === 'admin' ? 'text-emerald-300' : 'text-slate-500'}`}>
                          Kelola Semua Data, Kelas, Siswa, Mapel & Backup
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTeacherSelectorModal(true)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          currentUser.role !== 'admin'
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600'
                        }`}
                      >
                        <div className="text-xs font-bold">GURU / WALI KELAS</div>
                        <div className={`text-[11px] mt-1 ${currentUser.role !== 'admin' ? 'text-emerald-100' : 'text-slate-500'}`}>
                          Akses Kelas & Mapel Sesuai Penugasan
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Central Firebase Database */}
                  <div className="bg-emerald-950 text-white rounded-xl p-4 flex items-center gap-3.5 border border-emerald-800">
                    <Database className="w-7 h-7 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-300 uppercase">
                        2. Database Cloud Terpusat
                      </div>
                      <div className="text-sm font-bold mt-0.5">
                        FIREBASE CLOUD DATABASE
                      </div>
                      <div className="text-[11px] text-emerald-200 mt-0.5">
                        Tersinkronisasi otomatis antar-guru secara online & aman
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Multi-Device */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      3. Akses Multi-Perangkat Kapan Saja
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-center gap-1">
                        <Smartphone className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-semibold text-slate-800">HP</span>
                        <span className="text-[10px] text-slate-500">Android/iOS</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-center gap-1">
                        <Laptop className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-semibold text-slate-800">Laptop</span>
                        <span className="text-[10px] text-slate-500">Semua OS</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-center gap-1">
                        <Monitor className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-semibold text-slate-800">PC</span>
                        <span className="text-[10px] text-slate-500">Komputer</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. MENU CEPAT (QUICK ACCESS MENU) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Menu Cepat Administrasi & Penilaian
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih modul di bawah ini untuk mengelola akun guru, data siswa, input nilai, absensi, raport bayangan F4, atau leger nilai.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { id: 'user_management' as ActiveMenu, title: 'Akun & Hak Akses', desc: 'Admin, Guru & Wali Kelas', icon: ShieldCheck },
                    { id: 'homeroom_teachers' as ActiveMenu, title: 'Data Wali Kelas', desc: 'Data wali & NIP', icon: UserCheck },
                    { id: 'classes' as ActiveMenu, title: 'Data Kelas', desc: 'Kelas X 1 – XII 2', icon: School },
                    { id: 'students' as ActiveMenu, title: 'Data Siswa', desc: 'Tambah & Import Excel', icon: Users },
                    { id: 'subjects' as ActiveMenu, title: 'Mata Pelajaran', desc: 'Atur mapel & guru', icon: BookOpen },
                    { id: 'learning_outcomes' as ActiveMenu, title: 'Capaian Pembelajaran', desc: 'Kelola narasi CP', icon: FileCheck2 },
                    { id: 'input_grades' as ActiveMenu, title: 'Input Nilai ASTS', desc: 'Input & Paste Excel', icon: ClipboardEdit },
                    { id: 'attendance' as ActiveMenu, title: 'Absensi Siswa', desc: 'Sakit, Izin, Alpa', icon: CalendarCheck },
                    { id: 'behavior' as ActiveMenu, title: 'Perilaku Siswa', desc: 'Sikap & catatan', icon: HeartHandshake },
                    { id: 'homeroom_notes' as ActiveMenu, title: 'Catatan Wali Kelas', desc: 'Evaluasi wali kelas', icon: MessageSquareQuote },
                    { id: 'report_card' as ActiveMenu, title: 'Raport Bayangan (F4)', desc: 'Preview & Cetak F4', icon: FileText },
                    { id: 'leger' as ActiveMenu, title: 'Leger Nilai', desc: 'Rekap nilai per kelas', icon: Table2 },
                    { id: 'excel_templates' as ActiveMenu, title: 'Template Excel', desc: 'Unduh 8 template', icon: FileSpreadsheet },
                    { id: 'report_settings' as ActiveMenu, title: 'Pengaturan Raport', desc: 'Kop, kertas F4 & saklar', icon: Settings },
                    { id: 'backup_restore' as ActiveMenu, title: 'Backup & Restore', desc: 'Amankan database', icon: Database },
                  ].map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveMenu(q.id)}
                        className="group text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-600 transition-colors flex flex-col justify-between gap-2.5 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-200 group-hover:bg-emerald-50 flex items-center justify-center text-emerald-700">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                            {q.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {q.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. PROGRES INPUT NILAI PER KELAS TABLE */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Rekapitulasi Progres Input Nilai ASTS Per Kelas
                    </h2>
                    <p className="text-xs text-slate-500">
                      Klik tombol Input Nilai, Leger, atau Cetak Raport pada baris kelas untuk melihat detail nilai.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4 w-24">Kelas</th>
                        <th className="py-3 px-4">Wali Kelas</th>
                        <th className="py-3 px-4 w-28 text-center">Jml Siswa</th>
                        <th className="py-3 px-4 w-36 text-center">Nilai Sudah Input</th>
                        <th className="py-3 px-4 w-36 text-center">Nilai Belum Input</th>
                        <th className="py-3 px-4 w-56 text-right">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {dbState.classes.map((cls) => {
                        const clsStudents = dbState.students.filter(
                          (s) => s.className === cls.name
                        );
                        const applicableSubjects = dbState.subjects.filter(
                          (sub) =>
                            sub.isVisible &&
                            (sub.className === 'Semua Kelas' || sub.className === cls.name)
                        );
                        const expected = clsStudents.length * applicableSubjects.length;
                        let filled = 0;
                        clsStudents.forEach((st) => {
                          applicableSubjects.forEach((sub) => {
                            const g = dbState.grades.find(
                              (rec) =>
                                rec.studentId === st.id &&
                                rec.subjectId === sub.id &&
                                rec.semester === dbState.settings.semester &&
                                rec.academicYear === dbState.settings.academicYear
                            );
                            if (g && g.astsScore !== null && g.astsScore !== undefined) {
                              filled += 1;
                            }
                          });
                        });
                        const empty = Math.max(0, expected - filled);

                        return (
                          <tr
                            key={cls.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900">
                              Kelas {cls.name}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              <div>{cls.homeroomTeacherName}</div>
                              <div className="text-xs font-mono text-slate-500">
                                NIP: {cls.homeroomTeacherNip || '-'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-semibold">
                              {clsStudents.length} Siswa
                            </td>
                            <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-bold text-emerald-700">
                              {filled} Nilai
                            </td>
                            <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-bold text-amber-700">
                              {empty} Kosong
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls.name);
                                    setActiveMenu('input_grades');
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
                                >
                                  Input Nilai
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls.name);
                                    setActiveMenu('leger');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                                >
                                  Leger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls.name);
                                    setActiveMenu('report_card');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                                >
                                  Raport
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'user_management' && (
            <UserAndAccessManagementView
              dbState={dbState}
              currentUser={currentUser}
              onSelectUserAccount={handleSelectUserAccount}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddAssignment={handleAddAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onAddAcademicYear={handleAddAcademicYear}
              onActivateAcademicYear={handleActivateAcademicYear}
              notify={notify}
            />
          )}

          {activeMenu === 'students' && (
            <StudentsView
              dbState={dbState}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onBulkImportStudents={handleBulkImportStudents}
              notify={notify}
            />
          )}

          {activeMenu === 'classes' && (
            <ClassesAndHomeroomView
              mode="classes"
              dbState={dbState}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onBulkImportClasses={handleBulkImportClasses}
              notify={notify}
            />
          )}

          {activeMenu === 'homeroom_teachers' && (
            <ClassesAndHomeroomView
              mode="homeroom"
              dbState={dbState}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onBulkImportClasses={handleBulkImportClasses}
              notify={notify}
            />
          )}

          {activeMenu === 'subjects' && (
            <SubjectsAndCpView
              mode="subjects"
              dbState={dbState}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              onBulkImportSubjects={handleBulkImportSubjects}
              notify={notify}
            />
          )}

          {activeMenu === 'learning_outcomes' && (
            <SubjectsAndCpView
              mode="cp"
              dbState={dbState}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              onBulkImportSubjects={handleBulkImportSubjects}
              notify={notify}
            />
          )}

          {activeMenu === 'input_grades' && (
            <InputGradesView
              dbState={dbState}
              currentUser={currentUser}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              activeTeacherName={activeTeacherName}
              onUpsertGrade={handleUpsertGrade}
              onBulkUpsertGrades={handleBulkUpsertGrades}
              notify={notify}
            />
          )}

          {activeMenu === 'attendance' && (
            <StudentAttributesView
              mode="attendance"
              dbState={dbState}
              currentUser={currentUser}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onUpdateStudent={handleUpdateStudent}
              onBulkUpdateStudents={handleBulkUpdateStudents}
              notify={notify}
            />
          )}

          {activeMenu === 'behavior' && (
            <StudentAttributesView
              mode="behavior"
              dbState={dbState}
              currentUser={currentUser}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onUpdateStudent={handleUpdateStudent}
              onBulkUpdateStudents={handleBulkUpdateStudents}
              notify={notify}
            />
          )}

          {activeMenu === 'homeroom_notes' && (
            <StudentAttributesView
              mode="homeroom_notes"
              dbState={dbState}
              currentUser={currentUser}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onUpdateStudent={handleUpdateStudent}
              onBulkUpdateStudents={handleBulkUpdateStudents}
              notify={notify}
            />
          )}

          {activeMenu === 'report_card' && (
            <ReportCardView
              dbState={dbState}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onUpdateSettings={handleUpdateSettings}
              onUpdateClass={handleUpdateClass}
              onNavigate={setActiveMenu}
              notify={notify}
            />
          )}

          {activeMenu === 'leger' && (
            <LegerView
              dbState={dbState}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              activeTeacherName={activeTeacherName}
              onUpsertGrade={handleUpsertGrade}
              onAddClass={(name, homeroomName, nip) => {
                handleAddClass({
                  name,
                  homeroomTeacherName: homeroomName,
                  homeroomTeacherNip: nip,
                  homeroomTeacherRole: `Wali Kelas ${name}`,
                  homeroomSignatureUrl: '',
                });
                notify(`Kelas ${name} berhasil ditambahkan.`);
              }}
              onDeleteClass={(classId) => {
                handleDeleteClass(classId);
                notify('Kelas berhasil dihapus.');
              }}
              notify={notify}
            />
          )}

          {activeMenu === 'excel_templates' && (
            <ExcelTemplatesView
              dbState={dbState}
              selectedClass={selectedClass}
              notify={notify}
            />
          )}

          {activeMenu === 'report_settings' && (
            <ReportSettingsView
              settings={dbState.settings}
              onUpdateSettings={handleUpdateSettings}
              notify={notify}
            />
          )}

          {activeMenu === 'backup_restore' && (
            <BackupRestoreView
              dbState={dbState}
              onRestoreState={(newState) => {
                if (!isAdmin) {
                  notify('Akses Ditolak: Hanya Admin Sekolah yang dapat memulihkan database.');
                  return;
                }
                commitDatabaseUpdate(() => migrateDatabaseState(newState));
              }}
              onResetDefault={() => {
                if (!isAdmin) {
                  notify('Akses Ditolak: Hanya Admin Sekolah yang dapat mereset database.');
                  return;
                }
                commitDatabaseUpdate(() => INITIAL_DATABASE_STATE);
                notify('Database berhasil dikembalikan ke data standar sekolah.');
              }}
              onManualCloudSync={handleManualCloudSync}
              isSyncing={isSyncing}
              notify={notify}
            />
          )}
        </main>

        {/* Quiet Copyright Footer */}
        <footer className="print:hidden border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {dbState.settings.schoolName} — Sistem Administrasi Raport Bayangan Online Multi-Guru
          </span>
          <span>
            {isLoadedFromCloud ? 'Database Cloud Terpusat Terhubung' : 'Memuat Database Cloud...'}
          </span>
        </footer>
      </div>
    </div>
  );
}
