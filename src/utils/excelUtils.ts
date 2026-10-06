import * as XLSX from 'xlsx';
import {
  Student,
  SchoolClass,
  Subject,
  GradeRecord,
  SemesterType,
  BehaviorPredicate,
  Gender,
} from '../types';

export type TemplateKey =
  | 'students'
  | 'classes'
  | 'subjects'
  | 'cp'
  | 'grades'
  | 'attendance'
  | 'behavior'
  | 'homeroom_notes';

export function downloadExcelTemplate(
  type: TemplateKey,
  context?: {
    className?: string;
    subjectName?: string;
    subjectCode?: string;
    students?: Student[];
    subjects?: Subject[];
  }
) {
  const wb = XLSX.utils.book_new();
  const activeClass = context?.className && context.className !== 'Semua Kelas' ? context.className : 'X 1';

  if (type === 'students') {
    const rows = [
      { No: 1, NISN: '0094812091', 'Nama Siswa': 'M. Ridwan Kamil', 'L/P': 'L', Kelas: activeClass },
      { No: 2, NISN: '0094812092', 'Nama Siswa': 'Siti Fatimah Zahra', 'L/P': 'P', Kelas: activeClass },
      { No: 3, NISN: '0094812093', 'Nama Siswa': 'Danang Prasetyo', 'L/P': 'L', Kelas: activeClass },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 32 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Data Siswa');
    XLSX.writeFile(wb, `Template_Data_Siswa_SMA_Maarif_05_${activeClass.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (type === 'classes') {
    const rows = [
      {
        No: 1,
        Kelas: 'X 1',
        'Nama Wali Kelas': 'Ahmad Syafi’i, S.Pd.I',
        'NIP/NUPTK': '19840512 201101 1 004',
        Jabatan: 'Wali Kelas X 1 / Guru PAI',
      },
      {
        No: 2,
        Kelas: 'X 2',
        'Nama Wali Kelas': 'Siti Nurhaliza, S.Pd',
        'NIP/NUPTK': '19880921 201403 2 008',
        Jabatan: 'Wali Kelas X 2 / Guru Bahasa Indonesia',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Data Kelas');
    XLSX.writeFile(wb, 'Template_Data_Kelas_SMA_Maarif_05.xlsx');
    return;
  }

  if (type === 'subjects') {
    const rows = [
      {
        Kode: 'BIND',
        'Mata Pelajaran': 'Bahasa Indonesia',
        Kelas: 'Semua Kelas',
        Guru: 'Siti Nurhaliza, S.Pd',
        'Status Tampil': 'Tampil',
      },
      {
        Kode: 'MAT',
        'Mata Pelajaran': 'Matematika',
        Kelas: 'Semua Kelas',
        Guru: 'Hendri Kurniawan, S.Pd',
        'Status Tampil': 'Tampil',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 28 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Mapel');
    XLSX.writeFile(wb, 'Template_Mata_Pelajaran_SMA_Maarif_05.xlsx');
    return;
  }

  if (type === 'cp') {
    const sourceSubjects = context?.subjects?.length ? context.subjects : [];
    const rows =
      sourceSubjects.length > 0
        ? sourceSubjects.map((s, idx) => ({
            No: idx + 1,
            Kode: s.code,
            'Mata Pelajaran': s.name,
            Kelas: s.className,
            'Capaian Pembelajaran': s.learningOutcome,
          }))
        : [
            {
              No: 1,
              Kode: 'BIND',
              'Mata Pelajaran': 'Bahasa Indonesia',
              Kelas: 'Semua Kelas',
              'Capaian Pembelajaran':
                'Peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, pandangan, atau pesan dalam teks laporan hasil observasi.',
            },
          ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template CP');
    XLSX.writeFile(wb, 'Template_Capaian_Pembelajaran_SMA_Maarif_05.xlsx');
    return;
  }

  if (type === 'grades') {
    const classStudents = (context?.students || []).filter((s) => s.className === activeClass);
    const rows =
      classStudents.length > 0
        ? classStudents.map((s, idx) => ({
            No: idx + 1,
            NISN: s.nisn,
            'Nama Siswa': s.name,
            Kelas: s.className,
            'Mata Pelajaran': context?.subjectName || 'Bahasa Indonesia',
            'Nilai ASTS': 85,
          }))
        : [
            {
              No: 1,
              NISN: '0094812001',
              'Nama Siswa': 'Ahmad Fauzan Al-Farizi',
              Kelas: activeClass,
              'Mata Pelajaran': context?.subjectName || 'Bahasa Indonesia',
              'Nilai ASTS': 88,
            },
          ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 28 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai ASTS');
    XLSX.writeFile(
      wb,
      `Template_Nilai_ASTS_${(context?.subjectCode || 'MAPEL').replace(/\s+/g, '_')}_${activeClass.replace(/\s+/g, '_')}.xlsx`
    );
    return;
  }

  if (type === 'attendance') {
    const classStudents = (context?.students || []).filter((s) => s.className === activeClass);
    const rows =
      classStudents.length > 0
        ? classStudents.map((s, idx) => ({
            No: idx + 1,
            NISN: s.nisn,
            'Nama Siswa': s.name,
            Kelas: s.className,
            Sakit: s.sakit,
            Izin: s.izin,
            Alpa: s.alpa,
          }))
        : [
            {
              No: 1,
              NISN: '0094812001',
              'Nama Siswa': 'Ahmad Fauzan Al-Farizi',
              Kelas: activeClass,
              Sakit: 0,
              Izin: 0,
              Alpa: 0,
            },
          ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Absensi');
    XLSX.writeFile(wb, `Template_Absensi_${activeClass.replace(/\s+/g, '_')}_SMA_Maarif_05.xlsx`);
    return;
  }

  if (type === 'behavior') {
    const classStudents = (context?.students || []).filter((s) => s.className === activeClass);
    const rows =
      classStudents.length > 0
        ? classStudents.map((s, idx) => ({
            No: idx + 1,
            NISN: s.nisn,
            'Nama Siswa': s.name,
            Kelas: s.className,
            Predikat: s.behaviorPredicate,
            'Catatan Perilaku': s.behaviorNote,
          }))
        : [
            {
              No: 1,
              NISN: '0094812001',
              'Nama Siswa': 'Ahmad Fauzan Al-Farizi',
              Kelas: activeClass,
              Predikat: 'Sangat Baik',
              'Catatan Perilaku': 'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
            },
          ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Perilaku');
    XLSX.writeFile(wb, `Template_Perilaku_${activeClass.replace(/\s+/g, '_')}_SMA_Maarif_05.xlsx`);
    return;
  }

  if (type === 'homeroom_notes') {
    const classStudents = (context?.students || []).filter((s) => s.className === activeClass);
    const rows =
      classStudents.length > 0
        ? classStudents.map((s, idx) => ({
            No: idx + 1,
            NISN: s.nisn,
            'Nama Siswa': s.name,
            Kelas: s.className,
            'Catatan Wali Kelas': s.homeroomNote,
          }))
        : [
            {
              No: 1,
              NISN: '0094812001',
              'Nama Siswa': 'Ahmad Fauzan Al-Farizi',
              Kelas: activeClass,
              'Catatan Wali Kelas':
                'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
            },
          ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 65 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Catatan Wali');
    XLSX.writeFile(wb, `Template_Catatan_Wali_Kelas_${activeClass.replace(/\s+/g, '_')}_SMA_Maarif_05.xlsx`);
  }
}

export function exportStudentsToExcel(students: Student[], filterClass: string) {
  const wb = XLSX.utils.book_new();
  const rows = students.map((s, idx) => ({
    No: idx + 1,
    NISN: s.nisn,
    'Nama Siswa': s.name,
    'L/P': s.gender,
    Kelas: s.className,
    Sakit: s.sakit,
    Izin: s.izin,
    Alpa: s.alpa,
    'Predikat Perilaku': s.behaviorPredicate,
    'Catatan Perilaku': s.behaviorNote,
    'Catatan Wali Kelas': s.homeroomNote,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 30 },
    { wch: 6 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 18 },
    { wch: 45 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  const suffix = filterClass === 'Semua Kelas' ? 'Semua_Kelas' : filterClass.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Data_Siswa_SMA_Maarif_05_${suffix}.xlsx`);
}

export function exportLegerToExcel(params: {
  schoolName: string;
  className: string;
  semester: SemesterType;
  academicYear: string;
  homeroomTeacherName: string;
  homeroomTeacherNip: string;
  principalName: string;
  principalNip: string;
  reportPlaceDate: string;
  students: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  showRanking: boolean;
}) {
  const {
    schoolName,
    className,
    semester,
    academicYear,
    homeroomTeacherName,
    homeroomTeacherNip,
    principalName,
    principalNip,
    reportPlaceDate,
    students,
    subjects,
    grades,
    showRanking,
  } = params;

  const wb = XLSX.utils.book_new();

  // Compute averages & rankings
  const studentRows = students.map((student) => {
    const scores: (number | string)[] = [];
    let sum = 0;
    let count = 0;
    subjects.forEach((sub) => {
      const rec = grades.find(
        (g) =>
          g.studentId === student.id &&
          g.subjectId === sub.id &&
          g.semester === semester &&
          g.academicYear === academicYear
      );
      if (rec && rec.astsScore !== null && rec.astsScore !== undefined) {
        scores.push(rec.astsScore);
        sum += rec.astsScore;
        count += 1;
      } else {
        scores.push('');
      }
    });
    const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    return {
      student,
      scores,
      sum,
      avg,
    };
  });

  // Sort copy for ranking
  const sortedByAvg = [...studentRows].sort((a, b) => b.avg - a.avg);
  const rankMap = new Map<string, number>();
  sortedByAvg.forEach((item, idx) => {
    rankMap.set(item.student.id, idx + 1);
  });

  const aoa: (string | number)[][] = [
    [schoolName.toUpperCase()],
    [`LEGER NILAI RAPORT BAYANGAN (ASTS) — KELAS ${className}`],
    [`Semester: ${semester} | Tahun Pelajaran: ${academicYear} | Wali Kelas: ${homeroomTeacherName}`],
    [],
  ];

  const headerRow: string[] = [
    'No',
    'NISN',
    'Nama Siswa',
    'L/P',
    ...subjects.map((s) => `${s.name} (${s.code})`),
    'Jumlah Nilai',
    'Rata-rata',
  ];
  if (showRanking) headerRow.push('Ranking');
  headerRow.push('Sakit', 'Izin', 'Alpa');
  aoa.push(headerRow);

  studentRows.forEach((row, idx) => {
    const dataRow: (string | number)[] = [
      idx + 1,
      row.student.nisn,
      row.student.name,
      row.student.gender,
      ...row.scores,
      row.sum,
      row.avg,
    ];
    if (showRanking) dataRow.push(rankMap.get(row.student.id) || idx + 1);
    dataRow.push(row.student.sakit, row.student.izin, row.student.alpa);
    aoa.push(dataRow);
  });

  // Summary statistics rows
  if (studentRows.length > 0) {
    const avgRow: (string | number)[] = ['', '', 'RATA-RATA MATA PELAJARAN', ''];
    const maxRow: (string | number)[] = ['', '', 'NILAI TERTINGGI', ''];
    const minRow: (string | number)[] = ['', '', 'NILAI TERENDAH', ''];

    subjects.forEach((_sub, sIdx) => {
      const validNums = studentRows
        .map((r) => r.scores[sIdx])
        .filter((v): v is number => typeof v === 'number');
      avgRow.push(
        validNums.length > 0
          ? Number((validNums.reduce((a, b) => a + b, 0) / validNums.length).toFixed(1))
          : '-'
      );
      maxRow.push(validNums.length > 0 ? Math.max(...validNums) : '-');
      minRow.push(validNums.length > 0 ? Math.min(...validNums) : '-');
    });

    aoa.push([]);
    aoa.push(avgRow);
    aoa.push(maxRow);
    aoa.push(minRow);
  }

  aoa.push([]);
  aoa.push(['', 'Mengetahui,', '', '', '', '', reportPlaceDate]);
  aoa.push(['', 'Kepala Sekolah', '', '', '', '', `Wali Kelas ${className}`]);
  aoa.push([]);
  aoa.push([]);
  aoa.push(['', principalName, '', '', '', '', homeroomTeacherName]);
  aoa.push(['', `NIP. ${principalNip || '-'}`, '', '', '', '', `NIP. ${homeroomTeacherNip || '-'}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, `Leger ${className}`);
  XLSX.writeFile(wb, `Leger_Kelas_${className.replace(/\s+/g, '_')}.xlsx`);
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
}

export function normalizeGender(val: unknown): Gender {
  const s = String(val || 'L')
    .trim()
    .toUpperCase();
  return s.startsWith('P') || s.startsWith('W') || s.startsWith('F') ? 'P' : 'L';
}

export function normalizePredicate(val: unknown): BehaviorPredicate {
  const s = String(val || 'Baik').trim().toLowerCase();
  if (s.includes('sangat')) return 'Sangat Baik';
  if (s.includes('cukup')) return 'Cukup';
  if (s.includes('perlu') || s.includes('kurang') || s.includes('bina')) return 'Perlu Pembinaan';
  return 'Baik';
}
