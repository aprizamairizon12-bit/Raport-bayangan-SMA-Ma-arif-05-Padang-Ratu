import {
  AppDatabaseState,
  SchoolClass,
  Student,
  Subject,
  GradeRecord,
  SchoolSetting,
  UserAccount,
  TeacherAssignment,
  AcademicYear,
} from '../types';
import schoolLogoAsset from '../assets/images/logo_sma_maarif_05_1791301729058.jpg';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'aprizamairizon12@gmail.com';

export const DEFAULT_USERS: UserAccount[] = [
  {
    uid: 'usr_admin_utama',
    email: BOOTSTRAPPED_ADMIN_EMAIL,
    name: 'Administrator Utama (Operator Sekolah)',
    nip: '19720815 200003 1 002',
    role: 'admin',
    homeroomClass: '',
    assignedSubjectIds: [],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_ahmad_syafii',
    email: 'ahmad.syafii@smamaarif05.sch.id',
    name: 'Ahmad Syafi’i, S.Pd.I',
    nip: '19840512 201101 1 004',
    role: 'homeroom',
    homeroomClass: 'X 1',
    assignedSubjectIds: ['sub_pai'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_siti_nurhaliza',
    email: 'siti.nurhaliza@smamaarif05.sch.id',
    name: 'Siti Nurhaliza, S.Pd',
    nip: '19880921 201403 2 008',
    role: 'homeroom',
    homeroomClass: 'X 2',
    assignedSubjectIds: ['sub_bind'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_hendri_kurniawan',
    email: 'hendri.kurniawan@smamaarif05.sch.id',
    name: 'Hendri Kurniawan, S.Pd',
    nip: '19870214 201502 1 002',
    role: 'teacher',
    homeroomClass: 'X 3',
    assignedSubjectIds: ['sub_mat'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_rina_marlina',
    email: 'rina.marlina@smamaarif05.sch.id',
    name: 'Rina Marlina, S.Pd',
    nip: '19910410 201801 2 005',
    role: 'teacher',
    homeroomClass: 'X 4',
    assignedSubjectIds: ['sub_bing'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_mulyadi',
    email: 'mulyadi@smamaarif05.sch.id',
    name: 'Drs. H. Mulyadi, M.Pd',
    nip: '19751103 200501 1 003',
    role: 'homeroom',
    homeroomClass: 'XI 1',
    assignedSubjectIds: ['sub_bio'],
    assignedClasses: ['X 1', 'X 2', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_dewi_sartika',
    email: 'dewi.sartika@smamaarif05.sch.id',
    name: 'Dewi Sartika, S.E',
    nip: '19860718 201201 2 006',
    role: 'homeroom',
    homeroomClass: 'XI 2',
    assignedSubjectIds: ['sub_eko'],
    assignedClasses: ['X 1', 'X 2', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_bambang_wijaya',
    email: 'bambang.wijaya@smamaarif05.sch.id',
    name: 'Bambang Wijaya, S.Si',
    nip: '19820329 200902 1 001',
    role: 'homeroom',
    homeroomClass: 'XII 1',
    assignedSubjectIds: ['sub_fis'],
    assignedClasses: ['X 1', 'X 2', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_lilis_suryani',
    email: 'lilis.suryani@smamaarif05.sch.id',
    name: 'Lilis Suryani, S.Sos',
    nip: '19891205 201601 2 009',
    role: 'homeroom',
    homeroomClass: 'XII 2',
    assignedSubjectIds: ['sub_sos'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_lukman_hakim',
    email: 'lukman.hakim@smamaarif05.sch.id',
    name: 'Lukman Hakim, S.Pd',
    nip: '19850611 201301 1 007',
    role: 'teacher',
    homeroomClass: '',
    assignedSubjectIds: ['sub_ppkn'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_agus_setiawan',
    email: 'agus.setiawan@smamaarif05.sch.id',
    name: 'Agus Setiawan, S.Pd',
    nip: '19831020 201101 1 005',
    role: 'teacher',
    homeroomClass: '',
    assignedSubjectIds: ['sub_sej'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_rizky_pratama',
    email: 'rizky.pratama@smamaarif05.sch.id',
    name: 'Rizky Pratama, S.Kom',
    nip: '19940315 202001 1 003',
    role: 'teacher',
    homeroomClass: '',
    assignedSubjectIds: ['sub_inf'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
  {
    uid: 'usr_abdul_rozak',
    email: 'abdul.rozak@smamaarif05.sch.id',
    name: 'KH. Abdul Rozak, S.Ag',
    nip: '19700402 199801 1 001',
    role: 'teacher',
    homeroomClass: '',
    assignedSubjectIds: ['sub_asw'],
    assignedClasses: ['X 1', 'X 2', 'X 3', 'X 4', 'XI 1', 'XI 2', 'XII 1', 'XII 2'],
    isActive: true,
    active: true,
  },
];

export const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay_2026_ganjil',
    year: '2026/2027',
    semester: 'Ganjil',
    isActive: true,
  },
  {
    id: 'ay_2026_genap',
    year: '2026/2027',
    semester: 'Genap',
    isActive: false,
  },
  {
    id: 'ay_2025_genap',
    year: '2025/2026',
    semester: 'Genap',
    isActive: false,
  },
];

export const DEFAULT_CLASSES: SchoolClass[] = [
  {
    id: 'cls_x1',
    name: 'X 1',
    homeroomTeacherName: 'Ahmad Syafi’i, S.Pd.I',
    homeroomTeacherNip: '19840512 201101 1 004',
    homeroomTeacherRole: 'Wali Kelas X 1 / Guru PAI',
    homeroomUid: 'usr_ahmad_syafii',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_x2',
    name: 'X 2',
    homeroomTeacherName: 'Siti Nurhaliza, S.Pd',
    homeroomTeacherNip: '19880921 201403 2 008',
    homeroomTeacherRole: 'Wali Kelas X 2 / Guru Bahasa Indonesia',
    homeroomUid: 'usr_siti_nurhaliza',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_x3',
    name: 'X 3',
    homeroomTeacherName: 'Hendri Kurniawan, S.Pd',
    homeroomTeacherNip: '19870214 201502 1 002',
    homeroomTeacherRole: 'Wali Kelas X 3 / Guru Matematika',
    homeroomUid: 'usr_hendri_kurniawan',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_x4',
    name: 'X 4',
    homeroomTeacherName: 'Rina Marlina, S.Pd',
    homeroomTeacherNip: '19910410 201801 2 005',
    homeroomTeacherRole: 'Wali Kelas X 4 / Guru Bahasa Inggris',
    homeroomUid: 'usr_rina_marlina',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_xi1',
    name: 'XI 1',
    homeroomTeacherName: 'Drs. H. Mulyadi, M.Pd',
    homeroomTeacherNip: '19751103 200501 1 003',
    homeroomTeacherRole: 'Wali Kelas XI 1 / Guru Biologi',
    homeroomUid: 'usr_mulyadi',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_xi2',
    name: 'XI 2',
    homeroomTeacherName: 'Dewi Sartika, S.E',
    homeroomTeacherNip: '19860718 201201 2 006',
    homeroomTeacherRole: 'Wali Kelas XI 2 / Guru Ekonomi',
    homeroomUid: 'usr_dewi_sartika',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_xii1',
    name: 'XII 1',
    homeroomTeacherName: 'Bambang Wijaya, S.Si',
    homeroomTeacherNip: '19820329 200902 1 001',
    homeroomTeacherRole: 'Wali Kelas XII 1 / Guru Fisika',
    homeroomUid: 'usr_bambang_wijaya',
    homeroomSignatureUrl: '',
  },
  {
    id: 'cls_xii2',
    name: 'XII 2',
    homeroomTeacherName: 'Lilis Suryani, S.Sos',
    homeroomTeacherNip: '19891205 201601 2 009',
    homeroomTeacherRole: 'Wali Kelas XII 2 / Guru Sosiologi',
    homeroomUid: 'usr_lilis_suryani',
    homeroomSignatureUrl: '',
  },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub_pai',
    code: 'PAI',
    name: 'Pendidikan Agama Islam dan Budi Pekerti',
    className: 'Semua Kelas',
    teacherName: 'Ahmad Syafi’i, S.Pd.I',
    teacherUid: 'usr_ahmad_syafii',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menganalisis ayat Al-Qur’an dan Hadis tentang perintah berkompetisi dalam kebaikan dan etos kerja, serta menerapkan akhlak karimah dalam kehidupan sehari-hari di lingkungan sekolah dan masyarakat.',
  },
  {
    id: 'sub_ppkn',
    code: 'PPKN',
    name: 'Pendidikan Pancasila',
    className: 'Semua Kelas',
    teacherName: 'Lukman Hakim, S.Pd',
    teacherUid: 'usr_lukman_hakim',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menerapkan nilai-nilai Pancasila dalam kehidupan bermasyarakat, berbangsa, dan bernegara serta menganalisis hak dan kewajiban warga negara sesuai Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.',
  },
  {
    id: 'sub_bind',
    code: 'BIND',
    name: 'Bahasa Indonesia',
    className: 'Semua Kelas',
    teacherName: 'Siti Nurhaliza, S.Pd',
    teacherUid: 'usr_siti_nurhaliza',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, pandangan, atau pesan dalam teks laporan hasil observasi, teks anekdot, dan teks eksposisi secara kritis, kreatif, dan komunikatif.',
  },
  {
    id: 'sub_mat',
    code: 'MAT',
    name: 'Matematika',
    className: 'Semua Kelas',
    teacherName: 'Hendri Kurniawan, S.Pd',
    teacherUid: 'usr_hendri_kurniawan',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menggeneralisasi sifat-sifat bilangan berpangkat (eksponen) dan logaritma, serta menyelesaikan permasalahan kontekstual yang berkaitan dengan barisan dan deret aritmetika maupun geometri.',
  },
  {
    id: 'sub_bing',
    code: 'BING',
    name: 'Bahasa Inggris',
    className: 'Semua Kelas',
    teacherName: 'Rina Marlina, S.Pd',
    teacherUid: 'usr_rina_marlina',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menggunakan teks lisan, tulisan, dan visual dalam bahasa Inggris untuk berkomunikasi sesuai situasi, tujuan, dan pemirsa pada berbagai jenis teks descriptive, recount, dan narrative.',
  },
  {
    id: 'sub_sej',
    code: 'SEJ',
    name: 'Sejarah',
    className: 'Semua Kelas',
    teacherName: 'Agus Setiawan, S.Pd',
    teacherUid: 'usr_agus_setiawan',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu memahami konsep dasar ilmu sejarah, manusia, ruang, dan waktu (diakronik dan sinkronik), serta menganalisis asal-usul nenek moyang dan jalur rempah di Nusantara.',
  },
  {
    id: 'sub_sos',
    code: 'SOS',
    name: 'Sosiologi',
    className: 'Semua Kelas',
    teacherName: 'Lilis Suryani, S.Sos',
    teacherUid: 'usr_lilis_suryani',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu memahami fungsi sosiologi sebagai ilmu yang mengkaji masyarakat, menganalisis interaksi sosial, tindakan sosial, identitas sosial, serta gejala sosial di lingkungan sekitar.',
  },
  {
    id: 'sub_eko',
    code: 'EKO',
    name: 'Ekonomi',
    className: 'Semua Kelas',
    teacherName: 'Dewi Sartika, S.E',
    teacherUid: 'usr_dewi_sartika',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu memahami konsep dasar ilmu ekonomi, kelangkaan, skala prioritas, biaya peluang, serta menganalisis kegiatan ekonomi produksi, distribusi, dan konsumsi dalam sistem ekonomi Indonesia.',
  },
  {
    id: 'sub_bio',
    code: 'BIO',
    name: 'Biologi',
    className: 'Semua Kelas',
    teacherName: 'Drs. H. Mulyadi, M.Pd',
    teacherUid: 'usr_mulyadi',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu memahami keanekaragaman hayati, klasifikasi makhluk hidup, peranan virus dan bakteri dalam kehidupan, serta merancang solusi pelestarian ekosistem secara ilmiah.',
  },
  {
    id: 'sub_fis',
    code: 'FIS',
    name: 'Fisika',
    className: 'Semua Kelas',
    teacherName: 'Bambang Wijaya, S.Si',
    teacherUid: 'usr_bambang_wijaya',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menerapkan prinsip pengukuran besaran fisis, angka penting, notasi ilmiah, serta menganalisis gerak lurus dan hukum Newton dalam pemecahan masalah sehari-hari.',
  },
  {
    id: 'sub_inf',
    code: 'INF',
    name: 'Informatika',
    className: 'Semua Kelas',
    teacherName: 'Rizky Pratama, S.Kom',
    teacherUid: 'usr_rizky_pratama',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu menerapkan berpikir komputasional (computational thinking), mengintegrasikan aplikasi perkantoran, serta memahami sistem komputer dan jaringan internet secara aman dan etis.',
  },
  {
    id: 'sub_asw',
    code: 'ASW',
    name: 'Ke-NU-an (Aswaja An-Nahdliyah)',
    className: 'Semua Kelas',
    teacherName: 'KH. Abdul Rozak, S.Ag',
    teacherUid: 'usr_abdul_rozak',
    isVisible: true,
    learningOutcome:
      'Peserta didik mampu memahami sejarah kelahiran Nahdlatul Ulama, nilai-nilai dasar Ahlussunnah wal Jamaah (tawasuth, tawazun, tasamuh, amar ma’ruf nahi munkar), serta mengamalkan amaliyah warga Nahdliyin.',
  },
];

export const DEFAULT_STUDENTS: Student[] = [
  // X 1
  {
    id: 'std_x1_1',
    nisn: '0094812001',
    name: 'Ahmad Fauzan Al-Farizi',
    gender: 'L',
    className: 'X 1',
    sakit: 1,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Menunjukkan sikap disiplin, santun kepada guru, dan aktif mengikuti kegiatan pembelajaran.',
    homeroomNote: 'Pertahankan prestasi akademik dan semangat belajar yang tinggi di semester ini.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  {
    id: 'std_x1_2',
    nisn: '0094812002',
    name: 'Aisyah Putri Rahmawati',
    gender: 'P',
    className: 'X 1',
    sakit: 0,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Memiliki tanggung jawab tinggi, jujur, dan aktif berdiskusi di dalam kelas.',
    homeroomNote: 'Prestasi sangat membanggakan, teruslah menjadi teladan yang baik bagi teman-teman sekelas.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  {
    id: 'std_x1_3',
    nisn: '0094812003',
    name: 'Bagas Adi Saputra',
    gender: 'L',
    className: 'X 1',
    sakit: 2,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Menunjukkan sikap sopan dan mampu bekerja sama dengan baik dalam tugas kelompok.',
    homeroomNote: 'Pertahankan semangat belajar dan tingkatkan ketelitian dalam mengerjakan latihan soal.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  {
    id: 'std_x1_4',
    nisn: '0094812004',
    name: 'Citra Lestari Ningsih',
    gender: 'P',
    className: 'X 1',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Disiplin hadir tepat waktu dan sangat tekun dalam menyelesaikan tugas pembelajaran.',
    homeroomNote: 'Kehadiran dan keaktifan belajar sangat baik, terus tingkatkan penguasaan materi eksakta.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  {
    id: 'std_x1_5',
    nisn: '0094812005',
    name: 'Dimas Wahyu Pratama',
    gender: 'L',
    className: 'X 1',
    sakit: 1,
    izin: 2,
    alpa: 1,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Bersikap ramah kepada sesama teman namun perlu meningkatkan fokus saat jam pelajaran berlangsung.',
    homeroomNote: 'Tingkatkan kedisiplinan kehadiran dan kurangi ketidakhadiran tanpa keterangan.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  {
    id: 'std_x1_6',
    nisn: '0094812006',
    name: 'Fitriani Nur Azizah',
    gender: 'P',
    className: 'X 1',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Menunjukkan akhlak mulia, rajin beribadah, dan aktif membantu kerapihan kelas.',
    homeroomNote: 'Pertahankan konsistensi belajar dan terus kembangkan potensi diri di bidang akademik.',
    homeroomUid: 'usr_ahmad_syafii',
  },
  // X 2
  {
    id: 'std_x2_1',
    nisn: '0094812007',
    name: 'Gilang Ramadhan Putra',
    gender: 'L',
    className: 'X 2',
    sakit: 0,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
    homeroomNote: 'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
    homeroomUid: 'usr_siti_nurhaliza',
  },
  {
    id: 'std_x2_2',
    nisn: '0094812008',
    name: 'Hana Khairunnisa',
    gender: 'P',
    className: 'X 2',
    sakit: 1,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Sangat santun, tertib mematuhi tata tertib sekolah, dan berprestasi di kelas.',
    homeroomNote: 'Terus pertahankan prestasi belajar yang sangat baik ini pada ujian akhir semester.',
    homeroomUid: 'usr_siti_nurhaliza',
  },
  {
    id: 'std_x2_3',
    nisn: '0094812009',
    name: 'Irfan Maulana Hakim',
    gender: 'L',
    className: 'X 2',
    sakit: 1,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Aktif dalam diskusi kelas dan menghargai pendapat teman.',
    homeroomNote: 'Tingkatkan waktu belajar mandiri di rumah agar hasil evaluasi semakin optimal.',
    homeroomUid: 'usr_siti_nurhaliza',
  },
  // X 3
  {
    id: 'std_x3_1',
    nisn: '0094812010',
    name: 'Khoirul Anam',
    gender: 'L',
    className: 'X 3',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
    homeroomNote: 'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
    homeroomUid: 'usr_hendri_kurniawan',
  },
  {
    id: 'std_x3_2',
    nisn: '0094812011',
    name: 'Lailaatul Badriyah',
    gender: 'P',
    className: 'X 3',
    sakit: 1,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Tekun, rapi dalam mengerjakan tugas, dan sopan terhadap bapak/ibu guru.',
    homeroomNote: 'Hasil belajar ASTS sangat baik, pertahankan dan terus tingkatkan.',
    homeroomUid: 'usr_hendri_kurniawan',
  },
  // X 4
  {
    id: 'std_x4_1',
    nisn: '0094812012',
    name: 'Muhammad Rizki Hidayat',
    gender: 'L',
    className: 'X 4',
    sakit: 0,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
    homeroomNote: 'Pertahankan semangat belajar dan tingkatkan kedisiplinan dalam mengikuti pembelajaran.',
    homeroomUid: 'usr_rina_marlina',
  },
  {
    id: 'std_x4_2',
    nisn: '0094812013',
    name: 'Nadia Safitri',
    gender: 'P',
    className: 'X 4',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Disiplin, jujur, dan selalu mengumpulkan tugas tepat waktu.',
    homeroomNote: 'Terus tingkatkan keaktifan bertanya di dalam kelas.',
    homeroomUid: 'usr_rina_marlina',
  },
  // XI 1
  {
    id: 'std_xi1_1',
    nisn: '0083711001',
    name: 'Naufal Zaki Mubarak',
    gender: 'L',
    className: 'XI 1',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Menunjukkan kepemimpinan yang baik dan aktif dalam praktikum sains.',
    homeroomNote: 'Pertahankan prestasi akademik dan terus siapkan diri menuju jenjang berikutnya.',
    homeroomUid: 'usr_mulyadi',
  },
  {
    id: 'std_xi1_2',
    nisn: '0083711002',
    name: 'Putri Wulandari',
    gender: 'P',
    className: 'XI 1',
    sakit: 1,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Santun, teliti, dan memiliki motivasi belajar yang tinggi.',
    homeroomNote: 'Hasil evaluasi tengah semester sangat memuaskan, pertahankan!',
    homeroomUid: 'usr_mulyadi',
  },
  // XI 2
  {
    id: 'std_xi2_1',
    nisn: '0083711003',
    name: 'Rafi Ahmad Syahputra',
    gender: 'L',
    className: 'XI 2',
    sakit: 1,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Menunjukkan sikap kerja sama yang baik dalam kegiatan diskusi.',
    homeroomNote: 'Tingkatkan fokus pada mata pelajaran Ekonomi dan Matematika.',
    homeroomUid: 'usr_dewi_sartika',
  },
  {
    id: 'std_xi2_2',
    nisn: '0083711004',
    name: 'Salma Salsabila',
    gender: 'P',
    className: 'XI 2',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Aktif, kreatif, dan selalu menjaga ketertiban kelas.',
    homeroomNote: 'Pertahankan semangat belajar dan terus raih prestasi terbaik.',
    homeroomUid: 'usr_dewi_sartika',
  },
  // XII 1
  {
    id: 'std_xii1_1',
    nisn: '0072610001',
    name: 'Syahrul Gunawan',
    gender: 'L',
    className: 'XII 1',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Dewasa dalam bersikap, disiplin, dan menjadi teladan bagi adik kelas.',
    homeroomNote: 'Fokus persiapkan ujian akhir dan seleksi masuk perguruan tinggi.',
    homeroomUid: 'usr_bambang_wijaya',
  },
  {
    id: 'std_xii1_2',
    nisn: '0072610002',
    name: 'Tiara Andini Zahra',
    gender: 'P',
    className: 'XII 1',
    sakit: 0,
    izin: 1,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Sangat tekun, berakhlak baik, dan konsisten meraih nilai unggul.',
    homeroomNote: 'Pertahankan prestasi gemilang ini hingga kelulusan nanti.',
    homeroomUid: 'usr_bambang_wijaya',
  },
  // XII 2
  {
    id: 'std_xii2_1',
    nisn: '0072610003',
    name: 'Wahyu Hidayatullah',
    gender: 'L',
    className: 'XII 2',
    sakit: 1,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Baik',
    behaviorNote: 'Menunjukkan sikap disiplin dan aktif mengikuti kegiatan pembelajaran.',
    homeroomNote: 'Pertahankan semangat belajar dan tingkatkan persiapan ujian akhir sekolah.',
    homeroomUid: 'usr_lilis_suryani',
  },
  {
    id: 'std_xii2_2',
    nisn: '0072610004',
    name: 'Zahra Aulia Rahma',
    gender: 'P',
    className: 'XII 2',
    sakit: 0,
    izin: 0,
    alpa: 0,
    behaviorPredicate: 'Sangat Baik',
    behaviorNote: 'Disiplin, santun, dan aktif dalam kegiatan literasi sekolah.',
    homeroomNote: 'Teruslah berkarya dan pertahankan nilai akademik yang sangat baik.',
    homeroomUid: 'usr_lilis_suryani',
  },
];

export function buildDefaultTeacherAssignments(
  subjects: Subject[],
  classes: SchoolClass[]
): TeacherAssignment[] {
  const assignments: TeacherAssignment[] = [];
  subjects.forEach((sub) => {
    classes.forEach((cls) => {
      if (sub.className === 'Semua Kelas' || sub.className === cls.name) {
        const cleanCls = cls.name.replace(/\s+/g, '_').toLowerCase();
        assignments.push({
          id: `asg_${sub.id}_${cleanCls}`,
          teacherUid: sub.teacherUid || 'usr_admin_utama',
          teacherName: sub.teacherName,
          subjectId: sub.id,
          className: cls.name,
          academicYear: '2026/2027',
          semester: 'Ganjil',
        });
      }
    });
  });
  return assignments;
}

function buildInitialGrades(students: Student[], subjects: Subject[]): GradeRecord[] {
  const records: GradeRecord[] = [];
  const baseScores = [88, 92, 85, 90, 79, 94, 86, 89, 84, 91, 87, 93];

  students.forEach((student, sIdx) => {
    subjects.forEach((subject, subIdx) => {
      const isIntentionallyEmpty =
        (student.className === 'X 1' && sIdx >= 4 && subIdx >= 10) ||
        (student.className !== 'X 1' && subIdx >= 9);

      if (!isIntentionallyEmpty) {
        const rawScore =
          baseScores[(sIdx * 3 + subIdx * 5) % baseScores.length] + ((sIdx + subIdx) % 5) - 2;
        const score = Math.max(72, Math.min(98, rawScore));
        const cleanCls = student.className.replace(/\s+/g, '_').toLowerCase();
        records.push({
          id: `${student.id}_${subject.id}_Ganjil_2026-2027`,
          studentId: student.id,
          subjectId: subject.id,
          assignmentId: `asg_${subject.id}_${cleanCls}`,
          className: student.className,
          semester: 'Ganjil',
          academicYear: '2026/2027',
          astsScore: score,
          updatedByTeacher: subject.teacherName,
          teacherUid: subject.teacherUid || 'usr_admin_utama',
          updatedAt: '2026-10-06T08:00:00.000Z',
        });
      }
    });
  });

  return records;
}

export const DEFAULT_SETTINGS: SchoolSetting = {
  id: 'main_settings',
  schoolName: 'SMA MA’ARIF 05 PADANG RATU',
  npsn: '10802055',
  address:
    'Jl. KH. Hasyim Asy’ari No. 05, Kec. Padang Ratu, Kab. Lampung Tengah, Provinsi Lampung 34176',
  phone: '(0725) 528105 / 0812-7205-0505',
  email: 'smamaarif05padangratu@gmail.com',
  website: 'www.smamaarif05padangratu.sch.id',
  principalName: 'KH. M. Arifin Mansyur, S.Pd., M.Pd.I',
  principalNip: '19720815 200003 1 002',
  reportPlaceDate: 'Padang Ratu, 16 Oktober 2026',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  paperSize: 'F4', // Ukuran cetak tetap menggunakan kertas F4 (210 × 330 mm)
  orientation: 'Portrait',
  fontFamily: 'Times New Roman',
  fontSize: 11,
  themeColor: '#065f46',
  marginMm: 12,
  logoUrl: schoolLogoAsset,
  secondaryLogoUrl: '',
  principalSignatureUrl: '',
  showLogo: true,
  showCp: true,
  showGrades: true,
  showAttendance: true,
  showBehavior: true,
  showHomeroomNote: true,
  showSignatures: true,
  showRanking: true,
};

export const INITIAL_DATABASE_STATE: AppDatabaseState = {
  users: DEFAULT_USERS,
  teacherAssignments: buildDefaultTeacherAssignments(DEFAULT_SUBJECTS, DEFAULT_CLASSES),
  academicYears: DEFAULT_ACADEMIC_YEARS,
  classes: DEFAULT_CLASSES,
  students: DEFAULT_STUDENTS,
  subjects: DEFAULT_SUBJECTS,
  grades: buildInitialGrades(DEFAULT_STUDENTS, DEFAULT_SUBJECTS),
  settings: DEFAULT_SETTINGS,
  lastUpdated: '2026-10-06T11:00:00.000Z',
};

/**
 * Ensures older saved states without `users`, `teacherAssignments`, or `academicYears`
 * are seamlessly migrated without losing any existing classes, students, subjects, or grades.
 */
export function migrateDatabaseState(raw: Partial<AppDatabaseState>): AppDatabaseState {
  const classes = Array.isArray(raw.classes) && raw.classes.length > 0 ? raw.classes : DEFAULT_CLASSES;
  const subjects =
    Array.isArray(raw.subjects) && raw.subjects.length > 0 ? raw.subjects : DEFAULT_SUBJECTS;
  const students =
    Array.isArray(raw.students) && raw.students.length > 0 ? raw.students : DEFAULT_STUDENTS;
  const grades = Array.isArray(raw.grades) ? raw.grades : INITIAL_DATABASE_STATE.grades;
  const users = Array.isArray(raw.users) && raw.users.length > 0 ? raw.users : DEFAULT_USERS;
  const teacherAssignments =
    Array.isArray(raw.teacherAssignments) && raw.teacherAssignments.length > 0
      ? raw.teacherAssignments
      : buildDefaultTeacherAssignments(subjects, classes);
  const academicYears =
    Array.isArray(raw.academicYears) && raw.academicYears.length > 0
      ? raw.academicYears
      : DEFAULT_ACADEMIC_YEARS;

  const settings: SchoolSetting = {
    ...DEFAULT_SETTINGS,
    ...(raw.settings || {}),
    paperSize: raw.settings?.paperSize || 'F4',
  };

  return {
    users,
    teacherAssignments,
    academicYears,
    classes,
    students,
    subjects,
    grades,
    settings,
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
  };
}
