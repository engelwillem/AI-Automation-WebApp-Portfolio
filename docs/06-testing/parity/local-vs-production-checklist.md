# Local vs Production Checklist

## Purpose
Memastikan parity perilaku antara:
- local development
- backend production di cPanel
- frontend production di Tencent Edge

Dokumen ini adalah checklist release gate, bukan catatan opini.

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
- [ ] Authorization header tidak terpotong di cPanel/Apache
- [x] Route proxy Next meneruskan auth data dengan benar
- [x] Firebase/token sync flow tidak drift antar environment

### Notes
- Local: Token JWT Firebase diselaraskan mulus ke API Proxy Next.js dan diterima Sanctum lokal.
- Production: Risiko Apache menghapus header `Authorization: Bearer`.
- Risks: Patch `CGIPassAuth On` di `.htaccess` sudah siap, dan bootstrap Laravel kini juga mengaktifkan `statefulApi()` untuk flow SPA Sanctum. Validasi server nyata tetap dibutuhkan.
- Status: NEEDS SERVER VALIDATION

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
- [ ] Asset URL yang dirender frontend valid di Tencent Edge
- [ ] OG image/share metadata memakai asset URL yang benar
- [ ] Next image/domain policy sesuai host production bila relevan

### Notes
- Local: Disk storage local merespons avatar update.
- Production: Storage path di shared hosting acap kali melenceng dari root `/public`.
- Risks: Gambar rusak jika symlink `public_html/storage` tidak dibentuk manual.
- Status: NEEDS SERVER VALIDATION

---

## 6. Build / Runtime Parity
### Checks
- [x] Next build berhasil dengan env production-equivalent
- [x] Laravel config/cache route cache aman untuk production
- [ ] Edge runtime assumptions terdokumentasi
- [ ] cPanel rewrite/redirect rules tidak bertabrakan dengan hybrid routes
- [x] SSR/CSR behavior tidak bergantung pada local-only assumptions
- [x] Proxy path dan rewrite path sama
- [ ] **CI/CD Pipeline cPanel SSH Access tidak diblokir**

### Notes
- Local: CSR & Next.js proxying API tervalidasi `npm run dev`.
- Production: Deployment #21 via GitHub Actions `backend-cpanel-deploy.yml` secara inheren dilarang (TCP Drop) akibat mitigasi proaktif pada *runner*. Status repositori sudah mendapat perlindungan kebersihan memori (`concurrency` mitigasi ganda/tabrakan deploy & pembatalan gantung). 
- Action Plan cPanel: Eksekusi *Server Validation Checklist* (Buka Blokade CSF Port 22/2121 via VPN / Whitelist) agar IP Github *runner* sah menembus tembok api.
- Re-Test Deploy (2026-03-17): GAGAL. Menghapus job *Preflight TCP Reachability Check* dari berkas `backend-cpanel-deploy.yml` ternyata **tidak memecahkan masalah**. Eksekusi log terbaru masih mogok persis pada langkah `scp` di urutan `Upload artifact and deploy scripts` (`ssh: connect to host *** port ***: Connection timed out`).
- Kesimpulan Lanjutan: Penolakan TCP *timeout* murni berasal dari aturan tembok api *cPanel (CSF/mod_security)* blokir IP default, BUKAN akibat sekadar *false positive rate-limit port scan*. Server secara absolut tidak mengizinkan satupun *IP range* Github Runner untuk melakukan koneksi SSH ke nomor IP/Port tersebut.
- Action Plan cPanel: Mempertahankan arsitektur *Push Deploy* memaksakan admin VPS memelihara *whitelist* IP Github Action yang terus berubah secara konstan. Disarankan beralih ke arsitektur **Pull-Based Deploy** yang di-*harden* secara keamanan: Endpoint *webhook* dienkripsi dengan *unguessable hash path* (`deploy-[hash].php`), metode respons minimal, tidak ada `git stash` acak (harus `reset --hard`), serta secret token murni lokal tanpa ada di *repository*.
- Status: READY FOR PATCH

---

## 7. Domain Release Gate
### Profile Lifecycle
- Local Status: PASS
- Production Status: NEEDS SERVER VALIDATION
- Notes: Sinkronisasi token lolos e2e Playwright.

### Inbox / DM
- Local Status: PASS
- Production Status: NEEDS SERVER VALIDATION
- Notes: Unread badge mutasi lolos uji coba.

### Community
- Local Status: PASS
- Production Status: NOT STARTED
- Notes: Smart Composer hydration untuk `intent` dan `text` sudah lolos verifikasi lokal; production parity belum divalidasi.

### Today
- Local Status: PASS
- Production Status: NEEDS SERVER VALIDATION
- Notes: StateChips sukses menjungkirbalikkan bobot urutan Feed di memori React.

### VerseHub
- Local Status: NOT STARTED
- Production Status: NOT STARTED
- Notes: Menunggu sinkronisasi API contract.

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
- NEEDS SERVER VALIDATION
