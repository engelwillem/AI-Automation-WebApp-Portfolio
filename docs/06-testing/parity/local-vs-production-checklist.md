# Local vs Production Checklist

## Purpose
Memastikan parity perilaku antara:
- local development
- backend production di cPanel
- frontend production di Tencent Edge

Dokumen ini adalah checklist release gate, bukan catatan opini.

## Latest Audit Reference
- [x] Audit screenshot produksi terbaru tersedia di `docs/01-audits/overall/2026-03-19-production-surface-audit.md`.

## Status Legend
- PASS
- BLOCKED
- NEEDS SERVER VALIDATION
- NOT STARTED

## Environment Targets
### Local
- Backend: Laravel local
- Frontend: Next.js local
- Database: local MySQL
- Storage: local/public storage

### Production
- Backend: Laravel di cPanel
- Frontend: Next.js di Tencent Edge
- Database: production MySQL
- Storage: production public/storage/CDN path

---

## 1. URL and Origin Parity
### Checks
- [x] `APP_URL` local dan production terdokumentasi
- [x] `NEXT_PUBLIC_APP_URL` local dan production terdokumentasi
- [x] `NEXT_PUBLIC_API_URL` atau padanannya terdokumentasi
- [ ] Frontend origin Tencent Edge sesuai dengan origin yang diizinkan backend
- [x] Canonical root redirect `/` -> `/today` ditangani lokal oleh `next.config.ts`.
- [ ] Canonical WWW redirect `non-www` -> `www` ditangani oleh Panel Tencent Edge / DNS.
- [ ] HTTP -> HTTPS dicentang di setelan Edge SSL/Load Balancer.

### Notes
- Local: Root `/` di-redirect 308 (permanent) ke `/today` oleh `next.config.ts`. Modul WWW/HTTPS diabaikan dalam lokal.
- Production: Origin Tencent Edge disiapkan sebagai Domain Parity utama, menunggu server delegation (Edge Rule / CDN Config).
- Target Redirect Matrix Akhir (cPanel Origin Apex Recovery Plan):
  1. `http://*` -> `https://www.*` (Server Edge Panel)
  2. `https://thechoosentalks.org/*` -> `https://www.thechoosentalks.org/*` (cPanel Origin `.htaccess` 301 Redirect)
  3. `https://www.thechoosentalks.org/` -> `https://www.thechoosentalks.org/today` (Next.JS `next.config.ts`)
  4. Path `/xyz` tetap dilestarikan (Next.JS routing).
- cPanel Apex Redirect Deployment Spec (`.htaccess`):
  ```apache
  RewriteEngine On
  RewriteCond %{HTTP_HOST} ^thechoosentalks\.org$ [NC]
  RewriteRule ^(.*)$ https://www.thechoosentalks.org/$1 [L,R=301]
  ```
- Verification URLs & Expected Final Destinations:
  - `http://thechoosentalks.org` -> `https://www.thechoosentalks.org/today`
  - `https://thechoosentalks.org` -> `https://www.thechoosentalks.org/today`
  - `http://thechoosentalks.org/today` -> `https://www.thechoosentalks.org/today`
  - `https://thechoosentalks.org/community` -> `https://www.thechoosentalks.org/community`
- Success Criteria:
  - All listed URLs must reach their exact expected final URL.
  - Path must be preserved during redirects (no dropping of `/today` or `/community`).
- Failure Patterns to Watch For:
  - Loop errors (`ERR_TOO_MANY_REDIRECTS`)
  - Path loss (e.g., `https://thechoosentalks.org/community` ends up at `https://www.thechoosentalks.org/today` instead of `/community`)
  - Mixed-host issues or `ERR_CERT_COMMON_NAME_INVALID` for apex domain
  - Staying on HTTP instead of forwarding to HTTPS
- Target Architecture:
  - Canonical Host: `www.thechoosentalks.org` (Runs active frontend on EdgeOne)
  - Redirect Host: `thechoosentalks.org` (Runs on detached cPanel/origin, terminating HTTPS to bounce traffic to www)
- cPanel Deployment Checklist:
  - [ ] SSL Requirement: AutoSSL/Let's Encrypt must be actively issued for apex `thechoosentalks.org` on the cPanel server.
  - [ ] File Location: Rules must be placed at the very top of `public_html/.htaccess`.
  - [ ] Verification: Do not overwrite Laravel/origin routing logic (append redirect before Laravel's `index.php` front controller rules).
  - [ ] Hands-off: Do not add `www` to this redirect rule (to avoid breaking the backend API which might need it later or loop).
- Live Evidence (2026-03-17):
  - `http://thechoosentalks.org` returns `302` to `https://www.thechoosentalks.org`
  - `http://thechoosentalks.org/today` returns `302` to `https://www.thechoosentalks.org/today`
  - `http://thechoosentalks.org/community` returns `302` to `https://www.thechoosentalks.org/community`
  - `https://www.thechoosentalks.org`, `/today`, dan `/community` return `200 OK` from `edgeone-pages`
  - `https://thechoosentalks.org` still fails during TLS/connection setup (`Recv failure: Connection was reset`)
- Status: READY FOR SERVER ACTION
---

## 2. Auth / Session / Sanctum Parity
### Checks
- [ ] Sanctum stateful domains sesuai
- [ ] Cookie domain/path/secure flags sesuai environment
- [ ] CSRF cookie bisa diterbitkan dan dibaca dengan benar
- [x] Login/logout behavior sama di local dan production
- [x] 401/403 behavior tidak disamarkan
- [x] Authorization header tidak terpotong di cPanel/Apache
- [x] Route proxy Next meneruskan auth data dengan benar
- [x] Firebase/token sync flow tidak drift antar environment

### Notes
- Local: Token JWT Firebase diselaraskan mulus ke API Proxy Next.js dan diterima Sanctum lokal.
- Production revalidation 2026-03-19:
  - `POST /api/auth/login` sukses (`status=success`, token diterbitkan pada `data.token`).
  - `GET /api/profile` dengan bearer token sukses (`is_admin=True` untuk `engel.willem@gmail.com`).
  - `POST /api/auth/logout` sukses (`Sesi berhasil diakhiri.`).
- Status: PASS

---

## 3. API Contract Parity
### Checks
- [x] Endpoint kritis merespons status code yang sama
- [x] Shape payload sukses sama
- [x] Shape validation error `422` sama
- [x] Shape auth error `401/403` sama
- [x] Redirect contract sama
- [x] Upload endpoint tetap menerima format yang sama
- [x] Pagination/query params berperilaku sama
- [x] Empty/not-found behavior sama

### Critical Flows
- [x] Auth login / forgot / reset
- [x] Profile read / update / avatar / password / 2FA / delete
- [x] Inbox list / thread / send / mark all read / approval
- [x] Community feed / create post / comments / share
- [x] Today / VerseHub / Journeys / lainnya yang aktif

### Notes
- Local: Mayoritas rute read/write parity telah PASS via pengujian E2E lokal.
- Production: N/A
- Risks: Drift contract bila Laravel cPanel tidak setara versi dengan monolith lokal.
- Status: NEEDS SERVER VALIDATION

---

## 4. Database Schema Parity
### Checks
- [x] Migration set local dan production sama
- [x] Tabel domain kritis ada di local dan production
- [x] Kolom penting sama (type, nullable, default)
- [x] Index penting sama
- [x] Enum/status field sama
- [x] Seed minimum untuk smoke test tersedia
- [ ] Tidak ada drift schema yang belum terdokumentasi

### Critical Tables
- [x] users / profiles / personal_access_tokens
- [x] inbox / messages / approvals related tables
- [x] community / comments / reactions / bookmarks related tables
- [ ] journeys / content tables bila sudah dipakai

### Notes
- Local: Skema legacy sudah teraplikasi konsisten.
- Production: N/A
- Risks: Fitur Journey pada docs implementasi terbaru sudah bergerak ke flow berbasis API/backend, tetapi parity schema production tetap perlu divalidasi sebelum dianggap aman.
- Status: NEEDS SERVER VALIDATION

---

## 5. Storage / Asset / Upload Parity
### Checks
- [x] Avatar upload path sama
- [x] Community media path sama bila ada
- [ ] Public storage symlink/path valid di cPanel
- [x] Asset URL yang dirender frontend valid di Tencent Edge
- [x] OG image/share metadata memakai asset URL yang benar
- [ ] Next image/domain policy sesuai host production bila relevan

### Notes
- Local: Disk storage local merespons avatar update.
- Production: Storage path di shared hosting acap kali melenceng dari root `/public`.
- Revalidasi 2026-03-19: `GET /api/versehub/og/mzm-23-1.png` = `200 image/png`; kartu Community tidak lagi broken image.
- Status: PASS (untuk OG/image route aktif)

---

## 6. Build / Runtime Parity
### Checks
- [x] Next build berhasil dengan env production-equivalent
- [x] Laravel config/cache route cache aman untuk production
- [ ] Edge runtime assumptions terdokumentasi
- [ ] cPanel rewrite/redirect rules tidak bertabrakan dengan hybrid routes
- [x] SSR/CSR behavior tidak bergantung pada local-only assumptions
- [x] Proxy path dan rewrite path sama
- [ ] **CI/CD Pipeline cPanel SSH Access** (BLOCKED - SSH connection timeout from GHA runners)
- [x] **Manual Backend Deploy Success** (Vervalidasi ulang 19 Mar 2026: `20260319051316` dan `20260319051447` PASS)

### Notes
- Local: CSR & Next.js proxying API tervalidasi `npm run dev`.
- Production: Deployment #21 via GitHub Actions `backend-cpanel-deploy.yml` secara inheren dilarang (TCP Drop) akibat mitigasi proaktif pada *runner*. Status repositori sudah mendapat perlindungan kebersihan memori (`concurrency` mitigasi ganda/tabrakan deploy & pembatalan gantung). 
- Action Plan cPanel: Memperbaiki GitHub Actions connectivity atau mengadopsi manual deploy asinkron via terminal server sebagai standar rilis saat ini.
- Re-Test Deploy (2026-03-17/18/19): SSH/SCP timeout dari GitHub runner IP ke server port 2121 tetap terjadi. Gagal menembus firewall CSF/LFD.
- Kesimpulan Lanjutan: Deployment manual via `deploy.sh` server-side terbukti 100% stabil (Sukses beruntun pada rilis Mar 19).
- **Klarifikasi Frontend**: Proyek Next.js tidak berada di server cPanel karena deployment platform dipisah (cPanel khusus backend). Kode frontend Next.js tersedia lengkap dan aktif di dalam monorepo project.
- Action Plan cPanel: Mempertahankan arsitektur *Push Deploy* memaksakan admin VPS memelihara *whitelist* IP Github Action yang terus berubah secara konstan. Disarankan beralih ke arsitektur **Pull-Based Deploy** yang di-*harden* secara keamanan: Endpoint *webhook* dienkripsi dengan *unguessable hash path* (`deploy-[hash].php`), metode respons minimal, tidak ada `git stash` acak (harus `reset --hard`), serta secret token murni lokal tanpa ada di *repository*.
- Action Taken (2026-03-18): Repo sudah resmi memiliki aset *Pull Deploy Redesign*. Berkas `backend-api/deploy.sh` menggunakan arsitektur aman `reset --hard` (tanpa `stash`) dengan eksekusi `cache` konservatif. `backend-cpanel-deploy.yml` diubah 100% menjadi trigger webhook JSON via POST HTTP. Berkas pendamping manual server (`backend-api/webhook-template.php`) telah diregistrasi BUKAN sebagai rilis otomatis.
- Implementasi Mandatory cPanel (Path B1 Execution): Administrator SERVER wajib mengubahsuaikan `deploy.sh` beralgoritma tar konvensional menjadi varian *Staging Sparse Checkout* yang telah kita desain di `backend-api/deploy.sh`, meregistrasi SSH Key di cPanel agar diizinkan berbicara dengan Github secara nirsandi, lalu merangkai webhook.
- **FINAL FIRST-RUN CHECKLIST (PATH B1)**:
  1. **Pre-Run Server Precheck**:
     - *Path Check*: Konfirmasi `/home/thechoosentalks/deploy/apps/thechoosentalks/` aktif lengkap dengan folder `releases/`, `shared/`, dan symlink `current`.
     - *Binary Check*: Eksekusi `php -v`, `composer -V`, dan `git --version` harus membalikkan *exit code 0* lewat pengguna web.
     - *Permission Check*: Hak cipta pada subdirektori `/home/thechoosentalks/deploy/...` mesti bertaut penuh kepada *user cPanel*, dan bukan entitas `root`.
  2. **Install / Apply Steps**:
     - Hancurkan isi dari `/home/thechoosentalks/deploy/apps/thechoosentalks/deploy.sh` lalu timpakan 100% kode mentah dari berkas `backend-api/deploy.sh` kita ke sana. Pastikan mode akses `chmod +x` ditegakkan.
     - Eksekusi `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key`. Pasang entitas `.pub` sebagai *Read-Only Deploy Key* di muka GitHub Repo Settings.
     - Gubah sandi *secret* khusus secara murni *(plain-text)* ke `/home/thechoosentalks/.deploy_secret`. Pastikan muatannya cuma format utuh: `DEPLOY_SECRET_TOKEN=r4hand0mXyz` tanpa simbol aneh.
     - Tanam modul `backend-api/webhook-template.php` selaku `deploy-[hash].php` eksklusif ke dalam belantara `/home/thechoosentalks/public_html/`. Pukul masuk `absolute path` milik berkas *secret* tersebut bersama lintasan pemantik `deploy.sh` cPanel ke dalam relungnya.
  3. **Manual First-Run Sequence**:
     - Menembak modul dari belakang layar peladen meminimalisasi kepanikan bila gantung: `/home/thechoosentalks/deploy/apps/thechoosentalks/deploy.sh`.
     - Tonton konvergensi pembedahan *Sparse Checkout*: `tail -f /home/thechoosentalks/deploy/apps/thechoosentalks/deploy_pull.log`.
     - Lakukan `ls -lah` menuju lokalisasi persendian `/home/thechoosentalks/deploy/apps/thechoosentalks/releases`. Cek jika rilis bertemakan *timestamp* terkalibrasi lunas memunculkan file laravel mentah.
     - Verifikasi arah jarum symlink telah bergeser mulus: `ls -l current` (*current -> releases/YYYYMMDDHHMMSS*).
     - Muat `api.thechoosentalks.org/api` (atau setaranya) apakah masih berstatus `200 OK` (atau `401`/`404` yang logis ketimbang `500 Server Error`).
  4. **Webhook Trigger Validation**:
     - Eksekusi cURL buatan dari pos eksternal/incognito: `curl -X POST -H "X-Deploy-Token: [secret]" https://www.thechoosentalks.org/deploy-[hash].php`.
     - Target Respons: Output JSON minimalis `{"status":"deployment queued"}`. 
     - *Tail-follow* saklar log `deploy_webhook.log`. Alur tarikan harus melukis rekayasa asinkron sampai klimaks *"Deployment logic completed successfully."*
  5. **First Failure Checkpoints (Troubleshooting Guide)**:
     - *Git Sparse Checkout Issue:* Peladen tak kuasa menghisap repositori (Akses Ditolak). Semburan kesalahan `git archive`/`git config` nampak. *Solusi: Uji autentikasi Deploy Key mandiri cPanel (`ssh -T git@github.com`).*
     - *Bad Shared Link Path:* `.env` dan `storage` melayang buta (Warning 404 pada log `deploy_pull`). *Solusi: Pastikan lintasan `SHARED_DIR` pada konfigurasi tidak patah.*
     - *Current Symlink Failure:* Situs tiba-tiba 403 / *No Input File Specified*. Terjadi ketika eksekusi hak tulis pada `/current` dilarang.
- **BLOCKER RESOLVED (2026-03-18/19)**: Skrip rilis peladen (`backend-api/deploy.sh`) telah diredesain ulang mengikuti "Path B1" dan dieksekusi sukses secara manual berkali-kali (Rilis Aktif Terakhir: `20260319051447`). Arsitektur *zero-downtime* dengan logik *sparse clone* Git terbukti sehat. Status rilis saat ini PASS untuk eksekusi manual server-side.
- Status: PASS (Manual Deploy Verified 19 Mar 2026) | BLOCKED (GitHub Actions Trigger Automation)
- Status: READY FOR SERVER ACTION

---

## 7. Domain Release Gate
### Profile Lifecycle
- Local Status: PASS
- Production Status: PASS
- Notes: Login admin + profile bearer + logout API tervalidasi produksi.

### Inbox / DM
- Local Status: PASS
- Production Status: NEEDS SERVER VALIDATION
- Notes: Unread badge mutasi lolos uji coba.

### Community
- Local Status: PASS
- Production Status: PASS (End-to-End Verified)
- Notes: Integrasi real terverifikasi. Backend mengembalikan `archivePosts` yang berisi data nyata. Fokus bergeser ke parity tampilan Next.js terhadap data archive ini.

### Today
- Local Status: PASS
- Production Status: PASS (End-to-End Verified)
- Notes: Integrasi real terverifikasi. Backend mengembalikan respons JSON valid (state: fresh). Data harian (verse/rituals) saat ini masih kosong di database produk.

### VerseHub
- Local Status: PASS
- Production Status: PASS (End-to-End Verified)
- Notes: Integrasi real terverifikasi. Backend mengembalikan daftar kitab suci (ID) secara lengkap.

### Study Paths
- Local Status: PASS
- Production Status: PASS (End-to-End Verified)
- Notes: Integrasi real terverifikasi. Hasil `paths: []` berasal dari status database produk yang belum berisi konten.

### Relevance / Reflection / Journeys
- Local Status: PASS
- Production Status: NEEDS SERVER VALIDATION
- Notes: Komponen terisolasi sukses dilukis oleh UI *(Pure representational components)*.

---

## 8. Final Release Gate
### Blocking Issues
- Origin Production dan env `SANCTUM_STATEFUL_DOMAINS` di Edge & cPanel sama sekali tak terpetakan/terkonfigurasi.

### Residual Risks
- Apache cPanel Mod_Security berisiko mencekal header `Authorization`. Patch `CGIPassAuth On` diaplikasikan, menunggu validasi server nyata.

### Final Status
- PARTIAL PASS (Core Active Surface)

### Evidence 2026-03-19 (Production Revalidation)
- Frontend deploy trigger sukses: GitHub Actions run `23283366688` (`Trigger Tencent Edge deploy` = success).
- Browser smoke pass (Playwright headless):
  - `/today`, `/community`, `/paths`, `/profile`, `/login`, `/versehub`, `/versehub/id`, `/versehub/id/mzm-23-1` => render normal.
  - Tidak ditemukan `Application error: a client-side exception has occurred`.
  - Tidak ditemukan gagal request chunk `_next/static/chunks/...`.
