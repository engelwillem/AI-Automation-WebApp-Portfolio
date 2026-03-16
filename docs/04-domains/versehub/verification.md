# Verification: VerseHub

## Verification Steps
1. Pastikan pengguna mendarat di rute `/versehub/id/kej-1`.
2. Validasi list rute Kitab (Books) via Modal Picker tidak ada yang kosong atau `fetch_failed`.
3. Sentuh setidaknya satu ayat bebas lalu tekan "Favorites" dan "Bookmark" serta periksa indikator _Toasts_ dan _Network request_.
4. (Target Mismatch): *Scroll* laman bab (Chapter) ke paling bawah, pastikan "Pertanyaan Refleksi" sudah sesuai dengan hasil dari *AI Mentor Insight* (bukan baris kata hardcoded "Bagaimana ayat-ayat ini...").
5. Jika `has_reflected` di state Backend diklaim memilikinya, blok ajakan "Tulis Refleksimu" (tombol kompon) otomatis hilang.
6. (NEW) Tekan panitan "Tulis Refleksimu". Pastikan rute _Frontend_ melempar secara akurat ke `/community?intent=reflection...` ketimbang menampilkan modal lokal terisolasi (`<ReflectionComposer>`).

## Status
- **BLOCKED**: Validasi terkini menemukan kegagalan _handoff_ (pelemparan) _CTA End-of-Chapter_ ke sistem parameter Komunitas (`CommunityPage.tsx`), menyebabkan diskoneksi ekosistem _feed_ harian.
