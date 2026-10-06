import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  Monitor,
  Database,
  ArrowDown,
  Calendar,
  BookOpen,
  X,
  Plus,
} from 'lucide-react';
import {
  AppDatabaseState,
  UserAccount,
  UserRole,
  TeacherAssignment,
  AcademicYear,
  SemesterType,
} from '../types';

interface UserAndAccessManagementProps {
  dbState: AppDatabaseState;
  currentUser: UserAccount;
  onSelectUserAccount: (user: UserAccount) => void;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (uid: string) => void;
  onAddAssignment: (asg: Omit<TeacherAssignment, 'id'>) => void;
  onDeleteAssignment: (id: string) => void;
  onAddAcademicYear: (ay: Omit<AcademicYear, 'id'>) => void;
  onActivateAcademicYear: (id: string) => void;
  notify: (msg: string) => void;
}

export const UserAndAccessManagementView: React.FC<UserAndAccessManagementProps> = ({
  dbState,
  currentUser,
  onSelectUserAccount,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddAssignment,
  onDeleteAssignment,
  onAddAcademicYear,
  onActivateAcademicYear,
  notify,
}) => {
  const { users, classes, subjects, teacherAssignments, academicYears } = dbState;
  const isAdmin = currentUser.role === 'admin';

  const [activeTab, setActiveTab] = useState<'users' | 'assignments' | 'years' | 'flow'>('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');

  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('teacher');
  const [formHomeroomClass, setFormHomeroomClass] = useState('');
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);
  const [formAssignedClasses, setFormAssignedClasses] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Assignment Form State
  const [asgTeacherUid, setAsgTeacherUid] = useState(users[1]?.uid || '');
  const [asgSubjectId, setAsgSubjectId] = useState(subjects[0]?.id || '');
  const [asgClassName, setAsgClassName] = useState(classes[0]?.name || 'X 1');

  // Academic Year Form State
  const [newYearStr, setNewYearStr] = useState('2027/2028');
  const [newSemester, setNewSemester] = useState<SemesterType>('Ganjil');

  const openAddUser = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormNip('');
    setFormRole('teacher');
    setFormHomeroomClass('');
    setFormSubjectIds(subjects[0] ? [subjects[0].id] : []);
    setFormAssignedClasses(classes.map((c) => c.name));
    setFormIsActive(true);
    setShowUserModal(true);
  };

  const openEditUser = (u: UserAccount) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormName(u.name);
    setFormNip(u.nip);
    setFormRole(
      u.role === 'wali_kelas' ? 'homeroom' : u.role === 'guru_mapel' ? 'teacher' : u.role
    );
    setFormHomeroomClass(u.homeroomClass);
    setFormSubjectIds(u.assignedSubjectIds);
    setFormAssignedClasses(u.assignedClasses);
    setFormIsActive(u.isActive);
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      notify('Nama Guru dan Email wajib diisi.');
      return;
    }

    const payload: UserAccount = {
      uid: editingUser ? editingUser.uid : `usr_${Date.now()}`,
      email: formEmail.trim().toLowerCase(),
      name: formName.trim(),
      nip: formNip.trim(),
      role: formRole,
      homeroomClass:
        formRole === 'homeroom' || formRole === 'wali_kelas'
          ? formHomeroomClass || classes[0]?.name || 'X 1'
          : formHomeroomClass,
      assignedSubjectIds: formSubjectIds,
      assignedClasses: formAssignedClasses,
      isActive: formIsActive,
      active: formIsActive,
    };

    if (editingUser) {
      onUpdateUser(payload);
      notify(`Akun ${payload.name} berhasil diperbarui.`);
    } else {
      onAddUser(payload);
      notify(`Akun guru ${payload.name} berhasil ditambahkan.`);
    }
    setShowUserModal(false);
  };

  const toggleSubjectCheckbox = (subId: string) => {
    setFormSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const toggleClassCheckbox = (clsName: string) => {
    setFormAssignedClasses((prev) =>
      prev.includes(clsName) ? prev.filter((c) => c !== clsName) : [...prev, clsName]
    );
  };

  const roleLabel = (r: UserRole) => {
    if (r === 'admin') return 'Admin Sekolah (admin)';
    if (r === 'homeroom' || r === 'wali_kelas') return 'Wali Kelas (homeroom)';
    return 'Guru Mata Pelajaran (teacher)';
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTeacherQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.nip.toLowerCase().includes(q) ||
      u.homeroomClass.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Akun Guru, Hak Akses & Tahun Pelajaran
            </h2>
            <p className="text-sm text-slate-600">
              Kelola tiga peran pengguna (Admin Sekolah, Guru Mata Pelajaran, Wali Kelas), penugasan kelas/mapel, dan sinkronisasi Firebase Database.
            </p>
          </div>

          {isAdmin && activeTab === 'users' && (
            <button
              type="button"
              onClick={openAddUser}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              + Tambah Akun Guru / Wali Kelas
            </button>
          )}
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Daftar Akun & Hak Akses ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Penugasan Guru Mapel ({teacherAssignments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('years')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'years'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Tahun Pelajaran & Semester
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'flow'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Alur Akses Sistem (Diagram)
          </button>
        </div>
      </div>

      {/* TAB 1: DAFTAR AKUN & HAK AKSES */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs font-semibold text-slate-700">
              Menampilkan {filteredUsers.length} dari {users.length} Akun Guru / Staf Sekolah
            </div>
            <input
              type="text"
              value={searchTeacherQuery}
              onChange={(e) => setSearchTeacherQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, email, atau kelas..."
              className="w-full sm:w-80 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Pengguna & NIP</th>
                  <th className="py-3 px-4">Email Login</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Kewenangan Kelas / Mapel</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi / Uji Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredUsers.map((u) => {
                  const isCurrent = u.uid === currentUser.uid;
                  const subjectNames = u.assignedSubjectIds
                    .map((id) => subjects.find((s) => s.id === id)?.code || id)
                    .join(', ');

                  return (
                    <tr
                      key={u.uid}
                      className={`transition-colors ${
                        isCurrent ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs font-mono text-slate-500">
                          NIP: {u.nip || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                        {roleLabel(u.role)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 space-y-0.5">
                        {u.role === 'admin' ? (
                          <span className="font-medium text-emerald-800">
                            Akses Penuh Seluruh Data Sekolah
                          </span>
                        ) : (
                          <>
                            {u.homeroomClass && (
                              <div>
                                Wali Kelas: <strong>{u.homeroomClass}</strong>
                              </div>
                            )}
                            {subjectNames && (
                              <div>
                                Mapel Diampu: <strong>{subjectNames}</strong>
                              </div>
                            )}
                            {u.assignedClasses.length > 0 && (
                              <div className="text-[11px] text-slate-500">
                                Kelas Ajar: {u.assignedClasses.join(', ')}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            Menunggu Persetujuan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!u.isActive && !isAdmin) {
                                notify('Akun ini belum diaktifkan oleh Admin Sekolah.');
                                return;
                              }
                              onSelectUserAccount(u);
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {isCurrent ? 'Sedang Aktif' : 'Gunakan Akun'}
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditUser(u)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                                title="Edit Akun & Kewenangan"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {u.role !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteUser(u.uid);
                                    notify(`Akun ${u.name} telah dihapus.`);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENUGASAN GURU MATA PELAJARAN */}
      {activeTab === 'assignments' && (
        <div className="space-y-5">
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Tambah Penugasan Guru Mata Pelajaran ke Kelas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pilih Guru
                  </label>
                  <select
                    value={asgTeacherUid}
                    onChange={(e) => setAsgTeacherUid(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={asgSubjectId}
                    onChange={(e) => setAsgSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={asgClassName}
                    onChange={(e) => setAsgClassName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const teacher = users.find((u) => u.uid === asgTeacherUid);
                    if (!teacher) return;
                    onAddAssignment({
                      teacherUid: teacher.uid,
                      teacherName: teacher.name,
                      subjectId: asgSubjectId,
                      className: asgClassName,
                      academicYear: dbState.settings.academicYear,
                      semester: dbState.settings.semester,
                    });
                    notify('Penugasan mengajar berhasil ditambahkan.');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tetapkan Penugasan
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 w-14 text-center">No</th>
                    <th className="py-3 px-4">Nama Guru Pengampu</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4 w-28 text-center">Kelas</th>
                    <th className="py-3 px-4 w-40">Tahun / Semester</th>
                    {isAdmin && <th className="py-3 px-4 w-24 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {teacherAssignments.map((asg, idx) => {
                    const sub = subjects.find((s) => s.id === asg.subjectId);
                    return (
                      <tr key={asg.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {asg.teacherName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <span className="font-mono font-semibold text-xs mr-1.5">
                            {sub?.code || asg.subjectId}
                          </span>
                          <span>{sub?.name || ''}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-800">
                          {asg.className}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-mono text-slate-600">
                          {asg.academicYear} · {asg.semester}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAssignment(asg.id);
                                notify('Penugasan mengajar dihapus.');
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TAHUN PELAJARAN & SEMESTER */}
      {activeTab === 'years' && (
        <div className="space-y-5">
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Tambah Periode Tahun Pelajaran & Semester
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    value={newYearStr}
                    onChange={(e) => setNewYearStr(e.target.value)}
                    placeholder="Contoh: 2027/2028"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value as SemesterType)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newYearStr.trim()) return;
                    onAddAcademicYear({
                      year: newYearStr.trim(),
                      semester: newSemester,
                      isActive: false,
                    });
                    notify(`Periode ${newYearStr} (${newSemester}) ditambahkan.`);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Periode
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Tahun Pelajaran</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {ay.year}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{ay.semester}</td>
                    <td className="py-3 px-4 text-xs">
                      {ay.isActive ? (
                        <span className="font-semibold text-emerald-700">
                          Periode Aktif Sekolah
                        </span>
                      ) : (
                        <span className="text-slate-500">Arsip / Non-Aktif</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!ay.isActive && isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            onActivateAcademicYear(ay.id);
                            notify(
                              `Periode aktif diubah ke TP ${ay.year} Semester ${ay.semester}.`
                            );
                          }}
                          className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer"
                        >
                          Jadikan Periode Aktif
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RUNTUTAN AKSES SISTEM (VISUAL ARCHITECTURE DIAGRAM) */}
      {activeTab === 'flow' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              Arsitektur Runtutan Akses Multi-Guru & Database Terpusat
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Seluruh perubahan tersinkronisasi melalui Firebase Cloud Firestore & Server Terpusat untuk diakses dari HP, Laptop, maupun PC.
            </p>
          </div>

          <div className="max-w-3xl mx-auto flex flex-col items-center space-y-3 text-center">
            {/* Level 1: School Identity */}
            <div className="w-full max-w-md bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
              <div className="text-xs font-semibold text-emerald-400">
                SISTEM INFORMASI AKADEMIK ONLINE
              </div>
              <div className="text-base font-bold mt-0.5">
                RAPORT BAYANGAN SMA MA’ARIF 05 PADANG RATU
              </div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400" />

            {/* Level 2: Login Guru */}
            <div className="w-full max-w-xs bg-emerald-700 text-white rounded-xl p-3 font-semibold text-sm">
              LOGIN GURU & AUTENTIKASI PERAN
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400" />

            {/* Level 3: Role Split */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-left space-y-1.5">
                <div className="text-xs font-bold text-emerald-800 uppercase">
                  1. ADMIN SEKOLAH
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Akses Penuh Semua Data
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Kelola akun guru, siswa, kelas, mapel, penugasan, tahun pelajaran, pengaturan F4, dan backup database.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-left space-y-1.5">
                <div className="text-xs font-bold text-slate-900 uppercase">
                  2. GURU MATA PELAJARAN
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Akses Kelas & Mapel Diampu
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Input, edit, & impor nilai ASTS sesuai kelas dan mata pelajaran yang ditugaskan. Tidak dapat mengubah nilai guru lain.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-left space-y-1.5">
                <div className="text-xs font-bold text-slate-900 uppercase">
                  3. WALI KELAS
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Akses Kelas Binaan & Raport
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Lihat leger seluruh mapel kelasnya, isi absensi, perilaku, catatan wali kelas, dan cetak Raport Bayangan F4.
                </p>
              </div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400" />

            {/* Level 4: Firebase Database */}
            <div className="w-full max-w-md bg-emerald-900 text-white rounded-xl p-4 flex items-center justify-center gap-3">
              <Database className="w-5 h-5 text-emerald-300 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">FIREBASE CLOUD DATABASE</div>
                <div className="text-[11px] text-emerald-200">
                  Sinkronisasi Real-Time & Validasi Firebase Security Rules
                </div>
              </div>
            </div>

            <ArrowDown className="w-5 h-5 text-slate-400" />

            {/* Level 5: Multi-Device */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
              <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center gap-1.5">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-semibold text-slate-800">
                  HP (Android / iPhone)
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center gap-1.5">
                <Laptop className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-semibold text-slate-800">Laptop</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center gap-1.5">
                <Monitor className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-semibold text-slate-800">
                  Komputer (PC)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? `Edit Akun: ${editingUser.name}` : 'Tambah Akun Guru / Wali Kelas'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Hendri Kurniawan, S.Pd"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Akun Guru
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nama@smamaarif05.sch.id"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIP / NUPTK
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Peran Pengguna (Role)
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="teacher">Guru Mata Pelajaran (teacher)</option>
                  <option value="homeroom">Wali Kelas (homeroom)</option>
                  <option value="admin">Admin Sekolah (admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kelas Perwalian (Khusus Wali Kelas)
                </label>
                <select
                  value={formHomeroomClass}
                  onChange={(e) => setFormHomeroomClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="">— Bukan Wali Kelas —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      Wali Kelas {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formRole !== 'admin' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Mata Pelajaran yang Diampu:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    {subjects.map((sub) => (
                      <label
                        key={sub.id}
                        className="inline-flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formSubjectIds.includes(sub.id)}
                          onChange={() => toggleSubjectCheckbox(sub.id)}
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span className="truncate">
                          {sub.code} — {sub.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Kelas yang Diampu:
                  </label>
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    {classes.map((cls) => (
                      <label
                        key={cls.id}
                        className="inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formAssignedClasses.includes(cls.name)}
                          onChange={() => toggleClassCheckbox(cls.name)}
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span>{cls.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                Akun Aktif & Disetujui Login
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
