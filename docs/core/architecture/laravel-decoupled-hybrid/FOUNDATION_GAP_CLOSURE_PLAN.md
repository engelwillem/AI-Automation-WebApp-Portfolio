# Foundation Gap Closure Plan

**Tujuan:** Menutup gap teknis fundamental pada area Write Logic, Mentor Data, dan Auth Sync untuk memastikan Next.js beroperasi sebagai hybrid-decoupled app yang stabil sebelum migrasi halaman final dilakukan.

---

## 1. Write Logic Parity (Persistence Engine)

### Current Condition
Banyak komponen interaktif di Next.js (seperti tombol Pray, Bookmark, Comment) hanya menjalankan `console.log` atau menyimpan data sementara di `localStorage`. Backend Laravel memiliki logika `web` routes asli namun belum semua terekspos sebagai API JSON yang siap pakai untuk Next.js.

### Source of Truth
- `backend-api/app/Http/Controllers/MemberPostReactionController.php`
- `backend-api/app/Http/Controllers/MemberPostBookmarkController.php`
- `backend-api/app/Http/Controllers/MemberPostCommentController.php`

### Penyebab Gap
Fokus migrasi awal adalah pada visual render (Read-Only), sehingga alur mutasi data (Write) belum diprioritaskan untuk dihubungkan ke Sanctum API.

### Target Architecture
Seluruh mutasi data dari Next.js harus melalui rute proxy `/api/v1/*` yang mengirimkan token `Authorization: Bearer {sanctum_token}` ke Laravel untuk persistensi ke MySQL.

### Urutan Perbaikan
1.  Standarisasi API response di Laravel untuk aksi mutasi (success/error JSON).
2.  Pembuatan rute proxy di Next.js untuk menangani `POST/PATCH/DELETE`.
3.  Implementasi *Optimistic UI* dengan *Rollback Mechanism* di frontend Next.js untuk meniru kelancaran legacy.

---

## 2. Mentor Data Parity (Scripture Guide)

### Current Condition
`MentorPanel` di Next.js masih menggunakan data statis yang terbatas. Di sisi lain, Laravel memiliki `VerseHubMentorService` yang sangat kaya (Historical context, theme connections, dll.) namun datanya belum mengalir penuh ke API.

### Source of Truth
- `backend-api/app/Services/VerseHubMentorService.php`
- `backend-api/app/Http/Controllers/VerseHubController.php`

### Penyebab Gap
Kompleksitas payload Mentor memerlukan struktur JSON yang dalam yang belum dipetakan penuh di API controller.

### Target Architecture
Satu endpoint tunggal `GET /api/v1/versehub/{lang}/{ref}/mentor` yang mengembalikan objek kaya dari service mentor, mencakup `insights`, `relationships`, `themes`, dan `suggested_paths`.

### Urutan Perbaikan
1.  Expose seluruh metode `VerseHubMentorService` ke dalam `VerseHubReaderController` API.
2.  Update Next.js `MentorPanel` untuk fetch data secara dinamis berdasarkan `verseRef`.
3.  Implementasi alur "Ask the Bible" (POST ask) yang terhubung ke AI driver di Laravel.

---

## 3. Auth & Session Parity (Token Lifecycle)

### Current Condition
Mekanisme pertukaran Firebase ID Token ke Laravel Sanctum token sudah ada namun belum "hardened". Ada risiko sesi "drift" (user login di Firebase tapi token Sanctum expired atau belum tersinkron di beberapa route proxy).

### Source of Truth
- `src/components/FirebaseAuthSync.tsx`
- `backend-api/app/Http/Controllers/Api/V1/FirebaseAuthSyncController.php`

### Penyebab Gap
Belum adanya integrasi `onIdTokenChanged` yang agresif dan penanganan error 401/403 yang otomatis membersihkan `localStorage`.

### Target Architecture
Siklus auth yang "silent" dan "auto-healing": Next.js memastikan token Sanctum selalu valid sebelum melakukan request proxy, dan Laravel memvalidasi status `firebase_uid` pada setiap request API terproteksi.

### Urutan Perbaikan
1.  Hardening `FirebaseAuthSync` untuk menangani token refresh otomatis.
2.  Integrasi middleware `X-Auth` check pada setiap request proxy di `src/lib/proxy-laravel.ts`.
3.  Penanganan sinkronisasi profil (nama/avatar) dari Firebase ke MySQL secara real-time saat sync.

---

## Mocks and Temporary Adapters (The Kill List)

Identifikasi mock yang **WAJIB** dihapus sebelum domain terkait dianggap `PARITY DONE`:

| Mock Location | Fitur | Status |
|---|---|---|
| `src/services/community.service.ts` | `MOCK_POSTS` & `MOCK_COMMENTS` | **MUST REMOVE** |
| `src/app/today/page.tsx` | `fallbackFeed` & `fallbackRituals` | **MUST REMOVE** |
| `src/features/versehub/pages/VersehubReaderPage.tsx` | Manual `setTimeout` data fetch | **MUST REMOVE** |
| `src/components/versehub/MentorPanel.tsx` | Hardcoded `insights` | **MUST REMOVE** |
| `src/app/profile/page.tsx` | Local-only profile state updates | **MUST REMOVE** |

---

## Dependency Map
- **P0**: Auth & Session Parity (Tanpa ini, Write Logic tidak bisa divalidasi).
- **P1**: Write Logic Parity (Dasar untuk interaksi Community dan Activity).
- **P2**: Mentor Data Parity (Pelengkap untuk kedalaman konten VerseHub).

## Definition of Done
Fondasi dianggap tertutup jika:
1.  Tidak ada lagi `console.log` untuk mutasi data utama.
2.  Satu kali login Firebase menghasilkan sesi Sanctum yang valid di MySQL.
3.  Seluruh data Scripture Guide di Next.js identik dengan output `VerseHubMentorService` Laravel.
4.  User bisa melakukan *Bookmark* di Next.js dan datanya muncul di database MySQL backend.
