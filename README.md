# Patuhdiri

Panel Tracking Unggahan Dokumen Kinerja Instansi — Bagian Organisasi Sekretariat
Daerah Kabupaten Indragiri Hulu.

Aplikasi untuk OPD menginput link Google Drive dokumen SAKIP tahunan, diverifikasi
oleh Bagian Organisasi, dan dipantau oleh APIP (Inspektorat). Database memakai
Google Sheet, backend berupa Google Apps Script Web App.

## Struktur proyek

```
patuhdiri-app/
├── public/              ikon & favicon
├── src/
│   ├── App.jsx          seluruh UI (Dashboard, Input OPD, Verifikasi, APIP)
│   ├── api.js           client fetch ke Apps Script Web App
│   ├── main.jsx
│   └── index.css
├── .env.example          contoh variabel lingkungan
└── package.json
```

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env     # isi VITE_API_URL dengan URL Web App Apps Script kamu
npm run dev
```

## Build untuk produksi

```bash
npm run build
```

Hasil build ada di folder `dist/`.

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **New Project** → import repo ini.
3. Framework preset: **Vite** (otomatis terdeteksi).
4. Tambahkan Environment Variable:
   - `VITE_API_URL` = URL Web App Apps Script (Deploy → New deployment → Web app di Google Apps Script).
5. Deploy.

## Backend (Google Apps Script)

File `Code.gs` (dari percakapan sebelumnya) berisi seluruh endpoint:

- `GET ?action=opd` — daftar OPD aktif
- `GET ?action=dokumen` — daftar jenis dokumen SAKIP
- `GET ?action=verifikator` — daftar verifikator aktif
- `GET ?action=data&opd_id=&tahun=` — checklist dokumen 1 OPD
- `GET ?action=pending&tahun=` — daftar submission yang perlu diverifikasi
- `GET ?action=dashboard&tahun=` — ringkasan kelengkapan per OPD
- `GET ?action=apip` — semua dokumen yang sudah disubmit lintas OPD (read-only, untuk APIP)
- `POST action=submit` — simpan/update link dokumen dari OPD
- `POST action=cancel` — batalkan submit dokumen
- `POST action=verify` — simpan/update hasil verifikasi

### Struktur Google Sheet yang dibutuhkan

| Sheet | Kolom |
|---|---|
| `Master_OPD` | id_opd, nama_opd, singkatan, aktif, kode_akses |
| `Master_Dokumen` | kode_dokumen, katagori, nama_dokumen |
| `Verifikator` | nama, pin, aktif |
| `Submission` | timestamp, tahun, opd_id, kode_dokumen, link_gdrive, catatan_opd |
| `Verifikasi` | timestamp, tahun, opd_id, kode_dokumen, status, catatan, verifikator |

> Pastikan kolom `catatan_opd` sudah ditambahkan di sheet `Submission` (kolom ke-6).

## Catatan

- Tahun pelaporan aktif diset lewat konstanta `TAHUN` di `src/App.jsx`.
- Jadwal buka/tutup dokumen Triwulan diatur lewat `TRIWULAN_MAP` di `src/App.jsx` —
  sesuaikan kalau kode dokumen berubah setelah koordinasi dengan Inspektorat.
