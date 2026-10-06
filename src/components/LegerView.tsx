import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Eye,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Download,
  Edit3,
} from 'lucide-react';
import {
  AppDatabaseState,
  SemesterType,
  SchoolClass,
} from '../types';
import { exportLegerToExcel } from '../utils/excelUtils';

interface LegerViewProps {
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
  onAddClass: (name: string, homeroomName: string, nip: string) => void;
  onDeleteClass: (classId: string) => void;
  notify: (msg: string) => void;
}

export const LegerView: React.FC<LegerViewProps> = ({
  dbState,
  selectedClass,
  setSelectedClass,
  onUpsertGrade,
  onAddClass,
  onDeleteClass,
  notify,
}) => {
  const { classes, students, subjects, grades, settings } = dbState;
  const activeClassName =
    selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass;

  const [semesterFilter, setSemesterFilter] = useState<SemesterType>(settings.semester);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>(settings.academicYear);
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [showAddClassModal, setShowAddClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newHomeroomName, setNewHomeroomName] = useState<string>('');
  const [newHomeroomNip, setNewHomeroomNip] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    subjectId: string;
    value: string;
  } | null>(null);

  const activeClassObj: SchoolClass | undefined = useMemo(
    () => classes.find((c) => c.name === activeClassName) || classes[0],
    [classes, activeClassName]
  );

  const classStudents = useMemo(
    () => students.filter((s) => s.className === activeClassName),
    [students, activeClassName]
  );

  const classSubjects = useMemo(
    () =>
      subjects.filter(
        (s) =>
          s.isVisible &&
          (s.className === 'Semua Kelas' || s.className === activeClassName)
      ),
    [subjects, activeClassName]
  );

  const displayedSubjects = useMemo(
    () => classSubjects.filter((s) => !hiddenSubjectIds.includes(s.id)),
    [classSubjects, hiddenSubjectIds]
  );

  const toggleSubjectFilter = (subjectId: string) => {
    setHiddenSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  // Compute student rows + averages + rankings
  const legerRows = useMemo(() => {
    const rows = classStudents.map((student) => {
      const scoreMap = new Map<string, number | null>();
      let sum = 0;
      let count = 0;
      let emptyCount = 0;

      displayedSubjects.forEach((sub) => {
        const rec = grades.find(
          (g) =>
            g.studentId === student.id &&
            g.subjectId === sub.id &&
            g.semester === semesterFilter &&
            g.academicYear === academicYearFilter
        );
        if (rec && rec.astsScore !== null && rec.astsScore !== undefined) {
          scoreMap.set(sub.id, rec.astsScore);
          sum += rec.astsScore;
          count += 1;
        } else {
          scoreMap.set(sub.id, null);
          emptyCount += 1;
        }
      });

      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      return {
        student,
        scoreMap,
        sum,
        avg,
        count,
        emptyCount,
      };
    });

    const sorted = [...rows].sort((a, b) => b.avg - a.avg);
    const rankMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      rankMap.set(item.student.id, idx + 1);
    });

    return rows.map((r) => ({
      ...r,
      rank: rankMap.get(r.student.id) || 1,
    }));
  }, [classStudents, displayedSubjects, grades, semesterFilter, academicYearFilter]);

  // Subject statistics (Average, Max, Min)
  const subjectStats = useMemo(() => {
    const stats = new Map<
      string,
      { avg: number | null; max: number | null; min: number | null; empty: number }
    >();

    displayedSubjects.forEach((sub) => {
      const validScores: number[] = [];
      let empty = 0;
      legerRows.forEach((row) => {
        const val = row.scoreMap.get(sub.id);
        if (val !== null && val !== undefined) {
          validScores.push(val);
        } else {
          empty += 1;
        }
      });

      if (validScores.length > 0) {
        const sum = validScores.reduce((a, b) => a + b, 0);
        stats.set(sub.id, {
          avg: Number((sum / validScores.length).toFixed(1)),
          max: Math.max(...validScores),
          min: Math.min(...validScores),
          empty,
        });
      } else {
        stats.set(sub.id, { avg: null, max: null, min: null, empty });
      }
    });

    return stats;
  }, [displayedSubjects, legerRows]);

  const overallStats = useMemo(() => {
    const avgs = legerRows.filter((r) => r.count > 0).map((r) => r.avg);
    const totalEmpty = legerRows.reduce((acc, r) => acc + r.emptyCount, 0);
    return {
      studentCount: classStudents.length,
      classAvg:
        avgs.length > 0
          ? Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2))
          : 0,
      highestAvg: avgs.length > 0 ? Math.max(...avgs) : 0,
      lowestAvg: avgs.length > 0 ? Math.min(...avgs) : 0,
      totalEmpty,
    };
  }, [legerRows, classStudents.length]);

  const handleDownloadExcel = (targetClassName?: string) => {
    const clsName = targetClassName || activeClassName;
    const clsObj = classes.find((c) => c.name === clsName) || activeClassObj;
    const targetStudents = students.filter((s) => s.className === clsName);
    const targetSubjects = subjects.filter(
      (s) =>
        s.isVisible &&
        !hiddenSubjectIds.includes(s.id) &&
        (s.className === 'Semua Kelas' || s.className === clsName)
    );

    exportLegerToExcel({
      schoolName: settings.schoolName,
      className: clsName,
      semester: semesterFilter,
      academicYear: academicYearFilter,
      homeroomTeacherName: clsObj?.homeroomTeacherName || '-',
      homeroomTeacherNip: clsObj?.homeroomTeacherNip || '-',
      principalName: settings.principalName,
      principalNip: settings.principalNip,
      reportPlaceDate: settings.reportPlaceDate,
      students: targetStudents,
      subjects: targetSubjects,
      grades,
      showRanking: settings.showRanking,
    });
    notify(`Leger Kelas ${clsName} berhasil diunduh ke Excel.`);
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const trimmed = editingCell.value.trim();
    if (trimmed === '') {
      onUpsertGrade(
        editingCell.studentId,
        editingCell.subjectId,
        activeClassName,
        semesterFilter,
        academicYearFilter,
        null
      );
      setEditingCell(null);
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      notify('Nilai harus berupa angka 0 sampai 100.');
      return;
    }
    onUpsertGrade(
      editingCell.studentId,
      editingCell.subjectId,
      activeClassName,
      semesterFilter,
      academicYearFilter,
      Math.round(num)
    );
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      {/* Action & Filter Toolbar (Hidden on Print) */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Leger Nilai Raport Bayangan — Kelas {activeClassName}
            </h2>
            <p className="text-sm text-slate-600">
              Klik langsung pada angka nilai di dalam tabel leger untuk mengedit nilai ASTS siswa secara instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadExcel()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              DOWNLOAD LEGER EXCEL
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD LEGER PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              PRINT LEGER
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                isPreviewMode
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-4 h-4" />
              {isPreviewMode ? 'TUTUP PREVIEW' : 'PREVIEW'}
            </button>
          </div>
        </div>

        {/* Class Selector + Add/Delete Class + Semester + Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pilih Kelas (beserta Tambah / Hapus Kelas)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={activeClassName}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    Leger Kelas {c.name} — Wali: {c.homeroomTeacherName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddClassModal(true)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kelas
              </button>
              {activeClassObj && classes.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteClass(activeClassObj.id);
                    const nextCls = classes.find((c) => c.id !== activeClassObj.id);
                    if (nextCls) setSelectedClass(nextCls.name);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Kelas
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Semester
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
              Tahun Pelajaran
            </label>
            <input
              type="text"
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Quick Download Leger Per Kelas Buttons */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Unduh Cepat Leger Nilai Berdasarkan Kelas (.xlsx):
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => handleDownloadExcel(cls.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  cls.name === activeClassName
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Leger Kelas {cls.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Column Visibility Selector */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">
              Tampilkan / Sembunyikan Kolom Mata Pelajaran ({displayedSubjects.length} dari{' '}
              {classSubjects.length} aktif):
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setHiddenSubjectIds([])}
                className="text-emerald-700 font-medium hover:underline cursor-pointer"
              >
                Tampilkan Semua
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() =>
                  setHiddenSubjectIds(classSubjects.slice(3).map((s) => s.id))
                }
                className="text-slate-600 hover:underline cursor-pointer"
              >
                Ringkas (3 Mapel Utama)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {classSubjects.map((sub) => {
              const isShown = !hiddenSubjectIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => toggleSubjectFilter(sub.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    isShown
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isShown ? (
                    <CheckSquare className="w-3 h-3" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  <span>
                    {sub.code} ({sub.name})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Jumlah Siswa</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {overallStats.studentCount} Siswa
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Rata-rata Kelas</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-0.5">
              {overallStats.classAvg}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Rata-rata Tertinggi</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {overallStats.highestAvg}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Rata-rata Terendah</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {overallStats.lowestAvg}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Nilai Kosong (Belum Input)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-amber-700 mt-0.5">
              {overallStats.totalEmpty} Sel
            </div>
          </div>
        </div>
      </div>

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Tambah Kelas Baru ke Leger
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Kelas (Contoh: X 5, XI 3, XII 3)
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Contoh: X 5"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Wali Kelas
                </label>
                <input
                  type="text"
                  value={newHomeroomName}
                  onChange={(e) => setNewHomeroomName(e.target.value)}
                  placeholder="Nama Lengkap & Gelar"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIP / NUPTK Wali Kelas
                </label>
                <input
                  type="text"
                  value={newHomeroomNip}
                  onChange={(e) => setNewHomeroomNip(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newClassName.trim()) {
                    notify('Nama kelas wajib diisi.');
                    return;
                  }
                  onAddClass(
                    newClassName.trim(),
                    newHomeroomName.trim() || 'Belum Ditentukan',
                    newHomeroomNip.trim()
                  );
                  setSelectedClass(newClassName.trim());
                  setNewClassName('');
                  setNewHomeroomName('');
                  setNewHomeroomNip('');
                  setShowAddClassModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                Simpan Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Previewable Leger Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 print:border-none print:p-0">
        {/* Official Leger Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {settings.showLogo && settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-16 h-16 object-contain"
              />
            )}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600">
                LEMBAGA PENDIDIKAN MA’ARIF NU LAMPUNG TENGAH
              </p>
              <h1 className="text-lg font-bold uppercase text-slate-900">
                {settings.schoolName}
              </h1>
              <p className="text-xs text-slate-600">{settings.address}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase text-emerald-900">
              LEGER NILAI RAPORT BAYANGAN (ASTS)
            </div>
            <div className="text-xs text-slate-700 mt-1 space-y-0.5">
              <div>
                <span className="font-semibold">Kelas:</span> {activeClassName} ·{' '}
                <span className="font-semibold">Semester:</span> {semesterFilter}
              </div>
              <div>
                <span className="font-semibold">Tahun Pelajaran:</span> {academicYearFilter}
              </div>
              <div>
                <span className="font-semibold">Wali Kelas:</span>{' '}
                {activeClassObj?.homeroomTeacherName || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Leger Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-slate-950">
                <th className="border border-slate-400 px-2 py-2 text-center w-9">No</th>
                <th className="border border-slate-400 px-2.5 py-2 text-left w-24">NISN</th>
                <th className="border border-slate-400 px-3 py-2 text-left min-w-[180px]">
                  Nama Siswa
                </th>
                <th className="border border-slate-400 px-2 py-2 text-center w-9">L/P</th>
                {displayedSubjects.map((sub) => (
                  <th
                    key={sub.id}
                    title={`${sub.name} — Guru: ${sub.teacherName}`}
                    className="border border-slate-400 px-2 py-2 text-center min-w-[68px]"
                  >
                    <div className="font-bold">{sub.code}</div>
                    <div className="text-[10px] font-normal opacity-80 truncate max-w-[76px] mx-auto">
                      {sub.name}
                    </div>
                  </th>
                ))}
                <th className="border border-slate-400 px-2.5 py-2 text-center w-16">Jumlah</th>
                <th className="border border-slate-400 px-2.5 py-2 text-center w-18">
                  Rata-rata
                </th>
                {settings.showRanking && (
                  <th className="border border-slate-400 px-2 py-2 text-center w-14">
                    Ranking
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {legerRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayedSubjects.length + 7}
                    className="border border-slate-300 px-4 py-8 text-center text-slate-500"
                  >
                    Belum ada data siswa di Kelas {activeClassName}.
                  </td>
                </tr>
              ) : (
                legerRows.map((row, idx) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 font-mono tabular-nums text-slate-700">
                      {row.student.nisn}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 font-medium text-slate-900">
                      {row.student.name}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                      {row.student.gender}
                    </td>

                    {displayedSubjects.map((sub) => {
                      const val = row.scoreMap.get(sub.id);
                      const isEditing =
                        editingCell?.studentId === row.student.id &&
                        editingCell?.subjectId === sub.id;

                      return (
                        <td
                          key={sub.id}
                          onClick={() => {
                            if (!isPreviewMode) {
                              setEditingCell({
                                studentId: row.student.id,
                                subjectId: sub.id,
                                value: val !== null && val !== undefined ? String(val) : '',
                              });
                            }
                          }}
                          className={`border border-slate-300 px-1.5 py-1 text-center font-mono tabular-nums cursor-pointer ${
                            val === null || val === undefined
                              ? 'bg-amber-50/70 text-amber-800'
                              : 'text-slate-900 hover:bg-emerald-50'
                          }`}
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              autoFocus
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({
                                  ...editingCell,
                                  value: e.target.value,
                                })
                              }
                              onBlur={commitCellEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCellEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-14 px-1 py-0.5 text-center text-xs font-mono bg-white border border-emerald-600 rounded focus:outline-none"
                            />
                          ) : val !== null && val !== undefined ? (
                            <span className="inline-flex items-center justify-center gap-0.5">
                              {val}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-sans">
                              Kosong
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums font-semibold bg-slate-50">
                      {row.sum}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums font-bold text-emerald-900 bg-emerald-50/50">
                      {row.avg}
                    </td>
                    {settings.showRanking && (
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums font-semibold">
                        {row.rank}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>

            {/* Summary Statistics Rows */}
            {legerRows.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-3 py-1.5 text-right"
                  >
                    Rata-rata Nilai Mata Pelajaran
                  </td>
                  {displayedSubjects.map((sub) => {
                    const st = subjectStats.get(sub.id);
                    return (
                      <td
                        key={sub.id}
                        className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums"
                      >
                        {st?.avg ?? '-'}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                    -
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums text-emerald-900">
                    {overallStats.classAvg}
                  </td>
                  {settings.showRanking && (
                    <td className="border border-slate-300 px-2 py-1.5" />
                  )}
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-3 py-1.5 text-right"
                  >
                    Nilai Tertinggi
                  </td>
                  {displayedSubjects.map((sub) => {
                    const st = subjectStats.get(sub.id);
                    return (
                      <td
                        key={sub.id}
                        className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums text-emerald-800"
                      >
                        {st?.max ?? '-'}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                    -
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                    {overallStats.highestAvg}
                  </td>
                  {settings.showRanking && (
                    <td className="border border-slate-300 px-2 py-1.5" />
                  )}
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-3 py-1.5 text-right"
                  >
                    Nilai Terendah
                  </td>
                  {displayedSubjects.map((sub) => {
                    const st = subjectStats.get(sub.id);
                    return (
                      <td
                        key={sub.id}
                        className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums text-amber-800"
                      >
                        {st?.min ?? '-'}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                    -
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums">
                    {overallStats.lowestAvg}
                  </td>
                  {settings.showRanking && (
                    <td className="border border-slate-300 px-2 py-1.5" />
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="print:hidden mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
          <span>
            Tips: Klik pada sel nilai mana pun di tabel leger untuk mengedit nilai secara langsung, lalu tekan Enter.
          </span>
        </div>

        {/* Official Leger Bottom Signature Block */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-xs">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="mb-1">Mengetahui,</p>
              <p className="font-semibold">Orang Tua / Wali Komite</p>
              <div className="h-16" />
              <p className="font-semibold underline">
                ( ............................................ )
              </p>
            </div>

            <div>
              <p className="mb-1">Mengetahui,</p>
              <p className="font-semibold">Kepala {settings.schoolName}</p>
              <div className="h-16 flex items-center justify-center">
                {settings.principalSignatureUrl && (
                  <img
                    src={settings.principalSignatureUrl}
                    alt="TTD Kepala Sekolah"
                    referrerPolicy="no-referrer"
                    className="max-h-14 object-contain"
                  />
                )}
              </div>
              <p className="font-bold underline">{settings.principalName}</p>
              <p className="font-mono tabular-nums text-[11px]">
                NIP/NUPTK. {settings.principalNip || '-'}
              </p>
            </div>

            <div>
              <p className="mb-1">{settings.reportPlaceDate}</p>
              <p className="font-semibold">Wali Kelas {activeClassName}</p>
              <div className="h-16 flex items-center justify-center">
                {activeClassObj?.homeroomSignatureUrl && (
                  <img
                    src={activeClassObj.homeroomSignatureUrl}
                    alt="TTD Wali Kelas"
                    referrerPolicy="no-referrer"
                    className="max-h-14 object-contain"
                  />
                )}
              </div>
              <p className="font-bold underline">
                {activeClassObj?.homeroomTeacherName || '-'}
              </p>
              <p className="font-mono tabular-nums text-[11px]">
                NIP/NUPTK. {activeClassObj?.homeroomTeacherNip || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
