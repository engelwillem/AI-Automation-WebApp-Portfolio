# Next Actions

## Immediate
1. Pertahankan folder bernomor sebagai sumber kebenaran current web situation, dan simpan seluruh material historis hanya di `docs/archive/`.
2. Selesaikan parity production yang murni berada di luar repo:
   - fokus utama: stabilkan `https://thechoosentalks.org` karena `www.thechoosentalks.org` sudah hidup di `edgeone-pages`
   - pastikan apex HTTPS tidak lagi reset dan benar-benar mengalir ke host canonical
   - Sanctum / CORS production origin
   - validasi `Authorization` header cPanel
3. Setelah konfigurasi server disentuh, jalankan kembali `Apex Redirect Validation Checklist` dan parity validation yang relevan.
4. **URGENT UI ACTION:** Lakukan perombakan _Visual System Reset_ mengikuti urutan target MVP:
   - [x] Terlebih dahulu bangun dasar shell layout murni di atas `Dawn Theme` (white/slate *soft* padding).
   - [ ] Hapus semua file/folder halaman usang secara fisik (`/library`, `/visitors`) sesuai `navigation-ia.md`.
   - [ ] Mulai hardening individual UI screens (dimulai dari `/today`, lalu maju ke `/versehub`, `/community`, `/paths`).

## After Immediate
1. Tutup placeholder dokumentasi yang memang masih dipakai pada roadmap, architecture, dan testing.
2. Siapkan release-readiness report final setelah blocker server berubah menjadi `PASS`, `CLOSED`, atau `ACCEPTED RISK`.

## Execution Rule
Jangan buka step berikutnya sebelum step sekarang berstatus PASS atau BLOCKED.
