import React, { useState, useRef, useMemo } from 'react';
import {
  Save,
  ClipboardPaste,
  Upload,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import {
  AppDatabaseState,
  Student,
  SemesterType,
  BehaviorPredicate,
} from '../types';
import {
  downloadExcelTemplate,
  parseExcelFile,
  normalizePredicate,
} from '../utils/excelUtils';

/* ============================================================================
 * 1. MENU UTAMA INPUT NILAI ASTS
 * ========================================================================== */
interface InputGradesViewProps {
  dbState: AppDatabaseState;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  activeTeacherName: string;
  onUpsertGrade: (
    studentId: string,
    subjectId: string,
    className: string,
    semester: SemesterType,
    academicYear: string,
    score: number | null
  ) => void;
  onBulkUpsertGrades: (
    entries: {
      studentId: string;
      subjectId: string;
      className: string;
      semester: SemesterType;
      academicYear: string;
      score: number | null;
    }[]
  ) => void;
  notify: (msg: string) => void;
}

export const InputGradesView: React.FC<InputGradesViewProps> = ({
  dbState,
  selectedClass,
  setSelectedClass,
  onUpsertGrade,
  onBulkUpsertGrades,
  notify,
}) => {
  const { classes, students, subjects, grades, settings } = dbState;
  const activeClassName =
    selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [semesterFilter, setSemesterFilter] = useState<SemesterType>(settings.semester);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>(settings.academicYear);
  const [showOnlyEmpty, setShowOnlyEmpty] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  const classStudents = useMemo(
    () => students.filter((s) => s.className === activeClassName),
    [students, activeClassName]
  );

  const studentGradeRows = useMemo(() => {
    return classStudents.map((st) => {
      const rec = grades.find(
        (g) =>
          g.studentId === st.id &&
          g.subjectId === activeSubject?.id &&
          g.semester === semesterFilter &&
          g.academicYear === academicYearFilter
      );
      return {
        student: st,
        score: rec?.astsScore ?? null,
        updatedBy: rec?.updatedByTeacher || '-',
      };
    });
  }, [classStudents, grades, activeSubject, semesterFilter, academicYearFilter]);

  const displayedRows = useMemo(() => {
    if (!showOnlyEmpty) return studentGradeRows;
    return studentGradeRows.filter((r) => r.score === null);
  }, [studentGradeRows, showOnlyEmpty]);

  const filledCount = studentGradeRows.filter((r) => r.score !== null).length;
  const emptyCount = studentGradeRows.length - filledCount;

  const handleScoreChange = (studentId: string, rawVal: string) => {
    if (!activeSubject) return;
    const trimmed = rawVal.trim();
    if (trimmed === '') {
      onUpsertGrade(
        studentId,
        activeSubject.id,
        activeClassName,
        semesterFilter,
        academicYearFilter,
        null
      );
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num)) return;
    if (num < 0 || num > 100) {
      notify('Validasi Nilai: Nilai ASTS harus berada pada rentang 0 sampai 100.');
      return;
    }
    onUpsertGrade(
      studentId,
      activeSubject.id,
      activeClassName,
      semesterFilter,
      academicYearFilter,
      Math.round(num)
    );
  };

  const handleClearClassGrades = () => {
    if (!activeSubject) return;
    const entries = classStudents.map((st) => ({
      studentId: st.id,
      subjectId: activeSubject.id,
      className: activeClassName,
      semester: semesterFilter,
      academicYear: academicYearFilter,
      score: null,
    }));
    onBulkUpsertGrades(entries);
    notify(
      `Nilai ${activeSubject.name} untuk Kelas ${activeClassName} berhasil dikosongkan.`
    );
  };

  const handlePasteGradesApply = () => {
    if (!activeSubject) return;
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      notify('Silakan tempel (paste) nilai dari Excel terlebih dahulu.');
      return;
    }

    const entries: {
      studentId: string;
      subjectId: string;
      className: string;
      semester: SemesterType;
      academicYear: string;
      score: number | null;
    }[] = [];

    lines.forEach((line, idx) => {
      // Support either single column of numbers OR tab-separated (NISN/Name + Score)
      const parts = line.split('\t').map((p) => p.trim());
      const lastPart = parts[parts.length - 1];
      const num = Number(lastPart.replace(',', '.'));
      if (!Number.isNaN(num) && num >= 0 && num <= 100) {
        // Match by NISN if first column matches a student NISN, otherwise by row order
        const matchedByNisn = classStudents.find((s) => s.nisn === parts[0]);
        const targetStudent = matchedByNisn || classStudents[idx];
        if (targetStudent) {
          entries.push({
            studentId: targetStudent.id,
            subjectId: activeSubject.id,
            className: activeClassName,
            semester: semesterFilter,
            academicYear: academicYearFilter,
            score: Math.round(num),
          });
        }
      }
    });

    if (entries.length === 0) {
      notify('Tidak ada angka nilai valid (0–100) yang terdeteksi.');
      return;
    }

    onBulkUpsertGrades(entries);
    setShowPasteModal(false);
    setPasteText('');
    notify(`${entries.length} nilai ASTS berhasil ditempel dan disimpan ke Cloud!`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSubject) return;
    try {
      const rows = await parseExcelFile(file);
      const entries: {
        studentId: string;
        subjectId: string;
        className: string;
        semester: SemesterType;
        academicYear: string;
        score: number | null;
      }[] = [];

      rows.forEach((row, idx) => {
        const nisn = String(row['NISN'] ?? row['nisn'] ?? '').trim();
        const name = String(row['Nama Siswa'] ?? row['Nama'] ?? '').trim().toLowerCase();
        const rawScore =
          row['Nilai ASTS'] ?? row['Nilai'] ?? row['ASTS'] ?? row['Score'] ?? '';
        const num = Number(rawScore);

        if (rawScore !== '' && !Number.isNaN(num) && num >= 0 && num <= 100) {
          const target =
            classStudents.find((s) => s.nisn === nisn) ||
            classStudents.find((s) => s.name.toLowerCase() === name) ||
            classStudents[idx];

          if (target) {
            entries.push({
              studentId: target.id,
              subjectId: activeSubject.id,
              className: activeClassName,
              semester: semesterFilter,
              academicYear: academicYearFilter,
              score: Math.round(num),
            });
          }
        }
      });

      if (entries.length > 0) {
        onBulkUpsertGrades(entries);
        notify(`${entries.length} nilai ASTS berhasil diimpor dari Excel.`);
      } else {
        notify('Tidak ada nilai valid (0–100) ditemukan pada file Excel.');
      }
    } catch {
      notify('Gagal membaca file Excel Nilai ASTS.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Input Nilai ASTS (Asesmen Sumatif Tengah Semester)
            </h2>
            <p className="text-sm text-slate-600">
              Nilai tersimpan otomatis ke database cloud (rentang validasi 0–100). Mendukung Paste langsung dari Excel.
            </p>
          </div>

          {/* Required Action Buttons: Simpan, Edit, Hapus, Paste Nilai, Import Excel, Download Template */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                notify('Seluruh perubahan nilai telah tersimpan di database cloud!')
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan
            </button>

            <button
              type="button"
              onClick={() => {
                setIsReadOnlyMode((prev) => !prev);
                notify(
                  isReadOnlyMode
                    ? 'Mode Edit Nilai Diaktifkan.'
                    : 'Tabel dikunci sementara. Klik Edit untuk mengubah nilai.'
                );
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                !isReadOnlyMode
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4" />
              Paste Nilai
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>

            <button
              type="button"
              onClick={() => {
                downloadExcelTemplate('grades', {
                  className: activeClassName,
                  subjectName: activeSubject?.name,
                  subjectCode: activeSubject?.code,
                  students,
                });
                notify('Template Excel Nilai ASTS berhasil diunduh.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>

            <button
              type="button"
              onClick={handleClearClassGrades}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          </div>
        </div>

        {/* 4 Required Selectors: Kelas, Mata Pelajaran, Semester, Tahun Pelajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              1. Pilih Kelas
            </label>
            <select
              value={activeClassName}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              2. Pilih Mata Pelajaran
            </label>
            <select
              value={activeSubject?.id || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              3. Semester
            </label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value as SemesterType)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              4. Tahun Pelajaran
            </label>
            <input
              type="text"
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Status Bar & Filter Empty */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Guru Pengampu: <strong className="text-slate-900">{activeSubject?.teacherName}</strong>
            </span>
            <span>·</span>
            <span>
              Sudah Diinput:{' '}
              <strong className="font-mono tabular-nums text-emerald-700">
                {filledCount} Siswa
              </strong>
            </span>
            <span>·</span>
            <span>
              Belum Diinput:{' '}
              <strong className="font-mono tabular-nums text-amber-700">
                {emptyCount} Siswa
              </strong>
            </span>
          </div>

          <label className="inline-flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyEmpty}
              onChange={(e) => setShowOnlyEmpty(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700"
            />
            Tampilkan Hanya Nilai Kosong / Belum Diinput ({emptyCount})
          </label>
        </div>
      </div>

      {/* Paste From Excel Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Paste Banyak Nilai Sekaligus dari Excel
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Salin (Copy) kolom angka nilai dari Microsoft Excel untuk{' '}
              <strong>Kelas {activeClassName}</strong> pada mata pelajaran{' '}
              <strong>{activeSubject?.name}</strong>, lalu tempel (Paste) pada kotak di bawah ini. Urutan baris otomatis disesuaikan dengan daftar siswa ({classStudents.length} siswa).
            </p>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'Contoh:\n88\n92\n85\n90\n79'}
              className="w-full p-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePasteGradesApply}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                Terapkan & Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grades Table: | No | NISN | Nama Siswa | Nilai ASTS | Status | */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4 w-36">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-44 text-center">Nilai ASTS (0–100)</th>
                <th className="py-3 px-4 w-48">Status</th>
                <th className="py-3 px-4 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    {showOnlyEmpty
                      ? 'Semua siswa di kelas ini sudah memiliki nilai ASTS!'
                      : `Belum ada data siswa di Kelas ${activeClassName}.`}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => {
                  const isFilled = row.score !== null && row.score !== undefined;
                  return (
                    <tr
                      key={row.student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-700">
                        {row.student.nisn}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {row.student.name}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={isReadOnlyMode}
                          value={row.score !== null ? row.score : ''}
                          onChange={(e) =>
                            handleScoreChange(row.student.id, e.target.value)
                          }
                          placeholder="0 - 100"
                          className={`w-28 px-3 py-1.5 text-center font-mono tabular-nums text-sm font-bold rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                            isFilled
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-amber-50/60 border-amber-300 text-amber-900 placeholder:text-amber-400'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {isFilled ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Sudah Diinput</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Belum Diinput (Kosong)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isFilled && (
                          <button
                            type="button"
                            onClick={() => handleScoreChange(row.student.id, '')}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                            title="Hapus Nilai Siswa Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. MENU ABSENSI, PERILAKU SISWA, DAN CATATAN WALI KELAS
 * ========================================================================== */
interface StudentAttributesViewProps {
  mode: 'attendance' | 'behavior' | 'homeroom_notes';
  dbState: AppDatabaseState;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  onUpdateStudent: (student: Student) => void;
  onBulkUpdateStudents: (updatedList: Student[]) => void;
  notify: (msg: string) => void;
}

export const StudentAttributesView: React.FC<StudentAttributesViewProps> = ({
  mode,
  dbState,
  selectedClass,
  setSelectedClass,
  onUpdateStudent,
  onBulkUpdateStudents,
  notify,
}) => {
  const { classes, students } = dbState;
  const activeClassName =
    selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const classStudents = useMemo(
    () => students.filter((s) => s.className === activeClassName),
    [students, activeClassName]
  );

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      const updatedMap = new Map<string, Student>();
      classStudents.forEach((s) => updatedMap.set(s.id, { ...s }));

      rows.forEach((row, idx) => {
        const nisn = String(row['NISN'] ?? row['nisn'] ?? '').trim();
        const name = String(row['Nama Siswa'] ?? row['Nama'] ?? '').trim().toLowerCase();
        const target =
          classStudents.find((s) => s.nisn === nisn) ||
          classStudents.find((s) => s.name.toLowerCase() === name) ||
          classStudents[idx];

        if (target) {
          const current = updatedMap.get(target.id) || { ...target };
          if (mode === 'attendance') {
            current.sakit = Math.max(0, Number(row['Sakit'] ?? current.sakit) || 0);
            current.izin = Math.max(0, Number(row['Izin'] ?? current.izin) || 0);
            current.alpa = Math.max(0, Number(row['Alpa'] ?? current.alpa) || 0);
          } else if (mode === 'behavior') {
            if (row['Predikat']) {
              current.behaviorPredicate = normalizePredicate(row['Predikat']);
            }
            if (row['Catatan Perilaku'] !== undefined) {
              current.behaviorNote = String(row['Catatan Perilaku']).trim();
            }
          } else if (mode === 'homeroom_notes') {
            if (row['Catatan Wali Kelas'] !== undefined) {
              current.homeroomNote = String(row['Catatan Wali Kelas']).trim();
            }
          }
          updatedMap.set(target.id, current);
        }
      });

      onBulkUpdateStudents(Array.from(updatedMap.values()));
      notify(`Data Kelas ${activeClassName} berhasil diimpor dari Excel.`);
    } catch {
      notify('Gagal membaca file Excel.');
    }
    e.target.value = '';
  };

  const handleResetClassData = () => {
    const resetList = classStudents.map((st) => {
      if (mode === 'attendance') {
        return { ...st, sakit: 0, izin: 0, alpa: 0 };
      }
      if (mode === 'behavior') {
        return { ...st, behaviorPredicate: 'Baik' as BehaviorPredicate, behaviorNote: '' };
      }
      return { ...st, homeroomNote: '' };
    });
    onBulkUpdateStudents(resetList);
    notify(`Data pada Kelas ${activeClassName} telah direset.`);
  };

  const applyDefaultNotesToEmpty = () => {
    const updated = classStudents.map((st) => {
      if (mode === 'behavior') {
        return {
          ...st,
          behaviorNote:
            st.behaviorNote.trim() ||
            'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
        };
      }
      return {
        ...st,
        homeroomNote:
          st.homeroomNote.trim() ||
          'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
      };
    });
    onBulkUpdateStudents(updated);
    notify('Catatan standar berhasil diterapkan pada baris yang masih kosong.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'attendance' && 'Input Rekap Absensi Siswa (Sakit, Izin, Alpa)'}
              {mode === 'behavior' && 'Input Penilaian Perilaku & Sikap Siswa'}
              {mode === 'homeroom_notes' && 'Input Catatan Evaluasi Wali Kelas'}
            </h2>
            <p className="text-sm text-slate-600">
              {mode === 'attendance' &&
                'Masukkan jumlah hari ketidakhadiran siswa (Sakit, Izin, Alpa) untuk ditampilkan pada Raport Bayangan.'}
              {mode === 'behavior' &&
                'Pilih predikat perilaku (Sangat Baik, Baik, Cukup, Perlu Pembinaan) beserta catatan perilaku.'}
              {mode === 'homeroom_notes' &&
                'Tuliskan pesan motivasi dan evaluasi perkembangan belajar dari Wali Kelas untuk setiap siswa.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(mode === 'behavior' || mode === 'homeroom_notes') && (
              <button
                type="button"
                onClick={applyDefaultNotesToEmpty}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Isi Otomatis Catatan Kosong
              </button>
            )}

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
                downloadExcelTemplate(mode, {
                  className: activeClassName,
                  students,
                });
                notify('Template Excel berhasil diunduh.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>

            <button
              type="button"
              onClick={handleResetClassData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Hapus / Reset
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-700">Pilih Kelas:</label>
          <select
            value={activeClassName}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                Kelas {c.name} — Wali: {c.homeroomTeacherName}
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
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-32">NISN</th>
                <th className="py-3 px-4 w-64">Nama Siswa</th>
                {mode === 'attendance' && (
                  <>
                    <th className="py-3 px-4 w-32 text-center">Sakit (Hari)</th>
                    <th className="py-3 px-4 w-32 text-center">Izin (Hari)</th>
                    <th className="py-3 px-4 w-32 text-center">Alpa (Hari)</th>
                    <th className="py-3 px-4 w-28 text-center">Total Absen</th>
                  </>
                )}
                {mode === 'behavior' && (
                  <>
                    <th className="py-3 px-4 w-48">Predikat Sikap</th>
                    <th className="py-3 px-4">Catatan Perilaku</th>
                  </>
                )}
                {mode === 'homeroom_notes' && (
                  <th className="py-3 px-4">Catatan Wali Kelas</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Belum ada siswa di Kelas {activeClassName}.
                  </td>
                </tr>
              ) : (
                classStudents.map((st, idx) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50/80 transition-colors align-top"
                  >
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700">
                      {st.nisn}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {st.name}
                    </td>

                    {mode === 'attendance' && (
                      <>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={st.sakit}
                            onChange={(e) =>
                              onUpdateStudent({
                                ...st,
                                sakit: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-20 px-2 py-1.5 text-center font-mono tabular-nums text-sm border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={st.izin}
                            onChange={(e) =>
                              onUpdateStudent({
                                ...st,
                                izin: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-20 px-2 py-1.5 text-center font-mono tabular-nums text-sm border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={st.alpa}
                            onChange={(e) =>
                              onUpdateStudent({
                                ...st,
                                alpa: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-20 px-2 py-1.5 text-center font-mono tabular-nums text-sm border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums text-xs font-bold text-slate-700">
                          {st.sakit + st.izin + st.alpa} Hari
                        </td>
                      </>
                    )}

                    {mode === 'behavior' && (
                      <>
                        <td className="py-2.5 px-4">
                          <select
                            value={st.behaviorPredicate}
                            onChange={(e) =>
                              onUpdateStudent({
                                ...st,
                                behaviorPredicate: e.target
                                  .value as BehaviorPredicate,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="Sangat Baik">Sangat Baik</option>
                            <option value="Baik">Baik</option>
                            <option value="Cukup">Cukup</option>
                            <option value="Perlu Pembinaan">Perlu Pembinaan</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={st.behaviorNote}
                            onChange={(e) =>
                              onUpdateStudent({
                                ...st,
                                behaviorNote: e.target.value,
                              })
                            }
                            placeholder="Contoh: Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran."
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                          />
                        </td>
                      </>
                    )}

                    {mode === 'homeroom_notes' && (
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={st.homeroomNote}
                          onChange={(e) =>
                            onUpdateStudent({
                              ...st,
                              homeroomNote: e.target.value,
                            })
                          }
                          placeholder="Contoh: Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
