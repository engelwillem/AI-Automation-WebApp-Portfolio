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
- [ ] Redirect backend selalu mengarah ke frontend origin yang benar
- [ ] Share URL / OG URL memakai host production yang benar

### Notes
- Local: Host sudah disetel ke `localhost:9002` dan `127.0.0.1:8000`.
- Production: Origin Tencent Edge belum di-whitelist di `CORS_ALLOWED_ORIGINS` cPanel.
- Risks: Preflight OPTIONS request bisa dicekal oleh CORS cPanel jika tak dikonfigurasi.
- Status: NEEDS SERVER VALIDATION

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
- Risks: Membutuhkan `CGIPassAuth On` di `.htaccess`.
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
- [ ] Community feed / create post / comments / share (Blocked di sisi frontend parsing intent parameternya)
- [x] Today / VerseHub / Journeys / lainnya yang aktif

### Notes
- Local: Mayoritas rute read/write parity telah PASS via pengujian E2E lokal.
- Production: N/A
- Risks: Drift contract bila Laravel cPanel tidak setara versi dengan monolith lokal.
- Status: BLOCKED

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
- Risks: Penambahan fitur Journey saat ini memotong DB (hanya mengandalkan Local Storage), jika akan naik ke server harus ada skema tabel `user_journeys` baru.
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

### Notes
- Local: CSR & Next.js proxying API tervalidasi `npm run dev`.
- Production: N/A
- Risks: Next.js API Routes (Server Actions) yang dijadikan proxy auth token performanya di Tencent Edge Function belum dipastikan.
- Status: NEEDS SERVER VALIDATION

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
- Local Status: BLOCKED
- Production Status: NOT STARTED
- Notes: Fitur "Smart Composer" gagal mengurai `intent` URL, sehingga konteks Doa/Refleksi tidak terkirim di Request Payload.

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
- `Community Smart Composer` tak bisa menangkap parameter Intent di lokal.
- Origin Production dan env `SANCTUM_STATEFUL_DOMAINS` di Edge & cPanel sama sekali tak terpetakan/terkonfigurasi.

### Residual Risks
- Apache cPanel Mod_Security berisiko mencekal header `Authorization: Bearer` untuk seluruh endpoint hibrida.

### Final Status
- BLOCKED
