# Current Status

## Update 2026-03-19 (Deploy + Revalidasi Production)

Status surface aktif production sudah bergerak ke **stabil operasional** untuk flow inti. Defect P0/P1 dari audit screenshot sebelumnya sudah ditutup dan direvalidasi ulang setelah deploy.

## Ringkasan Posisi Saat Ini
- [x] Audit bukti screenshot sudah ditulis resmi:
  - `docs/01-audits/overall/2026-03-19-production-surface-audit.md`
- [x] Roadmap eksekusi/checklist sudah dibuat:
  - `docs/02-roadmap/2026-03-19-production-stability-execution-roadmap.md`
- [x] Batch hotfix dieksekusi dan sudah ter-deploy ke production (frontend edge trigger success).
- [x] Validasi lokal build pass (`npm run build` + mirror encoded chunks).
- [x] Revalidasi production berbasis HTTP + Playwright headless sudah dijalankan.

## Integrasi Terverifikasi (End-to-End)
- **Today Integration**: Terverifikasi REAL (bukan mock). Endpoint `/api/v1/today` mengembalikan respons JSON valid dari backend. Kondisi data produksi saat ini minimal.
- **Community Integration**: Terverifikasi REAL (bukan mock). Endpoint `/api/v1/community/posts` mengembalikan data nyata.
  - **Data Shape**: `data.posts` saat ini kosong, namun `data.archivePosts` berisi daftar post nyata (Status: Population Success).
- **Study Paths Integration**: Terverifikasi REAL (bukan mock). Endpoint `/api/v1/study-paths/id` mengembalikan JSON valid (`paths: []`). Status: Integrasi tembus, konten production kosong.
- **VerseHub Integration**: Terverifikasi REAL (bukan mock). Endpoint `/api/v1/versehub/id/books` mengembalikan daftar kitab suci lengkap. Status: Integrasi tembus, data populated.
- **Kesimpulan**: Jalur integrasi frontend-backend untuk seluruh domain utama (Today, Community, Paths, VerseHub) sudah tembus. Masalah utama bukan lagi pada "koneksi", melainkan pada kualitas data produksi dan kesiapan UI menangani state data.

## Defect yang Sudah Ditutup (Production Verified)
- [x] Nav `VerseHub` tidak lagi bergantung ke path root yang 404.
- [x] OG image Community diarahkan ke endpoint proxy aktif + fallback.
- [x] Login tidak lagi parse JSON secara buta terhadap response HTML.
- [x] Login flow menyimpan bearer token agar profile tidak stuck guest.
- [x] Logout profile merevoke token ke backend lalu clear sesi lokal.
- [x] Backend login mengeluarkan token (`data.token`) untuk kontrak decoupled.
- [x] Halaman dynamic VerseHub tidak lagi memakai pola params yang rentan crash.
- [x] Browser runtime tidak lagi melempar `ChunkLoadError` pada surface aktif.

## Gate yang Sudah Ditutup
- [x] Deploy patch frontend ke production (`main` commit: `f957dee`, `9180ebc`).
- [x] Verifikasi akun admin di production API:
  - login sukses untuk `engel.willem@gmail.com`
  - `GET /api/profile` mengembalikan `is_admin=True`
  - logout API sukses.
- [x] Uji ulang path screenshot kritis hingga clean pass (`/today`, `/community`, `/paths`, `/profile`, `/login`, `/versehub`, `/versehub/id`, `/versehub/id/mzm-23-1`).

## Residual Notes
- Masih ada warning ringan non-blocking pada transisi RSC tertentu (fallback browser navigation), namun tidak memblokir flow user dan tidak memunculkan halaman error putih.
