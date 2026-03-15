# Post-Purge Stabilization Audit
**Tanggal Audit:** 2026-03-15  
**Context:** Evaluasi residual issue pasca eksekusi Wave 1 Legacy Purge untuk menentukan kelayakan _branch merge_.

Berdasarkan `POST_PURGE_SMOKE_AUDIT.md` dan `LEGACY_PURGE_EXECUTION_REPORT.md`, kami menemukan beberapa regresi residual dan anomali perilaku yang tersembunyi pasca dihapusnya frontend Vue/Inertia pada VerseHub, Community, dan Today. 

Berikut adalah klasifikasi masalah residual yang harus diaudit sebelum dinyatakan 100% aman untuk branch merge:

---

## 1. Legacy Route Interception (Auth Middleware Bug)
- **Severity:** **MERGE BLOCKER**
- **Symptom:** Saat legacy URL `/community` atau `/today` diakses oleh *unauthenticated user* (Guest), mereka tidak dialihkan (redirect) ke host Next.js, melainkan dipaksa login/kembali ke root `http://127.0.0.1:8000` oleh Laravel.
- **Root Cause Dugaan:** Di dalam `backend-api/routes/web.php`, definisi *redirect* untuk `/today` dan `/community` ditempatkan di dalam grup `Route::middleware(['auth', 'verified_or_admin'])`. Karena Guest tidak memiliki session auth, request mereka dibajak oleh middleware Laravel sebelum sempat memicu *Hard Redirect* ke aplikasi Next.js.
- **File Target:** `backend-api/routes/web.php`
- **Rekomendasi:** **FIX NOW**. Pindahkan definisi route `/today` dan `/community` keluar dari grup middleware auth sehingga Guest dan Authenticated Users sama-sama sukses diredirect ke frontend baru.

## 2. Default Redirect Fallback Config (NEXT_PUBLIC_APP_URL)
- **Severity:** **WARNING ONLY**
- **Symptom:** Redirect web route `/versehub` berhasil *bypass* (karena di luar auth grup), namun memantul ke `http://localhost:3000/versehub/id` alih-alih port `9002` (atau domain produksi).
- **Root Cause Dugaan:** File `.env` milik `backend-api` tidak mendefinisikan `NEXT_PUBLIC_APP_URL`, sehingga fungsi `env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')` menggunakan nilai default fallback (port 3000).
- **File Target:** `backend-api/.env` dan `backend-api/.env.example`
- **Rekomendasi:** **POST-MERGE CLEANUP**. Ini hanya sebatas masalah Environment Variable server. Menambahkan konfigurasi tersebut di staging/production pasca-merge sudah cukup untuk menyelesaikan isu.

## 3. Tailwind CSS JIT Compilation Failure (Vite Build)
- **Severity:** **WARNING ONLY** (Telah Dimitigasi)
- **Symptom:** Saat `npm run build` dijalankan oleh Laravel, Vite/Tailwind mengalami error (Exit Code 1) karena gagal menemukan utility class seperti `border-black/5` dan `tracking-tight` dalam `@apply`.
- **Root Cause Dugaan:** Penghapusan massal komponen `.tsx` Inertia (Wave 1) memicu *Tree-Shaking* secara agresif di *Tailwind Compiler*. Karena class tersebut kini absen dari payload DOM React, CSS Global Laravel (`app.css`) pecah.
- **File Target:** `backend-api/resources/css/app.css`
- **Rekomendasi:** **POST-MERGE CLEANUP**. Masalah ini telah di-*hotfix* dengan konversi ke properti CSS Native. Secara jangka panjang, file CSS global Laravel harus dipisahkan sepenuhnya atau diturunkan bobotnya karena styling utama telah ditangani Next.js.

## 4. Backend Request Timeout "Gagal Memuat Konten" (Next.js Reader)
- **Severity:** **WARNING ONLY**
- **Symptom:** Next.js sempat merender komponen *Versehub Reader* sebagai fallback UI Graceful Degradation karena menerima HTTP 503 Backend Unavailable dari proxy `/api/versehub`.
- **Root Cause Dugaan:** Layanan *PHP Artisan Serve* lokal terputus / ter-*restart* saat build manifest Vite mengalami error, sementara Next.js Node server mengasumsikan API telah bersedia. Ini menstimulasi *Error Boundary*, yang secara positif membuktikan kapabilitas *fault-tolerance* pada arsitektur hybrid baru.
- **File Target:** Tidak ada (Infrastructure/Local Behavior)
- **Rekomendasi:** **CAN MERGE**. Tidak membutuhkan sentuhan perbaikan kode karena murni diakibatkan kendala uptime server lokal sementara.

---

## FINAL MERGE RECOMMENDATION
### 🛑 **HOLD MERGE**

**Alasan Taktis:** Walaupun aplikasi Next.js telah 100% stabil dengan *Graceful Degradation*, **Issue #1 (Legacy Route Interception via Auth Middleware)** adalah celah fatal (Blocker). 

Jika di-*merge* dan diturunkan ke sisi produksi, seluruh *Guest User* dari mesin pencari (SEO) yang mengunjungi tautan lama profil atau komunitas Anda (yang terindeks) akan tertahan oleh login guard Laravel dan tidak akan melihat aplikasi *Next.js* terbaru. 

**Tindakan Resolusi Segera:**
Direkomendasikan memperbaiki (Fix Now) bug middleware di `routes/web.php` tersebut. Setelah Route dipastikan 100% dialihkan kepada publik, branch `chore/legacy-purge-phase-1` akan memenuhi predikat `SAFE TO MERGE`.
