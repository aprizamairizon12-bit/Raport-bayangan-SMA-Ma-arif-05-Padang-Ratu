import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  RefreshCw,
  Check,
  Settings,
  Image as ImageIcon,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import {
  AppDatabaseState,
  SchoolSetting,
  PaperSizeType,
  OrientationType,
  SemesterType,
} from '../types';
import {
  downloadExcelTemplate,
  exportStudentsToExcel,
  TemplateKey,
} from '../utils/excelUtils';

interface TemplatesViewProps {
  dbState: AppDatabaseState;
  selectedClass: string;
  notify: (msg: string) => void;
}

export const ExcelTemplatesView: React.FC<TemplatesViewProps> = ({
  dbState,
  selectedClass,
  notify,
}) => {
  const templates: {
    key: TemplateKey;
    title: string;
    desc: string;
    columns: string;
  }[] = [
    {
      key: 'students',
      title: '1. Template Data Siswa',
      desc: 'Format standar import data peserta didik baru atau per kelas.',
      columns: 'No · NISN · Nama Siswa · L/P · Kelas',
    },
    {
      key: 'classes',
      title: '2. Template Data Kelas & Wali Kelas',
      desc: 'Format standar import daftar kelas beserta nama & NIP wali kelas.',
      columns: 'No · Kelas · Nama Wali Kelas · NIP/NUPTK · Jabatan',
    },
    {
      key: 'subjects',
      title: '3. Template Mata Pelajaran',
      desc: 'Format standar import daftar mata pelajaran dan guru pengampu.',
      columns: 'Kode · Mata Pelajaran · Kelas · Guru · Status Tampil',
    },
    {
      key: 'cp',
      title: '4. Template Capaian Pembelajaran (CP)',
      desc: 'Format standar import narasi Capaian Pembelajaran lengkap setiap mapel.',
      columns: 'No · Kode · Mata Pelajaran · Kelas · Capaian Pembelajaran',
    },
    {
      key: 'grades',
      title: '5. Template Nilai ASTS',
      desc: 'Format standar pengisian nilai Asesmen Sumatif Tengah Semester (0–100).',
      columns: 'No · NISN · Nama Siswa · Kelas · Mata Pelajaran · Nilai ASTS',
    },
    {
      key: 'attendance',
      title: '6. Template Absensi Siswa',
      desc: 'Format standar rekapitulasi jumlah hari Sakit, Izin, dan Alpa.',
      columns: 'No · NISN · Nama Siswa · Kelas · Sakit · Izin · Alpa',
    },
    {
      key: 'behavior',
      title: '7. Template Perilaku Siswa',
      desc: 'Format standar penilaian predikat sikap dan catatan perilaku siswa.',
      columns: 'No · NISN · Nama Siswa · Kelas · Predikat · Catatan Perilaku',
    },
    {
      key: 'homeroom_notes',
      title: '8. Template Catatan Wali Kelas',
      desc: 'Format standar pengisian catatan evaluasi dan motivasi wali kelas.',
      columns: 'No · NISN · Nama Siswa · Kelas · Catatan Wali Kelas',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Pusat Unduhan Template Microsoft Excel (.xlsx)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Unduh template resmi yang sudah disesuaikan dengan struktur kolom aplikasi{' '}
            {dbState.settings.schoolName}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.key}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">{tpl.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{tpl.desc}</p>
              <div className="mt-3 text-xs text-slate-500 font-mono">
                Kolom: {tpl.columns}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  downloadExcelTemplate(tpl.key, {
                    className: selectedClass,
                    students: dbState.students,
                    subjects: dbState.subjects,
                  });
                  notify(`${tpl.title} berhasil diunduh.`);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Template Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ReportSettingsViewProps {
  settings: SchoolSetting;
  onUpdateSettings: (partial: Partial<SchoolSetting>) => void;
  notify: (msg: string) => void;
}

export const ReportSettingsView: React.FC<ReportSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  notify,
}) => {
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'secondaryLogoUrl' | 'principalSignatureUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateSettings({ [field]: String(reader.result || '') });
      notify('Gambar berhasil diperbarui dan disimpan ke database.');
    };
    reader.readAsDataURL(file);
  };

  const toggleItems: {
    key: keyof Pick<
      SchoolSetting,
      | 'showLogo'
      | 'showCp'
      | 'showGrades'
      | 'showAttendance'
      | 'showBehavior'
      | 'showHomeroomNote'
      | 'showSignatures'
      | 'showRanking'
    >;
    label: string;
    desc: string;
  }[] = [
    { key: 'showLogo', label: 'Tampilkan Logo Sekolah', desc: 'Logo utama dan logo tambahan pada kop raport & leger' },
    { key: 'showCp', label: 'Tampilkan Capaian Pembelajaran (CP)', desc: 'Kolom deskripsi CP lengkap di tabel nilai raport' },
    { key: 'showGrades', label: 'Tampilkan Nilai Angka ASTS', desc: 'Kolom nilai kuantitatif 0–100 pada raport' },
    { key: 'showAttendance', label: 'Tampilkan Tabel Absensi', desc: 'Rekap jumlah hari Sakit, Izin, dan Alpa' },
    { key: 'showBehavior', label: 'Tampilkan Penilaian Perilaku', desc: 'Predikat sikap dan catatan perilaku siswa' },
    { key: 'showHomeroomNote', label: 'Tampilkan Catatan Wali Kelas', desc: 'Kotak evaluasi dan motivasi wali kelas' },
    { key: 'showSignatures', label: 'Tampilkan Blok Tanda Tangan', desc: 'Tanda tangan Orang Tua, Wali Kelas, dan Kepala Sekolah' },
    { key: 'showRanking', label: 'Tampilkan Ranking Kelas', desc: 'Peringkat siswa di kelas pada Raport Bayangan & Leger' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Pengaturan Identitas Sekolah & Tata Letak Raport
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Semua perubahan pengaturan otomatis tersimpan ke database online dan langsung diterapkan pada Raport Bayangan serta Leger Nilai.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identitas Sekolah */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            1. Identitas Sekolah & Kepala Sekolah
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Sekolah
              </label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => onUpdateSettings({ schoolName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NPSN Sekolah
              </label>
              <input
                type="text"
                value={settings.npsn}
                onChange={(e) => onUpdateSettings({ npsn: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => onUpdateSettings({ phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Lengkap Sekolah
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => onUpdateSettings({ address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => onUpdateSettings({ email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Website Sekolah
              </label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => onUpdateSettings({ website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.principalName}
                onChange={(e) => onUpdateSettings({ principalName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP / NUPTK Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.principalNip}
                onChange={(e) => onUpdateSettings({ principalNip: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tahun Pelajaran Aktif
              </label>
              <input
                type="text"
                value={settings.academicYear}
                onChange={(e) => onUpdateSettings({ academicYear: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Semester Aktif
              </label>
              <select
                value={settings.semester}
                onChange={(e) =>
                  onUpdateSettings({ semester: e.target.value as SemesterType })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat & Tanggal Cetak Raport / Leger
              </label>
              <input
                type="text"
                value={settings.reportPlaceDate}
                onChange={(e) => onUpdateSettings({ reportPlaceDate: e.target.value })}
                placeholder="Contoh: Padang Ratu, 16 Oktober 2026"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Upload Logo & Signature */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Logo Utama Sekolah</span>
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Ubah Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logoUrl')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Logo Tambahan (Kanan)</span>
              {settings.secondaryLogoUrl ? (
                <img
                  src={settings.secondaryLogoUrl}
                  alt="Logo Tambahan"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
                  Kosong
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'secondaryLogoUrl')}
                    className="hidden"
                  />
                </label>
                {settings.secondaryLogoUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ secondaryLogoUrl: '' })}
                    className="px-2 py-1.5 text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Tanda Tangan Kepsek</span>
              {settings.principalSignatureUrl ? (
                <img
                  src={settings.principalSignatureUrl}
                  alt="TTD Kepala Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-24 h-16 object-contain"
                />
              ) : (
                <div className="w-24 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
                  Belum Ada
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload TTD
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'principalSignatureUrl')}
                    className="hidden"
                  />
                </label>
                {settings.principalSignatureUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ principalSignatureUrl: '' })}
                    className="px-2 py-1.5 text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ukuran Kertas, Tipografi & Saklar ON/OFF */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              2. Kertas, Orientasi & Tipografi
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ukuran Kertas
                </label>
                <select
                  value={settings.paperSize}
                  onChange={(e) =>
                    onUpdateSettings({ paperSize: e.target.value as PaperSizeType })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="F4">F4 / Folio (215 × 330 mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Orientasi Halaman
                </label>
                <select
                  value={settings.orientation}
                  onChange={(e) =>
                    onUpdateSettings({
                      orientation: e.target.value as OrientationType,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="Portrait">Portrait (Tegak)</option>
                  <option value="Landscape">Landscape (Mendatar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jenis Huruf (Font)
                </label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ukuran Font ({settings.fontSize} pt)
                </label>
                <input
                  type="number"
                  min={8}
                  max={18}
                  value={settings.fontSize}
                  onChange={(e) =>
                    onUpdateSettings({
                      fontSize: Math.max(8, Math.min(18, Number(e.target.value) || 11)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Margin Kertas ({settings.marginMm} mm)
                </label>
                <input
                  type="number"
                  min={5}
                  max={35}
                  value={settings.marginMm}
                  onChange={(e) =>
                    onUpdateSettings({
                      marginMm: Math.max(5, Math.min(35, Number(e.target.value) || 15)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Warna Aksen Kop & Tabel
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.themeColor}
                    onChange={(e) => onUpdateSettings({ themeColor: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600">
                    {settings.themeColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              3. Saklar Tampilan Komponen Raport (ON/OFF)
            </h3>

            <div className="space-y-2.5">
              {toggleItems.map((item) => {
                const isOn = Boolean(settings[item.key]);
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-none"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ [item.key]: !isOn })}
                      className={`px-3 py-1 text-xs font-bold rounded-md border transition-colors cursor-pointer ${
                        isOn
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BackupRestoreViewProps {
  dbState: AppDatabaseState;
  onRestoreState: (newState: AppDatabaseState) => void;
  onResetDefault: () => void;
  onManualCloudSync: () => Promise<void>;
  isSyncing: boolean;
  notify: (msg: string) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  dbState,
  onRestoreState,
  onResetDefault,
  onManualCloudSync,
  isSyncing,
  notify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadJsonBackup = () => {
    const payload = JSON.stringify(dbState, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Backup_Database_Raport_SMA_Maarif_05_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('File Backup Database (.json) berhasil diunduh.');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as AppDatabaseState;
        if (
          !Array.isArray(parsed.classes) ||
          !Array.isArray(parsed.students) ||
          !Array.isArray(parsed.subjects) ||
          !Array.isArray(parsed.grades) ||
          !parsed.settings
        ) {
          notify('Format file backup tidak valid.');
          return;
        }
        onRestoreState({
          ...parsed,
          lastUpdated: new Date().toISOString(),
        });
        notify('Database berhasil di-restore dan disinkronkan ke Cloud!');
      } catch {
        notify('Gagal membaca file backup JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Backup, Restore & Sinkronisasi Database Cloud
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Amankan seluruh data kelas, siswa, mata pelajaran, CP, nilai ASTS, absensi, dan pengaturan raport SMA Ma’arif 05 Padang Ratu.
          </p>
        </div>
        <button
          type="button"
          onClick={onManualCloudSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Cloud className="w-4 h-4" />
          {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Cloud Sekarang'}
        </button>
      </div>

      {/* Ringkasan Isi Database Saat Ini */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Kelas Tersimpan</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {dbState.classes.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Data Siswa</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {dbState.students.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Mata Pelajaran & CP</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {dbState.subjects.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Record Nilai ASTS</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
            {dbState.grades.filter((g) => g.astsScore !== null).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Backup */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              1. Backup & Download Database
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Unduh salinan lengkap seluruh database sekolah (Kelas, Wali Kelas, Siswa, Mapel, CP, Nilai ASTS, Absensi, Perilaku, dan Pengaturan) ke perangkat Anda.
            </p>
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Full Backup (.JSON)
            </button>
            <button
              type="button"
              onClick={() => {
                exportStudentsToExcel(dbState.students, 'Semua Kelas');
                notify('Data Siswa & Rekap Absensi/Perilaku diunduh ke Excel.');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Arsip Siswa ke Excel (.XLSX)
            </button>
          </div>
        </div>

        {/* Card 2: Restore */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              2. Restore / Import Data Backup
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Pulihkan kembali data dari file backup (`.json`) yang pernah diunduh sebelumnya. Data otomatis diperbarui di database cloud untuk seluruh guru.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Pilih File Backup (.JSON) & Restore
            </button>
          </div>
        </div>

        {/* Card 3: Reset / Seed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              3. Muat Ulang Data Standar Sekolah
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Kembalikan database ke data awal standar SMA Ma’arif 05 Padang Ratu (8 Kelas X–XII, 12 Mata Pelajaran, CP Kurikulum Merdeka, dan sampel siswa).
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onResetDefault}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Data Standar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
