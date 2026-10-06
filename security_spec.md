# Security Specification — Raport Bayangan SMA Ma'arif 05 Padang Ratu

## 1. Data Invariants
1. **Authentication & Verification Invariant**: Every read and write operation requires a signed-in user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
2. **Ownership Invariant**: Every document in `/classes`, `/students`, `/subjects`, `/grades`, and `/settings` must carry an `ownerId` matching `request.auth.uid` on creation, and `ownerId` is immutable on update (`incoming().ownerId == existing().ownerId`).
3. **Path ID Invariant**: Every single-document operation (`get`, `create`, `update`, `delete`) must validate its path variable ID using `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, length 1..128). `list` operations do not call `isValidId()` and must enforce `resource.data.ownerId == request.auth.uid`.
4. **Relational Integrity Invariant**: A `GradeRecord` in `/grades/{gradeId}` cannot be created or updated unless both `/students/$(incoming().studentId)` and `/subjects/$(incoming().subjectId)` exist and belong to `request.auth.uid`.
5. **Temporal Integrity Invariant**: `createdAt` and `updatedAt` must equal `request.time` on creation. On update, `createdAt` is immutable (`incoming().createdAt == existing().createdAt`) and `updatedAt == request.time`.
6. **Strict Schema & Bounds Invariant**: All strings enforce explicit `.size()` bounds matching `firebase-blueprint.json`, numeric values (`astsScore`, `sakit`, `izin`, `alpa`, `fontSize`, `marginMm`) enforce numeric range bounds, and `hasAll`/`hasOnly` prevent shadow fields.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Create**: Creating a `/students/std_1` document where `ownerId: "victim_uid"` while authenticated as `"attacker_uid"`.
2. **Unverified Email Spoof**: Performing a write to `/classes/cls_1` with `email_verified: false`.
3. **Shadow Field Injection on Create**: Creating a `/subjects/sub_1` document with an extra undeclared field `isAdminBypass: true`.
4. **Shadow Field Injection on Update**: Updating `/students/std_1` with an extra field `hacked: "yes"` outside the `affectedKeys().hasOnly(...)` allowlist.
5. **Owner Mutation on Update**: Updating `/classes/cls_1` to change `ownerId` from `"user_1"` to `"user_2"`.
6. **CreatedAt Tampering on Update**: Updating `/subjects/sub_1` while modifying `createdAt` to `request.time`.
7. **Forged Client Timestamp on Create**: Creating `/classes/cls_1` with a past or future `createdAt` timestamp not equal to `request.time`.
8. **ID Poisoning Attack**: Creating a document at `/students/invalid$id!with*spaces` that violates `^[a-zA-Z0-9_\-]+$`.
9. **Denial-of-Wallet Oversized String**: Updating `homeroomNote` on `/students/std_1` with a 5,000-character string (exceeding `maxLength: 500`).
10. **Out-of-Bounds Grade Value**: Creating `/grades/grd_1` with `astsScore: 150` (exceeding `0..100`).
11. **Orphaned Relational Write**: Creating `/grades/grd_1` referencing a non-existent `studentId: "missing_student"` or a student owned by another user.
12. **Unauthorized Cross-Tenant List Scraping**: Executing a `list` query on `/students` or `/settings` without filtering `resource.data.ownerId == request.auth.uid`.
