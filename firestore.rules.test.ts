/**
 * Security Rules Verification Suite ("Dirty Dozen" Payloads)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are strictly denied by firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Create',
    collection: 'students',
    docId: 'std_1',
    operation: 'create',
    auth: { uid: 'attacker_uid', email_verified: true },
    payload: {
      nisn: '0091827364',
      name: 'Ahmad Fauzi',
      gender: 'L',
      className: 'X 1',
      sakit: 0,
      izin: 0,
      alpa: 0,
      behaviorPredicate: 'Baik',
      behaviorNote: 'Disiplin',
      homeroomNote: 'Pertahankan',
      ownerId: 'victim_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collection: 'classes',
    docId: 'cls_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: false },
    payload: {
      name: 'X 1',
      homeroomTeacherName: 'Budi Santoso, S.Pd',
      homeroomTeacherNip: '198501012010011001',
      homeroomTeacherRole: 'Wali Kelas X 1',
      ownerId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Create',
    collection: 'subjects',
    docId: 'sub_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      code: 'MAT',
      name: 'Matematika',
      className: 'Semua Kelas',
      teacherName: 'Siti Aminah, S.Pd',
      isVisible: true,
      learningOutcome: 'Mampu memahami aljabar.',
      ownerId: 'user_1',
      isAdminBypass: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Update',
    collection: 'students',
    docId: 'std_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      sakit: 1,
      izin: 0,
      alpa: 0,
      hacked: 'yes',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner Mutation on Update',
    collection: 'classes',
    docId: 'cls_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'CreatedAt Tampering on Update',
    collection: 'subjects',
    docId: 'sub_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      createdAt: '2099-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp on Create',
    collection: 'classes',
    docId: 'cls_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      name: 'X 1',
      homeroomTeacherName: 'Budi Santoso, S.Pd',
      homeroomTeacherNip: '198501012010011001',
      homeroomTeacherRole: 'Wali Kelas',
      ownerId: 'user_1',
      createdAt: '2000-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning Attack',
    collection: 'students',
    docId: 'invalid$id!with*spaces',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      nisn: '0091827364',
      name: 'Ahmad Fauzi',
      gender: 'L',
      className: 'X 1',
      sakit: 0,
      izin: 0,
      alpa: 0,
      behaviorPredicate: 'Baik',
      behaviorNote: 'Baik',
      homeroomNote: 'Baik',
      ownerId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Denial-of-Wallet Oversized String',
    collection: 'students',
    docId: 'std_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      homeroomNote: 'A'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Out-of-Bounds Grade Value',
    collection: 'grades',
    docId: 'grd_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      studentId: 'std_1',
      subjectId: 'sub_1',
      className: 'X 1',
      semester: 'Ganjil',
      academicYear: '2026/2027',
      astsScore: 150,
      updatedByTeacher: 'Budi Santoso, S.Pd',
      ownerId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned Relational Write',
    collection: 'grades',
    docId: 'grd_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      studentId: 'non_existent_student',
      subjectId: 'sub_1',
      className: 'X 1',
      semester: 'Ganjil',
      academicYear: '2026/2027',
      astsScore: 88,
      updatedByTeacher: 'Budi Santoso, S.Pd',
      ownerId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Cross-Tenant List Scraping',
    collection: 'students',
    docId: '*',
    operation: 'list',
    auth: { uid: 'attacker_uid', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
