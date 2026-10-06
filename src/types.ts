export type Gender = 'L' | 'P';

export type BehaviorPredicate = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Pembinaan';

export type SemesterType = 'Ganjil' | 'Genap';

export type PaperSizeType = 'A4' | 'F4';

export type OrientationType = 'Portrait' | 'Landscape';

export type UserRole = 'admin' | 'teacher' | 'homeroom' | 'guru_mapel' | 'wali_kelas';

export function isTeacherRole(role: UserRole): boolean {
  return role === 'teacher' || role === 'guru_mapel';
}

export function isHomeroomRole(role: UserRole): boolean {
  return role === 'homeroom' || role === 'wali_kelas';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export function normalizeRole(role: string | undefined | null): 'admin' | 'teacher' | 'homeroom' {
  if (role === 'admin') return 'admin';
  if (role === 'homeroom' || role === 'wali_kelas') return 'homeroom';
  return 'teacher';
}

export interface UserAccount {
  uid: string;
  email: string;
  name: string;
  nip: string;
  role: UserRole;
  homeroomClass: string; // e.g. 'X 1' if homeroom/wali_kelas, or ''
  assignedSubjectIds: string[]; // Subject IDs assigned to this teacher
  assignedClasses: string[]; // Class names assigned to this teacher
  isActive: boolean;
  active?: boolean;
}

export interface TeacherAssignment {
  id: string;
  teacherUid: string;
  teacherId?: string;
  teacherName: string;
  subjectId: string;
  classId?: string;
  className: string;
  academicYearId?: string;
  academicYear: string;
  semester: SemesterType;
  active?: boolean;
}

export interface AcademicYear {
  id: string;
  year: string;
  semester: SemesterType;
  isActive: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  level?: string; // 'X' | 'XI' | 'XII'
  homeroomTeacherName: string;
  homeroomTeacherNip: string;
  homeroomTeacherRole: string;
  homeroomUid?: string;
  homeroomSignatureUrl?: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  gender: Gender;
  className: string;
  academicYear?: string;
  sakit: number;
  izin: number;
  alpa: number;
  behaviorPredicate: BehaviorPredicate;
  behaviorNote: string;
  homeroomNote: string;
  homeroomUid?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  className: string; // 'Semua Kelas' or specific class name e.g. 'X 1'
  teacherName: string;
  teacherUid?: string;
  isVisible: boolean;
  learningOutcome: string;
}

export interface GradeRecord {
  id: string; // `${studentId}_${subjectId}_${semester}_${academicYear.replace('/','-')}`
  studentId: string;
  subjectId: string;
  assignmentId?: string;
  classId?: string;
  className: string;
  semester: SemesterType;
  academicYearId?: string;
  academicYear: string;
  astsScore: number | null;
  score?: number | null;
  updatedByTeacher: string;
  teacherUid?: string;
  teacherId?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  className: string;
  academicYear: string;
  semester: SemesterType;
  sakit: number;
  izin: number;
  alpa: number;
  homeroomUid: string;
  updatedAt?: string;
}

export interface ReportNoteRecord {
  id: string;
  studentId: string;
  className: string;
  academicYear: string;
  semester: SemesterType;
  behaviorPredicate: BehaviorPredicate;
  behaviorNote: string;
  homeroomNote: string;
  homeroomUid: string;
  updatedAt?: string;
}

export interface SchoolSetting {
  id: string;
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  principalNip: string;
  reportPlaceDate: string;
  academicYear: string;
  semester: SemesterType;
  paperSize: PaperSizeType;
  orientation: OrientationType;
  fontFamily: string;
  fontSize: number;
  themeColor: string;
  marginMm: number;
  logoUrl: string;
  secondaryLogoUrl: string;
  principalSignatureUrl: string;
  showLogo: boolean;
  showCp: boolean;
  showGrades: boolean;
  showAttendance: boolean;
  showBehavior: boolean;
  showHomeroomNote: boolean;
  showSignatures: boolean;
  showRanking: boolean;
}

export interface AppDatabaseState {
  users: UserAccount[];
  teacherAssignments: TeacherAssignment[];
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  students: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance?: AttendanceRecord[];
  reportNotes?: ReportNoteRecord[];
  settings: SchoolSetting;
  lastUpdated: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface ImportReportSummary {
  moduleName: string;
  successCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

export type ActiveMenu =
  | 'dashboard'
  | 'user_management'
  | 'students'
  | 'classes'
  | 'homeroom_teachers'
  | 'subjects'
  | 'learning_outcomes'
  | 'input_grades'
  | 'attendance'
  | 'behavior'
  | 'homeroom_notes'
  | 'report_card'
  | 'leger'
  | 'excel_templates'
  | 'report_settings'
  | 'backup_restore';
