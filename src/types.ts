export type Gender = 'L' | 'P';

export type BehaviorPredicate = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Pembinaan';

export type SemesterType = 'Ganjil' | 'Genap';

export type PaperSizeType = 'A4' | 'F4';

export type OrientationType = 'Portrait' | 'Landscape';

export interface SchoolClass {
  id: string;
  name: string;
  homeroomTeacherName: string;
  homeroomTeacherNip: string;
  homeroomTeacherRole: string;
  homeroomSignatureUrl?: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  gender: Gender;
  className: string;
  sakit: number;
  izin: number;
  alpa: number;
  behaviorPredicate: BehaviorPredicate;
  behaviorNote: string;
  homeroomNote: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  className: string; // 'Semua Kelas' or specific class name e.g. 'X 1'
  teacherName: string;
  isVisible: boolean;
  learningOutcome: string;
}

export interface GradeRecord {
  id: string; // `${studentId}_${subjectId}_${semester}_${academicYear.replace('/','-')}`
  studentId: string;
  subjectId: string;
  className: string;
  semester: SemesterType;
  academicYear: string;
  astsScore: number | null;
  updatedByTeacher: string;
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
  classes: SchoolClass[];
  students: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  settings: SchoolSetting;
  lastUpdated: string;
}

export type ActiveMenu =
  | 'dashboard'
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
