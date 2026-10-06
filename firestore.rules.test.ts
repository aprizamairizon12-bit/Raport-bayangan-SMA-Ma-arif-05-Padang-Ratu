/**
 * Multi-Teacher RBAC Security Rules Verification Suite ("Dirty Dozen" Payloads)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are strictly denied by firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Escalation',
    collection: 'users',
    docId: 'attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'guru@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      email: 'guru@example.com',
      name: 'Guru Biasa',
      nip: '',
      role: 'admin',
      homeroomClass: '',
      assignedSubjectIds: '',
      assignedClasses: '',
      isActive: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collection: 'settings',
    docId: 'main_settings',
    operation: 'update',
    auth: { uid: 'spoof_uid', email: 'aprizamairizon12@gmail.com', email_verified: false },
    payload: {
      schoolName: 'Hacked School',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-Teacher Grade Tampering',
    collection: 'grades',
    docId: 'grd_1',
    operation: 'update',
    auth: { uid: 'teacher_a', email: 'teachera@example.com', email_verified: true },
    payload: {
      astsScore: 100,
      teacherUid: 'teacher_b',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unassigned Subject Grade Write',
    collection: 'grades',
    docId: 'grd_2',
    operation: 'create',
    auth: { uid: 'teacher_a', email: 'teachera@example.com', email_verified: true },
    payload: {
      studentId: 'std_x1_1',
      subjectId: 'sub_fis',
      assignmentId: 'unassigned_id',
      className: 'XII 1',
      semester: 'Ganjil',
      academicYear: '2026/2027',
      astsScore: 95,
      updatedByTeacher: 'Teacher A',
      teacherUid: 'teacher_a',
      ownerId: 'teacher_a',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Wali Kelas Modifying Student Identity',
    collection: 'students',
    docId: 'std_x1_1',
    operation: 'update',
    auth: { uid: 'wali_x1', email: 'walix1@example.com', email_verified: true },
    payload: {
      nisn: '9999999999',
      className: 'XII 2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Wali Kelas Deleting Master Student Record',
    collection: 'students',
    docId: 'std_x1_1',
    operation: 'delete',
    auth: { uid: 'wali_x1', email: 'walix1@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Shadow Field Injection on Create',
    collection: 'subjects',
    docId: 'sub_1',
    operation: 'create',
    auth: { uid: 'admin_uid', email: 'aprizamairizon12@gmail.com', email_verified: true },
    payload: {
      code: 'MAT',
      name: 'Matematika',
      className: 'Semua Kelas',
      teacherName: 'Hendri Kurniawan, S.Pd',
      teacherUid: 'usr_hendri',
      isVisible: true,
      learningOutcome: 'CP Matematika',
      ownerId: 'admin_uid',
      bypassSecurity: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow Field Injection on Update',
    collection: 'students',
    docId: 'std_x1_1',
    operation: 'update',
    auth: { uid: 'wali_x1', email: 'walix1@example.com', email_verified: true },
    payload: {
      sakit: 2,
      izin: 0,
      alpa: 0,
      extraField: 123,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation on Update',
    collection: 'grades',
    docId: 'grd_1',
    operation: 'update',
    auth: { uid: 'admin_uid', email: 'aprizamairizon12@gmail.com', email_verified: true },
    payload: {
      studentId: 'different_student',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack',
    collection: 'classes',
    docId: 'invalid$id!spaces',
    operation: 'create',
    auth: { uid: 'admin_uid', email: 'aprizamairizon12@gmail.com', email_verified: true },
    payload: {
      name: 'X 1',
      homeroomTeacherName: 'Ahmad Syafi’i, S.Pd.I',
      homeroomTeacherNip: '19840512',
      homeroomTeacherRole: 'Wali Kelas',
      homeroomUid: 'usr_ahmad',
      ownerId: 'admin_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Denial-of-Wallet Oversized String',
    collection: 'students',
    docId: 'std_x1_1',
    operation: 'update',
    auth: { uid: 'wali_x1', email: 'walix1@example.com', email_verified: true },
    payload: {
      homeroomNote: 'X'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Out-of-Bounds Grade Value',
    collection: 'grades',
    docId: 'grd_1',
    operation: 'create',
    auth: { uid: 'admin_uid', email: 'aprizamairizon12@gmail.com', email_verified: true },
    payload: {
      studentId: 'std_x1_1',
      subjectId: 'sub_mat',
      assignmentId: 'asg_1',
      className: 'X 1',
      semester: 'Ganjil',
      academicYear: '2026/2027',
      astsScore: 105,
      updatedByTeacher: 'Hendri Kurniawan, S.Pd',
      teacherUid: 'usr_hendri',
      ownerId: 'admin_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
