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
  Cloud,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  ChevronRight,
  RefreshCw,
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
} from './types';
import { INITIAL_DATABASE_STATE } from './data/initialData';
import {
  auth,
  signInWithGooglePopup,
  signOutGoogleUser,
  syncStateToFirestore,
  loadStateFromFirestore,
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

export default function App() {
  // 1. Central Cloud Database State
  const [dbState, setDbState] = useState<AppDatabaseState>(INITIAL_DATABASE_STATE);
  const [isLoadedFromCloud, setIsLoadedFromCloud] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // 2. Teacher & Class Quick Access Session State (Tidak menggunakan halaman login yang rumit)
  const [activeTeacherName, setActiveTeacherName] = useState<string>(
    INITIAL_DATABASE_STATE.classes[0]?.homeroomTeacherName || 'Ahmad Syafi’i, S.Pd.I'
  );
  const [selectedClass, setSelectedClass] = useState<string>('X 1');
  const [showTeacherSelectorModal, setShowTeacherSelectorModal] = useState<boolean>(true);

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        try {
          const cloudFirestoreState = await loadStateFromFirestore(INITIAL_DATABASE_STATE);
          if (cloudFirestoreState && cloudFirestoreState.classes.length > 0) {
            lastSavedRef.current = cloudFirestoreState.lastUpdated;
            setDbState(cloudFirestoreState);
          }
        } catch {
          // Ignore initial empty state errors
        }
      }
    });
    return () => unsub();
  }, []);

  // Load shared online state from /api/cloud-state on mount & poll every 8s so Guru B sees Guru A's changes
  const fetchServerCloudState = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch('/api/cloud-state');
      if (res.ok) {
        const data = (await res.json()) as AppDatabaseState;
        if (data && Array.isArray(data.classes) && data.lastUpdated !== lastSavedRef.current) {
          lastSavedRef.current = data.lastUpdated;
          setDbState(data);
        }
      } else if (res.status === 404 && isInitial) {
        // Seed initial state on server
        await fetch('/api/cloud-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(INITIAL_DATABASE_STATE),
        });
      }
    } catch {
      // Fallback gracefully if network is busy
    } finally {
      if (isInitial) setIsLoadedFromCloud(true);
    }
  }, []);

  useEffect(() => {
    fetchServerCloudState(true);
    const interval = setInterval(() => {
      fetchServerCloudState(false);
    }, 8000);
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

        // Async push to shared server cloud database
        setIsSyncing(true);
        fetch('/api/cloud-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stamped),
        })
          .then(() => {
            if (auth.currentUser && auth.currentUser.emailVerified) {
              return syncStateToFirestore(stamped);
            }
          })
          .catch(() => {})
          .finally(() => setIsSyncing(false));

        return stamped;
      });
    },
    []
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
        await syncStateToFirestore(dbState);
      }
      notify('Data berhasil disinkronkan ke Database Cloud.');
    } catch {
      notify('Sinkronisasi ke server selesai.');
    } finally {
      setIsSyncing(false);
    }
  };

  // All unique teacher names from classes + subjects for quick selection
  const teacherOptions = useMemo(() => {
    const set = new Set<string>();
    dbState.classes.forEach((c) => {
      if (c.homeroomTeacherName && c.homeroomTeacherName !== 'Belum Ditentukan') {
        set.add(c.homeroomTeacherName);
      }
    });
    dbState.subjects.forEach((s) => {
      if (s.teacherName && s.teacherName !== '-') {
        set.add(s.teacherName);
      }
    });
    set.add(dbState.settings.principalName);
    return Array.from(set);
  }, [dbState.classes, dbState.subjects, dbState.settings.principalName]);

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

  // CRUD Handlers
  const handleAddStudent = (st: Omit<Student, 'id'>) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: [...prev.students, { ...st, id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }],
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
    commitDatabaseUpdate((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      grades: prev.grades.filter((g) => g.studentId !== studentId),
    }));
  };

  const handleBulkImportStudents = (newStudents: Omit<Student, 'id'>[]) => {
    commitDatabaseUpdate((prev) => {
      const added: Student[] = newStudents.map((st, idx) => ({
        ...st,
        id: `std_${Date.now()}_${idx}`,
      }));
      return {
        ...prev,
        students: [...prev.students, ...added],
      };
    });
  };

  const handleAddClass = (cls: Omit<SchoolClass, 'id'>) => {
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
        } else {
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
            className,
            semester,
            academicYear,
            astsScore: score,
            updatedByTeacher: activeTeacherName,
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
            className: entry.className,
            semester: entry.semester,
            academicYear: entry.academicYear,
            astsScore: entry.score,
            updatedByTeacher: activeTeacherName,
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return { ...prev, grades: nextGrades };
    });
  };

  const handleUpdateSettings = (partial: Partial<SchoolSetting>) => {
    commitDatabaseUpdate((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partial,
      },
    }));
  };

  // Sidebar Navigation Groups
  const sidebarItems: {
    id: ActiveMenu;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard, group: 'Ringkasan' },
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
    { id: 'report_settings', label: 'Pengaturan Raport', icon: Settings, group: 'Sistem & Pengaturan' },
    { id: 'backup_restore', label: 'Backup & Restore Data', icon: Database, group: 'Sistem & Pengaturan' },
  ];

  const groups = ['Ringkasan', 'Data Master', 'Penilaian & Wali Kelas', 'Output & Laporan', 'Sistem & Pengaturan'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Quick Teacher & Class Access Modal (Tanpa halaman login rumit) */}
      {showTeacherSelectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              {dbState.settings.logoUrl && (
                <img
                  src={dbState.settings.logoUrl}
                  alt="Logo SMA Ma'arif 05 Padang Ratu"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-contain shrink-0"
                />
              )}
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Sistem Administrasi Raport Online
                </p>
                <h1 className="text-base font-bold text-slate-900">
                  {dbState.settings.schoolName}
                </h1>
                <p className="text-xs text-slate-500">
                  Tahun Pelajaran {dbState.settings.academicYear} · Semester {dbState.settings.semester}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Pilih atau Ketik Nama Guru / Wali Kelas
                </label>
                <select
                  value={activeTeacherName}
                  onChange={(e) => setActiveTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {teacherOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={activeTeacherName}
                  onChange={(e) => setActiveTeacherName(e.target.value)}
                  placeholder="Atau ketik nama lengkap Bapak/Ibu Guru..."
                  className="mt-2 w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Pilih Kelas Aktif
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {dbState.classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.name)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
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

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowTeacherSelectorModal(false);
                  notify(`Selamat datang, ${activeTeacherName} (Kelas ${selectedClass})`);
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Masuk ke Aplikasi Raport Bayangan
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Sinkronisasi Database Cloud Aktif</span>
                {firebaseUser ? (
                  <span className="text-emerald-700 font-medium">
                    Google: {firebaseUser.email}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signInWithGooglePopup();
                        notify('Berhasil terhubung dengan akun Google Firebase!');
                      } catch {
                        notify('Menggunakan sinkronisasi Cloud Server Sekolah.');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Hubungkan Google Cloud (Opsional)
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

        {/* Active Teacher & Class Summary in Sidebar */}
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 text-xs space-y-1">
          <div className="text-slate-400">Guru Aktif:</div>
          <div className="font-semibold text-white truncate">{activeTeacherName}</div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-emerald-400 font-mono">
              Kelas: {selectedClass}
            </span>
            <button
              type="button"
              onClick={() => setShowTeacherSelectorModal(true)}
              className="text-[11px] text-slate-300 underline hover:text-white cursor-pointer"
            >
              Ganti Guru/Kelas
            </button>
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
              onClick={() => setActiveMenu('students')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                activeMenu === 'students' ? 'text-emerald-800 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Data Siswa
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
              Raport Bayangan
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
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap truncate max-w-[220px] cursor-pointer"
            >
              {activeTeacherName} · {selectedClass}
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
                        Guru Pengguna:{' '}
                        <strong className="text-emerald-800">{activeTeacherName}</strong>
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
                    Cetak Raport Bayangan
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

              {/* 3. MENU CEPAT (QUICK ACCESS MENU) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Menu Cepat Administrasi & Penilaian
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih modul di bawah ini untuk mengelola data siswa, input nilai, absensi, raport bayangan, atau leger nilai.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { id: 'homeroom_teachers' as ActiveMenu, title: 'Guru & Wali Kelas', desc: 'Data wali & NIP', icon: UserCheck },
                    { id: 'classes' as ActiveMenu, title: 'Data Kelas', desc: 'Kelas X 1 – XII 2', icon: School },
                    { id: 'students' as ActiveMenu, title: 'Data Siswa', desc: 'Tambah & Import Excel', icon: Users },
                    { id: 'subjects' as ActiveMenu, title: 'Mata Pelajaran', desc: 'Atur mapel & guru', icon: BookOpen },
                    { id: 'learning_outcomes' as ActiveMenu, title: 'Capaian Pembelajaran', desc: 'Kelola narasi CP', icon: FileCheck2 },
                    { id: 'input_grades' as ActiveMenu, title: 'Input Nilai ASTS', desc: 'Input & Paste Excel', icon: ClipboardEdit },
                    { id: 'attendance' as ActiveMenu, title: 'Absensi Siswa', desc: 'Sakit, Izin, Alpa', icon: CalendarCheck },
                    { id: 'behavior' as ActiveMenu, title: 'Perilaku Siswa', desc: 'Sikap & catatan', icon: HeartHandshake },
                    { id: 'homeroom_notes' as ActiveMenu, title: 'Catatan Wali Kelas', desc: 'Evaluasi wali kelas', icon: MessageSquareQuote },
                    { id: 'report_card' as ActiveMenu, title: 'Raport Bayangan', desc: 'Preview & Cetak PDF', icon: FileText },
                    { id: 'leger' as ActiveMenu, title: 'Leger Nilai', desc: 'Rekap nilai per kelas', icon: Table2 },
                    { id: 'excel_templates' as ActiveMenu, title: 'Template Excel', desc: 'Unduh 8 template', icon: FileSpreadsheet },
                    { id: 'report_settings' as ActiveMenu, title: 'Pengaturan Raport', desc: 'Kop, kertas & saklar', icon: Settings },
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

              {/* 4. PROGRES INPUT NILAI PER KELAS TABLE */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Rekapitulasi Progres Input Nilai ASTS Per Kelas
                    </h2>
                    <p className="text-xs text-slate-500">
                      Klik tombol Buka Leger atau Input Nilai pada baris kelas untuk melihat detail nilai.
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
                        <th className="py-3 px-4 w-48 text-right">Aksi Cepat</th>
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
                              <div className="inline-flex items-center gap-2">
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
                commitDatabaseUpdate(() => newState);
              }}
              onResetDefault={() => {
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
            © {new Date().getFullYear()} {dbState.settings.schoolName} — Sistem Administrasi Raport Bayangan Online
          </span>
          <span>
            {isLoadedFromCloud ? 'Database Cloud Terhubung' : 'Memuat Database Cloud...'}
          </span>
        </footer>
      </div>
    </div>
  );
}
