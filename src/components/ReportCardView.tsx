import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Eye,
  Users,
  User,
  Upload,
  CheckCircle2,
  Settings,
  FileText,
} from 'lucide-react';
import {
  AppDatabaseState,
  Student,
  Subject,
  SchoolClass,
  SemesterType,
  ActiveMenu,
} from '../types';

interface ReportCardViewProps {
  dbState: AppDatabaseState;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  onUpdateSettings: (partial: Partial<AppDatabaseState['settings']>) => void;
  onUpdateClass: (cls: SchoolClass) => void;
  onNavigate: (menu: ActiveMenu) => void;
  notify: (msg: string) => void;
}

export const ReportCardView: React.FC<ReportCardViewProps> = ({
  dbState,
  selectedClass,
  setSelectedClass,
  onUpdateSettings,
  onUpdateClass,
  onNavigate,
  notify,
}) => {
  const { classes, students, subjects, grades, settings } = dbState;
  const activeClassName =
    selectedClass === 'Semua Kelas' ? classes[0]?.name || 'X 1' : selectedClass;

  const classStudents = useMemo(
    () => students.filter((s) => s.className === activeClassName),
    [students, activeClassName]
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    classStudents[0]?.id || ''
  );
  const [printMode, setPrintMode] = useState<'single' | 'class'>('single');
  const [semesterFilter, setSemesterFilter] = useState<SemesterType>(settings.semester);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>(settings.academicYear);

  // Ensure selectedStudentId stays valid when class changes
  const activeStudent = useMemo(() => {
    const found = classStudents.find((s) => s.id === selectedStudentId);
    return found || classStudents[0] || null;
  }, [classStudents, selectedStudentId]);

  const activeClassObj = useMemo(
    () => classes.find((c) => c.name === activeClassName) || classes[0],
    [classes, activeClassName]
  );

  const visibleSubjects = useMemo(
    () =>
      subjects.filter(
        (sub) =>
          sub.isVisible &&
          (sub.className === 'Semua Kelas' || sub.className === activeClassName)
      ),
    [subjects, activeClassName]
  );

  // Calculate rankings across classStudents
  const classRankings = useMemo(() => {
    const totals = classStudents.map((st) => {
      let sum = 0;
      let count = 0;
      visibleSubjects.forEach((sub) => {
        const rec = grades.find(
          (g) =>
            g.studentId === st.id &&
            g.subjectId === sub.id &&
            g.semester === semesterFilter &&
            g.academicYear === academicYearFilter
        );
        if (rec && rec.astsScore !== null && rec.astsScore !== undefined) {
          sum += rec.astsScore;
          count += 1;
        }
      });
      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      return { studentId: st.id, sum, avg, count };
    });

    const sorted = [...totals].sort((a, b) => b.avg - a.avg);
    const map = new Map<string, { rank: number; sum: number; avg: number }>();
    sorted.forEach((item, idx) => {
      map.set(item.studentId, { rank: idx + 1, sum: item.sum, avg: item.avg });
    });
    return map;
  }, [classStudents, visibleSubjects, grades, semesterFilter, academicYearFilter]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'principal' | 'homeroom'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (target === 'principal') {
        onUpdateSettings({ principalSignatureUrl: result });
        notify('Tanda tangan Kepala Sekolah berhasil diunggah.');
      } else if (activeClassObj) {
        onUpdateClass({
          ...activeClassObj,
          homeroomSignatureUrl: result,
        });
        notify(`Tanda tangan Wali Kelas ${activeClassObj.name} berhasil diunggah.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = (mode: 'single' | 'class') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const studentsToRender: Student[] =
    printMode === 'class'
      ? classStudents
      : activeStudent
      ? [activeStudent]
      : [];

  // Paper dimensions in mm for preview container (F4 = 210 x 330 mm, A4 = 210 x 297 mm)
  const paperWidthMm =
    settings.orientation === 'Landscape'
      ? settings.paperSize === 'F4'
        ? 330
        : 297
      : 210;

  const paperMinHeightMm =
    settings.orientation === 'Landscape'
      ? 210
      : settings.paperSize === 'F4'
      ? 330
      : 297;

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden on Print) */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Preview & Cetak Raport Bayangan (ASTS)
            </h2>
            <p className="text-sm text-slate-600">
              Pilih kelas dan siswa untuk melihat pratinjau raport bayangan ukuran{' '}
              {settings.paperSize} ({settings.orientation}), cetak langsung, atau simpan sebagai PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint('single')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak 1 Siswa / Download PDF
            </button>
            <button
              type="button"
              onClick={() => handlePrint('class')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Cetak Semua Siswa ({classStudents.length} Siswa)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('report_settings')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Pengaturan Kertas & Kop
            </button>
          </div>
        </div>

        {/* Filters & Signature Upload Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pilih Kelas
            </label>
            <select
              value={activeClassName}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                const firstInClass = students.find((s) => s.className === e.target.value);
                if (firstInClass) setSelectedStudentId(firstInClass.id);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pilih Peserta Didik ({classStudents.length} Siswa)
            </label>
            <select
              value={activeStudent?.id || ''}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setPrintMode('single');
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {classStudents.map((st, idx) => (
                <option key={st.id} value={st.id}>
                  {idx + 1}. {st.name} (NISN: {st.nisn})
                </option>
              ))}
            </select>
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

        {/* Mode Switcher + Signature Quick Upload */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Mode Tampilan Preview:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPrintMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  printMode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Satu Siswa
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('class')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  printMode === 'class'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Semua Siswa Kelas {activeClassName} ({classStudents.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload TTD Kepsek</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'principal')}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload TTD Wali Kelas {activeClassName}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'homeroom')}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Printable Report Card Sheets */}
      {studentsToRender.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-800">
            Belum ada data siswa di Kelas {activeClassName}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Silakan tambahkan siswa terlebih dahulu pada menu Data Siswa.
          </p>
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {studentsToRender.map((student, pageIdx) => {
            const rankInfo = classRankings.get(student.id) || {
              rank: pageIdx + 1,
              sum: 0,
              avg: 0,
            };

            return (
              <div
                key={student.id}
                style={{
                  width: '100%',
                  maxWidth: `${paperWidthMm}mm`,
                  minHeight: `${paperMinHeightMm}mm`,
                  padding: `${settings.marginMm}mm`,
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}pt`,
                }}
                className="mx-auto bg-white text-slate-950 border border-slate-300 shadow-sm print:shadow-none print:border-none print:m-0 print:w-full break-after-page"
              >
                {/* 1. HEADER / KOP SEKOLAH */}
                <div
                  style={{ borderColor: settings.themeColor }}
                  className="border-b-4 pb-3 mb-4 flex items-center justify-between gap-4"
                >
                  {settings.showLogo ? (
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo Sekolah"
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 object-contain"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-lg">
                          MA
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}

                  <div className="text-center flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      LEMBAGA PENDIDIKAN MA’ARIF NAHDLATUL ULAMA LAMPUNG TENGAH
                    </p>
                    <h1
                      style={{ color: settings.themeColor }}
                      className="text-xl font-bold uppercase tracking-tight mt-0.5"
                    >
                      {settings.schoolName}
                    </h1>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">
                      NPSN: {settings.npsn}
                    </p>
                    <p className="text-[11px] text-slate-700 leading-snug mt-0.5">
                      {settings.address}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Telp: {settings.phone} · Email: {settings.email} · Website: {settings.website}
                    </p>
                  </div>

                  {settings.showLogo && settings.secondaryLogoUrl ? (
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      <img
                        src={settings.secondaryLogoUrl}
                        alt="Logo Tambahan"
                        referrerPolicy="no-referrer"
                        className="w-18 h-18 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 shrink-0" />
                  )}
                </div>

                {/* TITLE */}
                <div className="text-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide underline">
                    LAPORAN HASIL BELAJAR TENGAH SEMESTER (RAPORT BAYANGAN / ASTS)
                  </h2>
                </div>

                {/* 2. IDENTITAS PESERTA DIDIK */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-4">
                  <div className="space-y-1">
                    <div className="grid grid-cols-12">
                      <span className="col-span-4 font-semibold">Nama Peserta Didik</span>
                      <span className="col-span-8">: {student.name}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4 font-semibold">NISN</span>
                      <span className="col-span-8 font-mono tabular-nums">: {student.nisn}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4 font-semibold">Jenis Kelamin</span>
                      <span className="col-span-8">
                        : {student.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-12">
                      <span className="col-span-5 font-semibold">Kelas</span>
                      <span className="col-span-7">: {student.className}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-5 font-semibold">Semester</span>
                      <span className="col-span-7">: {semesterFilter}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-5 font-semibold">Tahun Pelajaran</span>
                      <span className="col-span-7 font-mono tabular-nums">
                        : {academicYearFilter}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. TABEL NILAI & CAPAIAN PEMBELAJARAN */}
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase mb-1.5">
                    A. Capaian Nilai Akademik (Asesmen Sumatif Tengah Semester)
                  </h3>
                  <table className="w-full border-collapse border border-slate-800 text-xs">
                    <thead>
                      <tr
                        style={{ backgroundColor: settings.themeColor }}
                        className="text-white print:bg-slate-200 print:text-slate-950"
                      >
                        <th className="border border-slate-800 px-2 py-1.5 w-10 text-center">
                          No
                        </th>
                        <th className="border border-slate-800 px-2.5 py-1.5 w-52 text-left">
                          Mata Pelajaran
                        </th>
                        {settings.showGrades && (
                          <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">
                            Nilai ASTS
                          </th>
                        )}
                        {settings.showCp && (
                          <th className="border border-slate-800 px-2.5 py-1.5 text-left">
                            Capaian Pembelajaran (CP)
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSubjects.map((sub, idx) => {
                        const gradeRec = grades.find(
                          (g) =>
                            g.studentId === student.id &&
                            g.subjectId === sub.id &&
                            g.semester === semesterFilter &&
                            g.academicYear === academicYearFilter
                        );
                        const score =
                          gradeRec && gradeRec.astsScore !== null && gradeRec.astsScore !== undefined
                            ? gradeRec.astsScore
                            : null;

                        return (
                          <tr key={sub.id} className="align-top">
                            <td className="border border-slate-800 px-2 py-1.5 text-center font-mono tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-800 px-2.5 py-1.5 font-medium">
                              <div>{sub.name}</div>
                              <div className="text-[10px] text-slate-600 font-normal">
                                Guru: {sub.teacherName}
                              </div>
                            </td>
                            {settings.showGrades && (
                              <td className="border border-slate-800 px-2 py-1.5 text-center font-mono tabular-nums font-bold">
                                {score !== null ? score : '-'}
                              </td>
                            )}
                            {settings.showCp && (
                              <td className="border border-slate-800 px-2.5 py-1.5 text-justify leading-relaxed whitespace-normal break-words">
                                {sub.learningOutcome || '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    {settings.showGrades && (
                      <tfoot>
                        <tr className="bg-slate-50 font-bold">
                          <td
                            colSpan={2}
                            className="border border-slate-800 px-2.5 py-1.5 text-right"
                          >
                            Jumlah Nilai / Rata-rata Nilai ASTS
                          </td>
                          <td className="border border-slate-800 px-2 py-1.5 text-center font-mono tabular-nums">
                            {rankInfo.sum} / {rankInfo.avg}
                          </td>
                          {settings.showCp && (
                            <td className="border border-slate-800 px-2.5 py-1.5 text-xs">
                              {settings.showRanking
                                ? `Peringkat Kelas: Ke-${rankInfo.rank} dari ${classStudents.length} Siswa`
                                : ''}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* 4. ABSENSI & PERILAKU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {settings.showAttendance && (
                    <div>
                      <h3 className="text-xs font-bold uppercase mb-1.5">
                        B. Ketidakhadiran (Absensi)
                      </h3>
                      <table className="w-full border-collapse border border-slate-800 text-xs">
                        <tbody>
                          <tr>
                            <td className="border border-slate-800 px-3 py-1.5">Sakit</td>
                            <td className="border border-slate-800 px-3 py-1.5 w-28 text-right font-mono tabular-nums">
                              {student.sakit} hari
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-800 px-3 py-1.5">Izin</td>
                            <td className="border border-slate-800 px-3 py-1.5 w-28 text-right font-mono tabular-nums">
                              {student.izin} hari
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-800 px-3 py-1.5">
                              Tanpa Keterangan (Alpa)
                            </td>
                            <td className="border border-slate-800 px-3 py-1.5 w-28 text-right font-mono tabular-nums">
                              {student.alpa} hari
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {settings.showBehavior && (
                    <div>
                      <h3 className="text-xs font-bold uppercase mb-1.5">
                        C. Perkembangan Perilaku / Sikap
                      </h3>
                      <table className="w-full border-collapse border border-slate-800 text-xs">
                        <tbody>
                          <tr>
                            <td className="border border-slate-800 px-3 py-1.5 w-28 font-semibold">
                              Predikat Sikap
                            </td>
                            <td className="border border-slate-800 px-3 py-1.5 font-bold">
                              {student.behaviorPredicate}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-800 px-3 py-1.5 font-semibold align-top">
                              Catatan Perilaku
                            </td>
                            <td className="border border-slate-800 px-3 py-1.5 leading-relaxed">
                              {student.behaviorNote ||
                                'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. CATATAN WALI KELAS */}
                {settings.showHomeroomNote && (
                  <div className="mb-5">
                    <h3 className="text-xs font-bold uppercase mb-1.5">
                      D. Catatan Wali Kelas
                    </h3>
                    <div className="border border-slate-800 p-2.5 text-xs leading-relaxed italic">
                      “
                      {student.homeroomNote ||
                        'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.'}
                      ”
                    </div>
                  </div>
                )}

                {/* 6. TANDA TANGAN */}
                {settings.showSignatures && (
                  <div className="mt-6 text-xs">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="mb-1">Mengetahui,</p>
                        <p className="font-semibold">Orang Tua / Wali Peserta Didik</p>
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
                              alt="Tanda Tangan Kepala Sekolah"
                              referrerPolicy="no-referrer"
                              className="max-h-14 object-contain"
                            />
                          )}
                        </div>
                        <p className="font-bold underline">{settings.principalName}</p>
                        <p className="text-[11px] font-mono tabular-nums">
                          NIP/NUPTK. {settings.principalNip || '-'}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1">{settings.reportPlaceDate}</p>
                        <p className="font-semibold">Wali Kelas {student.className}</p>
                        <div className="h-16 flex items-center justify-center">
                          {activeClassObj?.homeroomSignatureUrl && (
                            <img
                              src={activeClassObj.homeroomSignatureUrl}
                              alt="Tanda Tangan Wali Kelas"
                              referrerPolicy="no-referrer"
                              className="max-h-14 object-contain"
                            />
                          )}
                        </div>
                        <p className="font-bold underline">
                          {activeClassObj?.homeroomTeacherName || '-'}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums">
                          NIP/NUPTK. {activeClassObj?.homeroomTeacherNip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
