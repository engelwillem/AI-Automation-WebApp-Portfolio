# Open Blockers

## Active Blockers

### 1. Community Smart Composer Unlinked Parameters
- root cause: `CommunityComposer.tsx` belum diimplementasikan untuk menangkap React `useSearchParams` URL `?intent=xyz&ref=abc`.
- file terkait: `src/features/community/components/CommunityComposer.tsx`
- dampak: Komunitas tidak bisa dipakai untuk menyambung Refleksi atau Doa dari halaman Journey/VerseHub.
- langkah verifikasi: Patch parameter intent di Next.js form payload, lalu kirim Feed baru dan cek *Network request 201*.
- status: **BLOCKED**

### 2. Authorization Header cPanel Restriction Risk
- root cause: cPanel shared hosting (Apache) acap memangkas HTTP Header `Authorization: Bearer` jika `CGIPassAuth On` tidak disematkan di folder *root* server.
- file terkait: `backend-api/public/.htaccess` dan `src/lib/proxy-laravel.ts`.
- dampak: Autentikasi lintas server *hybrid* ini (*Token sync Next.js -> Laravel*) bisa berstatus 401 Unauthenticated ketika `deploy` tanpa konfirmasi.
- langkah verifikasi: Hit staging server cPanel menggunakan Postman via rute otentikasi.
- status: **NEEDS SERVER VALIDATION**

### 3. Stateful Sanctum / CORS Missing Server Origins
- root cause: Berkas `.env` (Legacy dan Local) belum mendefinisikan origin Tencent Edge (*app.thechoosentalks.com*) pada konfigurasi `SANCTUM_STATEFUL_DOMAINS` dan `CORS_ALLOWED_ORIGINS`.
- file terkait: `backend-api/.env`
- dampak: Form submit atau *Fetch API* dari sisi browser publik dipastikan terkena pemblokiran CORS policy *Failed to Fetch*.
- langkah verifikasi: Rilis Next.js UI ke sub-domain Tencent, coba masuk dengan akun lokal valid. Pastikan *Console logs* hijau.
- status: **NEEDS SERVER VALIDATION**

## Notes
Setiap blocker harus terus dipantau dan statusnya harus dinaikkan dari BLOCKED/NV menjadi PASS/CLOSED pada lembar ini beserta `06-testing/parity/*-diff-log.md` terkait.
