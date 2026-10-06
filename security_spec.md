# Security Specification — Sistem Raport Bayangan Multi-Guru SMA Ma'arif 05 Padang Ratu

## 1. Data Invariants & Role-Based Access Control (RBAC)
1. **Authentication & Email Verification Invariant**: Every read and write operation requires a signed-in user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
2. **Three-Tier Role Architecture**:
   - **Admin Sekolah (`isAdmin()`)**: Verified via bootstrapped admin email (`aprizamairizon12@gmail.com` with `email_verified == true`) or existence of `/admins/$(request.auth.uid)`. Admins can manage `/admins`, `/users`, `/teacherAssignments`, `/academicYears`, `/classes`, `/students`, `/subjects`, `/grades`, and `/settings`.
   - **Guru Mata Pelajaran (`guru_mapel`)**: Can read their assigned records and create/update `/grades/{gradeId}` strictly for their own `teacherUid == request.auth.uid` when a valid `/teacherAssignments/$(incoming().assignmentId)` exists and belongs to `request.auth.uid` for the matching `subjectId` and `className`. Cannot modify other teachers' grades, delete master school data, or change administrator settings.
   - **Wali Kelas (`wali_kelas`)**: Can read students in their assigned class (`homeroomUid == request.auth.uid`) and update `/students/{studentId}` strictly for attendance (`sakit`, `izin`, `alpa`), behavior (`behaviorPredicate`, `behaviorNote`), and `homeroomNote`. Cannot alter student NISN/class, delete students, or modify subject grades without a subject assignment.
3. **Anti-Privilege-Escalation Invariant**: Users can never self-assign `role: 'admin'` in `/users/{userId}` or write to `/admins/{adminId}` unless they are already `isAdmin()`.
4. **Relational Integrity Invariant**: A `GradeRecord` in `/grades/{gradeId}` cannot be created or updated unless `/students/$(incoming().studentId)`, `/subjects/$(incoming().subjectId)`, and `/teacherAssignments/$(incoming().assignmentId)` exist and match the teacher's assignment or admin authority.
5. **Temporal & Schema Integrity Invariant**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt`, `ownerId`, `studentId`, and `subjectId` are immutable on update. All strings enforce `.size()` limits and numeric fields enforce range bounds (`0..100` for `astsScore`, `0..365` for attendance).

## 2. The "Dirty Dozen" Payloads

1. **Self-Assigned Admin Escalation**: A non-admin user attempting to create `/users/attacker_uid` with `role: "admin"`.
2. **Unverified Admin Email Spoof**: A request with `email: "aprizamairizon12@gmail.com"` but `email_verified: false` attempting to write to `/settings/main_settings`.
3. **Cross-Teacher Grade Tampering**: Teacher A (`uid: "teacher_a"`) attempting to update a `/grades/grd_1` document owned by Teacher B (`teacherUid: "teacher_b"`).
4. **Unassigned Subject Grade Write**: Teacher A attempting to create a grade in `/grades/grd_2` referencing an `assignmentId` that does not belong to Teacher A.
5. **Wali Kelas Modifying Student Identity**: A homeroom teacher (`homeroomUid == request.auth.uid`) attempting to change `nisn` or `className` on `/students/std_1` instead of only attendance/behavior/notes.
6. **Wali Kelas Deleting Master Student Record**: A homeroom teacher attempting to `delete` `/students/std_1`.
7. **Shadow Field Injection on Create**: Creating `/subjects/sub_1` with an undeclared field `bypassSecurity: true`.
8. **Shadow Field Injection on Update**: Updating `/students/std_1` with an undeclared field `extraField: 123`.
9. **Immutable Field Mutation on Update**: Updating `/grades/grd_1` to change `studentId` or `createdAt`.
10. **ID Poisoning Attack**: Creating `/classes/invalid$id!spaces` violating `^[a-zA-Z0-9_\-]+$`.
11. **Denial-of-Wallet Oversized String**: Updating `homeroomNote` on `/students/std_1` with a 5,000-character string (exceeding `maxLength: 500`).
12. **Out-of-Bounds Grade Value**: Creating `/grades/grd_1` with `astsScore: 105` or `-5` (outside `0..100`).
