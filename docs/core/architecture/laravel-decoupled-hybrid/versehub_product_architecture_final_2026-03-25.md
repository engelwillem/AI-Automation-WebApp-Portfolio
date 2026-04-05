# VerseHub Product Architecture Final
**Tanggal:** 25 Maret 2026

Dokumen ini adalah blueprint operasional VerseHub untuk tahap pre-deploy. Fokusnya bukan teori panjang, tetapi keputusan produk, struktur mode, dan pembagian tanggung jawab implementasi yang langsung bisa dipakai.

## 1. Posisi Produk
VerseHub adalah `hybrid spiritual engine`:
- masuk lewat landing yang terasa seperti ruang doa digital
- lanjut ke deep-dive yang mengundang user memilih jalur
- lalu masuk ke reader utilitarian yang stabil untuk kitab, pasal, ayat, mentor, dan ambience

Ini menggabungkan:
- arah `zero-scroll sanctuary` dari `versehub_architecture_update_2026.md`
- disiplin storytelling `/renungan` yang bergerak tahap demi tahap
- fondasi VerseHub sekarang yang sudah punya picker kitab, chapter data, ambience controller, dan mentor API Laravel

## 2. Arsitektur Experience
VerseHub dibagi menjadi 3 mode yang saling menyambung.

### A. Landing Sanctuary
Tujuan:
- memberi first impression emosional
- menahan user di satu layar
- membuat firman terasa diundang, bukan langsung disodorkan sebagai utilitas

Aturan:
- `one-screen / zero-scroll`
- hero quote atau scripture invitation menjadi pusat layar
- CTA utama: `Explore`
- koleksi kitab tetap tersedia dari header dan action rail
- ambience harus terasa hadir sejak landing

### B. Explore Deep Dive
Tujuan:
- menjadi jembatan dari rasa ke tindakan
- seperti `/renungan`, user tidak dilempar ke daftar panjang tanpa konteks

Isi minimum:
- ringkasan tujuan VerseHub hari ini
- jalur masuk ke koleksi kitab
- shortcut ke pasal pembuka
- penjelasan singkat bahwa mentor aktif saat ayat dibuka
- ambience companion sebagai bagian dari perjalanan baca

Aturan:
- berbentuk bottom sheet
- `singleton overlay`: saat audio menu aktif, explore harus menutup; begitu juga sebaliknya

### C. Reader Engine
Tujuan:
- menjadi mode baca yang bersih, stabil, dan cepat
- tidak lagi zero-scroll; reader harus nyaman untuk pasal panjang

Isi minimum:
- header kitab/pasal
- list ayat
- picker kitab/pasal
- ambience tetap aktif
- mentor internal bisa dibuka dari ayat

Aturan:
- verse card dapat menjadi entry point ke mentor
- reader boleh lebih utilitarian, tetapi tetap membawa tone visual VerseHub

## 3. Audio Companion
Sumber audio tetap dari `https://play.lagusion.org/`.

Prinsip:
- audio bukan widget tempelan, tetapi companion saat membaca
- user harus bisa merasakan dua jalur:
  - `vocal + music`
  - `audio-only / instrumental`
- behaviour audio harus aman:
  - gagal source tidak boleh merusak UI
  - overlay audio harus mudah ditutup
  - volume ducking dipakai saat panel lain aktif

Implementasi fase pre-deploy:
- gunakan `AmbienceController` sebagai player utama
- rekomendasi track tetap berbasis mood/day context
- integrasikan controller ke landing dan reader

## 4. Mentor Engine Internal
VerseHub tidak memakai AI API gateway.

Mesin cerdas dibangun dari Laravel:
- verse relationships
- theme mappings
- denominational context
- study path linkage
- template/rule intelligence

Prinsip:
- mentor bukan chatbot umum
- mentor adalah `scripture guide engine`
- jawaban harus scripture-first, data-first, dan hemat biaya

Implementasi fase pre-deploy:
- `MentorPanel` tetap dipakai sebagai antarmuka utama
- ayat di reader membuka mentor panel
- landing hanya menyiapkan bridge, bukan chatbot penuh

## 5. Tanggung Jawab Laravel vs Next.js
Laravel:
- source of truth untuk kitab, pasal, ayat
- mentor insights dan ask flow
- verse relationship, theme, denominational, study path
- OG image dan canonical verse endpoint

Next.js:
- sanctuary landing
- explore sheet
- reader presentation
- picker modal
- audio companion orchestration
- transisi UX dan state antar mode

## 6. Prioritas Implementasi Pre-Deploy
1. Satukan landing dan chapter ke satu arsitektur `VersehubReaderPage`.
2. Kembalikan landing menjadi sanctuary-first, bukan katalog-first.
3. Pertahankan picker kitab/pasal yang sudah stabil.
4. Pastikan chapter route memakai engine yang sama dengan landing.
5. Tanamkan ambience controller di landing dan reader.
6. Jadikan verse card sebagai entry point mentor internal.
7. Pertahankan timeout fetch dan fallback error yang tenang.

## 7. Definisi Selesai Tahap Ini
VerseHub dianggap siap pre-deploy bila:
- `/versehub/id` kembali terasa imersif dan zero-scroll
- user bisa masuk ke kitab/pasal tanpa friction
- `/versehub/id/[chapter]` tetap stabil dan scrollable
- audio Lagusion hadir sebagai companion
- mentor internal dapat dibuka dari ayat
- route landing dan reader tidak lagi berjalan pada arsitektur yang terpecah

Dokumen ini menjadi baseline kerja. Detail visual, copy, dan jalur lanjutan bisa disempurnakan sesudah pre-deploy tanpa mengubah fondasi utamanya.
