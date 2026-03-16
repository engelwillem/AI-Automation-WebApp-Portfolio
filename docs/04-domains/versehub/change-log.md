# Changelog Domain (VerseHub)

## [Parity Audit Phase] - 2026-03-17

### Ditambahkan
- File dokumentasi inisial untuk melacak matriks paritas, daftar blokade dan kesenjangan (mismatch).
- Mengamankan kontrak pembacaan struktur payload balasan backend (`VerseHubReaderController` vs `VersehubReaderPage`).

### Diketahui (Mismatches / Known Issues)
- _State_ dinamika refleksi `reflection_question` dan `has_reflected` sengaja dibiarkan keras (*hard-coded*) di sisi antarmuka dan belum ditangkap dari pembongkaran data bawaan endpoint `loadChapter()`. (DISELESAIKAN)

## [Reflection Consistency Patch] - 2026-03-17

### Diubah
- Menggantikan pertanyaan refleksi _hard-coded_ di `VersehubReaderPage.tsx` menjadi pertanyaan dinamis sesuai payload (_reflection_question_).
- Mencegat render ulang `<EndOfChapterPrompt>` jika _state_ pengguna sudah disahkan oleh server pernah menulis `has_reflected`.

## [Community Transition Patch] - 2026-03-17

### Diubah
- Mengarahkan fungsional _button_ "Tulis Refleksimu" pada `<EndOfChapterPrompt>` menuju `/community?intent=reflection` menggunakan parameter `ref` dan `text`.
- Menghapus `<ReflectionComposer>` yang sebelumnya membuat formulir eksklusif tertutup secara lokal (_isolated loop_).
