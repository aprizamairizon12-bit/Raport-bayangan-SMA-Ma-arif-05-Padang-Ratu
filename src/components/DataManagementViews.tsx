import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
  Eye,
  EyeOff,
  Check,
  X,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import {
  AppDatabaseState,
  Student,
  SchoolClass,
  Subject,
  Gender,
} from '../types';
import {
  downloadExcelTemplate,
  exportStudentsToExcel,
  parseExcelFile,
  normalizeGender,
} from '../utils/excelUtils';

/* ============================================================================
 * 1. MENU DATA SISWA
 * ========================================================================== */
interface StudentsViewProps {
  dbState: AppDatabaseState;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onBulkImportStudents: (students: Omit<Student, 'id'>[]) => void;
  notify: (msg: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  dbState,
  selectedClass,
  setSelectedClass,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkImportStudents,
  notify,
}) => {
  const { classes, students } = dbState;
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [formNisn, setFormNisn] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<Gender>('L');
  const [formClass, setFormClass] = useState(
    selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchClass =
        selectedClass === 'Semua Kelas' || st.className === selectedClass;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.nisn.toLowerCase().includes(q) ||
        st.className.toLowerCase().includes(q);
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormNisn('');
    setFormName('');
    setFormGender('L');
    setFormClass(
      selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass
    );
    setShowModal(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setFormNisn(st.nisn);
    setFormName(st.name);
    setFormGender(st.gender);
    setFormClass(st.className);
    setShowModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formName.trim()) {
      notify('NISN dan Nama Siswa wajib diisi.');
      return;
    }

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        nisn: formNisn.trim(),
        name: formName.trim(),
        gender: formGender,
        className: formClass,
      });
      notify(`Data siswa ${formName.trim()} berhasil diperbarui.`);
    } else {
      onAddStudent({
        nisn: formNisn.trim(),
        name: formName.trim(),
        gender: formGender,
        className: formClass,
        sakit: 0,
        izin: 0,
        alpa: 0,
        behaviorPredicate: 'Baik',
        behaviorNote:
          'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
        homeroomNote:
          'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
      });
      notify(`Siswa ${formName.trim()} berhasil ditambahkan ke Kelas ${formClass}.`);
    }
    setShowModal(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      const defaultCls =
        selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass;
      const imported: Omit<Student, 'id'>[] = [];

      rows.forEach((row) => {
        const nisn = String(
          row['NISN'] ?? row['nisn'] ?? row['No Induk'] ?? ''
        ).trim();
        const name = String(
          row['Nama Siswa'] ?? row['Nama'] ?? row['nama'] ?? ''
        ).trim();
        const genderRaw = row['L/P'] ?? row['LP'] ?? row['Jenis Kelamin'] ?? 'L';
        const clsName =
          String(row['Kelas'] ?? row['kelas'] ?? defaultCls).trim() || defaultCls;

        if (name) {
          imported.push({
            nisn: nisn || `009${Math.floor(1000000 + Math.random() * 9000000)}`,
            name,
            gender: normalizeGender(genderRaw),
            className: clsName,
            sakit: Number(row['Sakit'] ?? 0) || 0,
            izin: Number(row['Izin'] ?? 0) || 0,
            alpa: Number(row['Alpa'] ?? 0) || 0,
            behaviorPredicate: 'Baik',
            behaviorNote:
              'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
            homeroomNote:
              'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
          });
        }
      });

      if (imported.length === 0) {
        notify('Tidak ada baris data siswa valid ditemukan di file Excel.');
      } else {
        onBulkImportStudents(imported);
        notify(`${imported.length} data siswa berhasil diimpor dari Excel.`);
      }
    } catch {
      notify('Gagal membaca file Excel Data Siswa.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Top Action Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Data Peserta Didik</h2>
            <p className="text-sm text-slate-600">
              Kelola daftar siswa per kelas, tambah siswa, import dari Excel, atau unduh rekap data siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Tambah Siswa
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>

            <button
              type="button"
              onClick={() => {
                downloadExcelTemplate('students', { className: selectedClass });
                notify('Template Excel Data Siswa berhasil diunduh.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>

            <button
              type="button"
              onClick={() => {
                exportStudentsToExcel(filteredStudents, selectedClass);
                notify('Data Siswa berhasil diekspor ke Excel.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Filter Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="Semua Kelas">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => {
                const count = students.filter((s) => s.className === c.name).length;
                return (
                  <option key={c.id} value={c.name}>
                    Kelas {c.name} ({count} Siswa)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Cari Siswa (Nama atau NISN)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa atau NISN..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4 w-36">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-20 text-center">L/P</th>
                <th className="py-3 px-4 w-28 text-center">Kelas</th>
                <th className="py-3 px-4 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada data siswa yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-medium text-slate-700">
                      {st.nisn}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {st.name}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-700">
                      {st.gender}
                    </td>
                    <td className="py-2.5 px-4 text-center font-medium text-slate-800">
                      {st.className}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStudent(st.id);
                            notify(`Siswa ${st.name} telah dihapus.`);
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NISN
                </label>
                <input
                  type="text"
                  required
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  placeholder="Contoh: 0094812001"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap peserta didik"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Kelamin (L/P)
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="L">L (Laki-laki)</option>
                    <option value="P">P (Perempuan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                Simpan Siswa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. MENU DATA KELAS & MENU DATA WALI KELAS
 * ========================================================================== */
interface ClassesAndHomeroomProps {
  mode: 'classes' | 'homeroom';
  dbState: AppDatabaseState;
  onAddClass: (cls: Omit<SchoolClass, 'id'>) => void;
  onUpdateClass: (cls: SchoolClass) => void;
  onDeleteClass: (classId: string) => void;
  onBulkImportClasses: (clsList: Omit<SchoolClass, 'id'>[]) => void;
  notify: (msg: string) => void;
}

export const ClassesAndHomeroomView: React.FC<ClassesAndHomeroomProps> = ({
  mode,
  dbState,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onBulkImportClasses,
  notify,
}) => {
  const { classes, students } = dbState;
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  const [formName, setFormName] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formRole, setFormRole] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openAdd = () => {
    setEditingClass(null);
    setFormName('');
    setFormTeacher('');
    setFormNip('');
    setFormRole('Wali Kelas');
    setShowModal(true);
  };

  const openEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormTeacher(cls.homeroomTeacherName);
    setFormNip(cls.homeroomTeacherNip);
    setFormRole(cls.homeroomTeacherRole);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      notify('Nama kelas wajib diisi.');
      return;
    }

    if (editingClass) {
      onUpdateClass({
        ...editingClass,
        name: formName.trim(),
        homeroomTeacherName: formTeacher.trim() || 'Belum Ditentukan',
        homeroomTeacherNip: formNip.trim(),
        homeroomTeacherRole: formRole.trim() || `Wali Kelas ${formName.trim()}`,
      });
      notify(`Data Kelas ${formName.trim()} & Wali Kelas berhasil diperbarui.`);
    } else {
      onAddClass({
        name: formName.trim(),
        homeroomTeacherName: formTeacher.trim() || 'Belum Ditentukan',
        homeroomTeacherNip: formNip.trim(),
        homeroomTeacherRole: formRole.trim() || `Wali Kelas ${formName.trim()}`,
        homeroomSignatureUrl: '',
      });
      notify(`Kelas ${formName.trim()} berhasil ditambahkan.`);
    }
    setShowModal(false);
  };

  const handleSignatureUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    cls: SchoolClass
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateClass({
        ...cls,
        homeroomSignatureUrl: String(reader.result || ''),
      });
      notify(`Tanda tangan Wali Kelas ${cls.name} berhasil disimpan.`);
    };
    reader.readAsDataURL(file);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      const imported: Omit<SchoolClass, 'id'>[] = [];
      rows.forEach((row) => {
        const name = String(row['Kelas'] ?? row['Nama Kelas'] ?? '').trim();
        const teacher = String(
          row['Nama Wali Kelas'] ?? row['Wali Kelas'] ?? ''
        ).trim();
        const nip = String(row['NIP/NUPTK'] ?? row['NIP'] ?? '').trim();
        const role = String(
          row['Jabatan'] ?? `Wali Kelas ${name}`
        ).trim();
        if (name) {
          imported.push({
            name,
            homeroomTeacherName: teacher || 'Belum Ditentukan',
            homeroomTeacherNip: nip,
            homeroomTeacherRole: role,
            homeroomSignatureUrl: '',
          });
        }
      });

      if (imported.length > 0) {
        onBulkImportClasses(imported);
        notify(`${imported.length} data kelas/wali kelas berhasil diimpor.`);
      } else {
        notify('Tidak ada data kelas yang valid pada file Excel.');
      }
    } catch {
      notify('Gagal mengimpor file Excel.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'classes'
              ? 'Manajemen Data Kelas (X 1 – XII 2)'
              : 'Data Guru & Wali Kelas'}
          </h2>
          <p className="text-sm text-slate-600">
            {mode === 'classes'
              ? 'Tambah, edit, hapus kelas, dan tentukan wali kelas untuk masing-masing rombongan belajar.'
              : 'Data Nama Wali Kelas, NIP/NUPTK, Jabatan, dan Tanda Tangan otomatis digunakan pada Raport Bayangan & Leger Nilai.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {mode === 'classes' ? '+ Tambah Kelas' : '+ Tambah Wali Kelas'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>

          <button
            type="button"
            onClick={() => {
              downloadExcelTemplate('classes');
              notify('Template Excel Data Kelas & Wali Kelas diunduh.');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4 w-28">Kelas</th>
                <th className="py-3 px-4">Nama Wali Kelas</th>
                <th className="py-3 px-4 w-48">NIP / NUPTK</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4 w-28 text-center">Jml Siswa</th>
                <th className="py-3 px-4 w-40 text-center">TTD Raport</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {classes.map((cls, idx) => {
                const count = students.filter((s) => s.className === cls.name).length;
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cls.name}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {cls.homeroomTeacherName}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700">
                      {cls.homeroomTeacherNip || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {cls.homeroomTeacherRole}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-semibold text-slate-800">
                      {count} Siswa
                    </td>
                    <td className="py-3 px-4 text-center">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        {cls.homeroomSignatureUrl ? 'Ubah TTD' : 'Upload TTD'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSignatureUpload(e, cls)}
                          className="hidden"
                        />
                      </label>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(cls)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                          title="Edit Kelas / Wali Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteClass(cls.id);
                            notify(`Kelas ${cls.name} telah dihapus.`);
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass
                  ? `Edit Kelas ${editingClass.name} & Wali Kelas`
                  : 'Tambah Kelas & Wali Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Kelas (Contoh: X 1, XI 1, XII 1)
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: X 1"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Wali Kelas & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  placeholder="Contoh: Ahmad Syafi’i, S.Pd.I"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIP / NUPTK (Jika ada)
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  placeholder="Contoh: 19840512 201101 1 004"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Contoh: Wali Kelas X 1 / Guru PAI"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                Simpan Data
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3. MENU MATA PELAJARAN & MENU CAPAIAN PEMBELAJARAN (CP)
 * ========================================================================== */
interface SubjectsAndCpProps {
  mode: 'subjects' | 'cp';
  dbState: AppDatabaseState;
  onAddSubject: (sub: Omit<Subject, 'id'>) => void;
  onUpdateSubject: (sub: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onBulkImportSubjects: (subs: Omit<Subject, 'id'>[]) => void;
  notify: (msg: string) => void;
}

export const SubjectsAndCpView: React.FC<SubjectsAndCpProps> = ({
  mode,
  dbState,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onBulkImportSubjects,
  notify,
}) => {
  const { subjects, classes } = dbState;
  const [filterClass, setFilterClass] = useState<string>('Semua Kelas');
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('Semua Kelas');
  const [formTeacher, setFormTeacher] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formCp, setFormCp] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredSubjects = useMemo(() => {
    if (filterClass === 'Semua Kelas') return subjects;
    return subjects.filter(
      (s) => s.className === 'Semua Kelas' || s.className === filterClass
    );
  }, [subjects, filterClass]);

  const openAdd = () => {
    setEditingSubject(null);
    setFormCode('');
    setFormName('');
    setFormClass('Semua Kelas');
    setFormTeacher('');
    setFormVisible(true);
    setFormCp('');
    setShowModal(true);
  };

  const openEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setFormCode(sub.code);
    setFormName(sub.name);
    setFormClass(sub.className);
    setFormTeacher(sub.teacherName);
    setFormVisible(sub.isVisible);
    setFormCp(sub.learningOutcome);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      notify('Kode dan Nama Mata Pelajaran wajib diisi.');
      return;
    }

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        className: formClass,
        teacherName: formTeacher.trim() || 'Guru Mata Pelajaran',
        isVisible: formVisible,
        learningOutcome: formCp.trim(),
      });
      notify(`Mata pelajaran ${formName.trim()} berhasil diperbarui.`);
    } else {
      onAddSubject({
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        className: formClass,
        teacherName: formTeacher.trim() || 'Guru Mata Pelajaran',
        isVisible: formVisible,
        learningOutcome: formCp.trim(),
      });
      notify(`Mata pelajaran ${formName.trim()} berhasil ditambahkan.`);
    }
    setShowModal(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      const imported: Omit<Subject, 'id'>[] = [];
      rows.forEach((row) => {
        const code = String(row['Kode'] ?? row['kode'] ?? '').trim().toUpperCase();
        const name = String(
          row['Mata Pelajaran'] ?? row['Mapel'] ?? row['Nama'] ?? ''
        ).trim();
        const clsName = String(row['Kelas'] ?? 'Semua Kelas').trim() || 'Semua Kelas';
        const teacher = String(row['Guru'] ?? row['Guru Mapel'] ?? '-').trim();
        const statusRaw = String(row['Status Tampil'] ?? 'Tampil').toLowerCase();
        const cpText = String(
          row['Capaian Pembelajaran'] ?? row['CP'] ?? ''
        ).trim();

        if (name) {
          imported.push({
            code: code || name.slice(0, 4).toUpperCase(),
            name,
            className: clsName,
            teacherName: teacher || 'Guru Mapel',
            isVisible: !statusRaw.includes('sembunyi') && !statusRaw.includes('off'),
            learningOutcome: cpText,
          });
        }
      });

      if (imported.length > 0) {
        onBulkImportSubjects(imported);
        notify(`${imported.length} mata pelajaran / CP berhasil diimpor dari Excel.`);
      } else {
        notify('Tidak ada data mata pelajaran valid di file Excel.');
      }
    } catch {
      notify('Gagal membaca file Excel.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'subjects'
                ? 'Data Mata Pelajaran & Guru Pengampu'
                : 'Capaian Pembelajaran (CP) Kurikulum Merdeka'}
            </h2>
            <p className="text-sm text-slate-600">
              {mode === 'subjects'
                ? 'Atur kode mapel, kelas, guru mata pelajaran, serta status tampil/sembunyikan pada Raport & Leger.'
                : 'Deskripsi Capaian Pembelajaran (CP) akan ditampilkan secara utuh dan tidak terpotong pada Raport Bayangan.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {mode === 'subjects' ? '+ Tambah Mapel' : '+ Tambah CP'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {mode === 'subjects' ? 'Import Excel' : 'Import CP dari Excel'}
            </button>

            <button
              type="button"
              onClick={() => {
                downloadExcelTemplate(mode === 'subjects' ? 'subjects' : 'cp', {
                  subjects,
                });
                notify('Template Excel berhasil diunduh.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </div>

        {/* Filter Class */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
          <label className="text-xs font-medium text-slate-700">Filter Kelas:</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="Semua Kelas">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                Kelas {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-20">Kode</th>
                <th className="py-3 px-4 w-56">Mata Pelajaran</th>
                <th className="py-3 px-4 w-32">Kelas</th>
                {mode === 'subjects' ? (
                  <>
                    <th className="py-3 px-4">Guru Mata Pelajaran</th>
                    <th className="py-3 px-4 w-36 text-center">Status Tampil</th>
                  </>
                ) : (
                  <th className="py-3 px-4">
                    Deskripsi Lengkap Capaian Pembelajaran (CP)
                  </th>
                )}
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredSubjects.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-slate-50/80 transition-colors align-top"
                >
                  <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800">
                    {sub.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {sub.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {sub.className}
                  </td>
                  {mode === 'subjects' ? (
                    <>
                      <td className="py-3 px-4 text-slate-700">
                        {sub.teacherName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSubject({
                              ...sub,
                              isVisible: !sub.isVisible,
                            });
                            notify(
                              `Mata pelajaran ${sub.name} diatur ke: ${
                                !sub.isVisible ? 'Tampil' : 'Sembunyi'
                              }.`
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                            sub.isVisible
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {sub.isVisible ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Tampil
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Sembunyi
                            </>
                          )}
                        </button>
                      </td>
                    </>
                  ) : (
                    <td className="py-3 px-4 text-xs text-slate-700 leading-relaxed whitespace-normal break-words">
                      <textarea
                        rows={2}
                        value={sub.learningOutcome}
                        onChange={(e) =>
                          onUpdateSubject({
                            ...sub,
                            learningOutcome: e.target.value,
                          })
                        }
                        placeholder="Ketik deskripsi Capaian Pembelajaran lengkap..."
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </td>
                  )}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(sub)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (mode === 'cp') {
                            onUpdateSubject({ ...sub, learningOutcome: '' });
                            notify(`CP untuk ${sub.name} telah dikosongkan.`);
                          } else {
                            onDeleteSubject(sub.id);
                            notify(`Mata pelajaran ${sub.name} telah dihapus.`);
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject
                  ? `Edit ${editingSubject.name}`
                  : 'Tambah Mata Pelajaran & Capaian Pembelajaran'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kode Mapel
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Contoh: BIND"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Bahasa Indonesia"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kelas
                </label>
                <select
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="Semua Kelas">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Guru Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  placeholder="Nama Lengkap Guru & Gelar"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Deskripsi Lengkap Capaian Pembelajaran (CP)
              </label>
              <textarea
                rows={4}
                value={formCp}
                onChange={(e) => setFormCp(e.target.value)}
                placeholder="Peserta didik mampu..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formVisible}
                  onChange={(e) => setFormVisible(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                Tampilkan pada Raport Bayangan & Leger
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
