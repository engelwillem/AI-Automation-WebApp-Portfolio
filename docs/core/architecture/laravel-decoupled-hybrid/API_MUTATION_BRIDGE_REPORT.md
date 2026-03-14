# API Mutation Bridge Report

**Tanggal:** 2026-03-13  
**Status:** IMPLEMENTED (Batch 0 - Write Logic Priority)

## 1. Action yang Dihardening
- **Pray (Like)**: Aksi memberikan dukungan doa pada postingan komunitas.
- **Bookmark (Save)**: Aksi menyimpan postingan ke jurnal perjalanan spiritual.

## 2. File yang Diubah
- `src/services/community.service.ts`: Peningkatan keandalan penanganan error dan pembersihan token.
- `src/features/community/pages/CommunityPage.tsx`: Integrasi UI feed komunitas dengan API nyata.
- `src/app/today/components/feed/UserPostCard.tsx`: Integrasi kartu post user di dashboard Today.
- `src/app/today/components/feed/PrayerRequestCard.tsx`: Integrasi kartu permohonan doa di dashboard Today.
- `src/app/today/components/feed/SystemReflectionCard.tsx`: Integrasi kartu refleksi sistem.

## 3. Endpoint/Proxy yang Dipakai
- `POST /api/community/posts/[id]/pray` -> Meneruskan ke Laravel `/api/v1/community/posts/{id}/pray`
- `POST /api/community/posts/[id]/bookmark` -> Meneruskan ke Laravel `/api/v1/community/posts/{id}/bookmark`

## 4. Mock/Fake Logic yang Dihapus
- **Manual Counter Manipulation**: Penghapusan logika `likes: p.counts.likes + 1` di sisi client. Angka sekarang 100% mengikuti kalkulasi server.
- **Dummy Success Simulation**: Menghilangkan status sukses palsu yang tidak melakukan request jaringan.

## 5. Perilaku Sebelum vs Sesudah
| Fitur | Sebelum (Mock) | Sesudah (Real) |
|---|---|---|
| **Persistensi** | Hilang saat halaman di-refresh. | Tersimpan permanen di database MySQL. |
| **Auth State** | Bisa diklik tanpa login (hanya log konsol). | Memeriksa token; redirect ke landing jika tidak berwenang. |
| **Data Integrity** | Client dan Server bisa berbeda angka. | Client melakukan sinkronisasi ulang dengan data server setelah aksi. |

## 6. Known Limitations
- Tidak ada indikasi loading (spinner) pada tombol saat proses tulis berlangsung (menggunakan desain "Instan/Optimistic").
- Belum ada pesan error spesifik (Toast) jika database backend sedang sibuk atau offline.

## 7. Langkah Verifikasi Manual
1. Pastikan Anda sudah Login di aplikasi.
2. Buka tab **Community**.
3. Klik tombol **Amin** (Pray) pada salah satu postingan.
4. Refresh halaman: Status "Amin" (warna hijau) harus tetap aktif.
5. Ulangi hal yang sama untuk tombol **Bookmark**.
6. Logout, lalu login kembali: Seluruh data interaksi Anda harus tetap muncul sesuai kondisi terakhir di database.
