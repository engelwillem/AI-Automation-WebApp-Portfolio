# VerseHub Books Fetch Fix Report

**Tanggal:** 2026-03-15  
**Domain:** VerseHub (`/versehub/[lang]`)  
**Fokus:** Perbaikan kegagalan fetch daftar kitab (`books_fetch_failed`).

---

## 1. Akar Masalah

Berdasarkan audit end-to-end, ditemukan dua penyebab utama kegagalan fitur pemuatan daftar kitab:

1.  **Backend Logic Drift**: Controller `VerseHubReaderController.php` pada backend Laravel menggunakan filter bahasa yang di-hardcode ke `id` (`where('lang', 'id')`), menyebabkan data kosong atau tidak relevan saat dipanggil dari bahasa lain.
2.  **Controller Signature Mismatch**: Metode `chapters` di controller tidak menyertakan parameter `$lang` dalam tanda tangannya, padahal rute API di Laravel mengirimkan parameter tersebut. Hal ini berpotensi menyebabkan kegagalan resolusi parameter oleh Laravel.
3.  **Frontend Error Propagation**: Di sisi Next.js, fungsi `fetchBooks` di `VersehubReaderPage.tsx` menangkap error tetapi tidak memperbarui state `error` halaman secara jujur. Akibatnya, aplikasi "menelan" kesalahan dan memberikan kesan *silent failure*.

---

## 2. File yang Diubah

### Backend (`backend-api`)
- `app/Http/Controllers/VerseHubReaderController.php`:
    - Membuat metode `availableBookCodesCanonical` dan `buildBooks` menerima parameter `$lang`.
    - Memperbarui tanda tangan metode `chapters` agar sesuai dengan parameter rute.
    - Menghapus filter `id` hardcoded pada seluruh query pencarian kitab.

### Frontend (`thechoosentalksnext`)
- `src/features/versehub/pages/VersehubReaderPage.tsx`:
    - Membungkus `fetchBooks` dalam `useCallback` untuk stabilitas referensi.
    - Mengintegrasikan `setError('books_fetch_failed')` saat fetch gagal.
    - Menambahkan UI **Retry State** dengan tombol "Coba Lagi" jika daftar kitab gagal dimuat.

---

## 3. Perubahan Perilaku (Before vs After)

| Fitur | Sebelum (Broken) | Sesudah (Fixed) |
| :--- | :--- | :--- |
| **Pemuatan Kitab** | Sering gagal atau mengembalikan daftar kosong untuk non-ID. | Stabil mengembalikan daftar kitab sesuai bahasa yang diminta. |
| **Error Handling** | Hanya log ke console (`books_fetch_failed`). | Menampilkan layar error "Gagal Memuat Daftar Kitab" di UI. |
| **Resiliensi UI** | Stuck atau silent fail jika backend down. | Memberikan tombol "Coba Lagi" untuk rekoneksi manual. |

---

## 4. Langkah Verifikasi Manual

1.  Jalankan backend Laravel (`port 8000`) dan frontend Next.js (`port 9002`).
2.  Buka `http://localhost:9002/versehub/id`.
3.  Pastikan daftar kitab (Kejadian, Matius, dll) muncul di bagian bawah atau di dalam modal Picker.
4.  Ganti ke `http://localhost:9002/versehub/en` dan pastikan daftar kitab tetap termuat jika datanya ada di database.
5.  (Simulasi Gagal): Matikan server Laravel, lalu refresh halaman. Pastikan muncul UI error "Gagal Memuat Daftar Kitab" dengan tombol retry.

---
**Verdict:** Jalur data untuk daftar kitab Alkitab kini telah **LIVE** dan **SINKRON** di port 9002.
