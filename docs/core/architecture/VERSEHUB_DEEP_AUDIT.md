# VERSEHUB DEEP AUDIT
Status: Active Working Audit
Last Updated: 2026-04-05
Owner Lens: Senior Product Engineer / Frontend Architect / UX Systems

## 1. Executive Summary
VerseHub telah melewati empat gelombang patch berurutan untuk memperbaiki fondasi pengalaman membaca: audio mobile, struktur route-reader, payload mentor, dan parity UX dengan modul `/renungan`. Audit ini mendokumentasikan kondisi terkini secara menyeluruh agar VerseHub tidak lagi dipelihara sebagai kumpulan patch terpisah, melainkan sebagai sistem produk yang koheren.

Kesimpulan utamanya:
- Fragmentasi reader lama sudah dipangkas. Route `[slug]` kini menjadi delegator tipis.
- `VersehubReaderPage` sekarang berperan sebagai single source of truth untuk landing, chapter, dan verse mode.
- `AmbienceController` sudah di-hardening untuk iOS/mobile autoplay, cleanup audio engine, dan menu audio yang bisa dikendalikan dari luar.
- `MentorPanel` kini membawa konteks mood, intent, dan screen context ke payload AI.
- Flow `/renungan` ke `/versehub/id` sudah memiliki jembatan UX yang lebih halus lewat auto-open Explore.
- Visual language VerseHub sekarang lebih dekat ke modul ritual harian: grain, bloom, glass, tipe editorial, dan motion calm.

Masih ada risiko yang perlu terus dijaga:
- Route verse mode dan chapter mode kini hidup dalam satu file besar; secara fungsional lebih rapi, tetapi ukuran file `VersehubReaderPage.tsx` masih tinggi.
- Validasi UX paling kritis tetap harus terus dilakukan di mobile browser nyata, terutama iOS Safari untuk audio unlock, scroll-hide chrome, dan overlay stacking.

## 2. Scope Audit
File inti yang terdampak dalam fase patch ini:
- `src/app/versehub/[lang]/[slug]/page.tsx`
- `src/features/versehub/pages/VersehubReaderPage.tsx`
- `src/components/versehub/AmbienceController.tsx`
- `src/components/versehub/MentorPanel.tsx`
- `src/features/today-ritual/components/TodayDailyRitualScreen.tsx`

Tujuan audit:
- Mendokumentasikan root problem awal.
- Mencatat patch yang sudah diterapkan.
- Menjelaskan arsitektur final saat ini.
- Menjadi dasar QA, parity checking, dan patch lanjutan.

## 3. Problem History Before Patches
Sebelum rangkaian patch dilakukan, VerseHub mengalami empat kelas masalah besar.

### 3.1 Audio Instability
Gejala:
- Audio ambience sering gagal play di iOS/Safari.
- Muncul risiko `NotSupportedError` atau `NotAllowedError`.
- Track lama bisa “tinggal” di background saat URL track berubah.
- Cross-fade berpotensi terasa flicker atau bocor saat mute.

Root cause:
- `audio.play()` dipanggil terlalu optimistis tanpa penanganan promise rejection yang konsisten.
- Pergantian `targetedTrackUrl` belum membersihkan engine yang tidak aktif secara disiplin.
- Tidak ada fallback eksplisit untuk kondisi yang membutuhkan user gesture.

### 3.2 Layout Fragility on Mobile
Gejala:
- Playlist ambience terpotong di layar kecil.
- Reader dan landing masih memakai `h-screen` / `min-h-screen`, sehingga rawan mismatch terhadap URL bar mobile.
- Padding bawah masih hardcoded, membuat area baca dan overlay tidak selalu aman terhadap home indicator.

Root cause:
- Ketergantungan pada ukuran viewport statis.
- Safe area belum dijadikan bagian dari formula layout inti.

### 3.3 Reader Fragmentation
Gejala:
- Terdapat duplikasi besar antara route `[slug]` dan feature page modular.
- Sulit memastikan behavior chapter/verse/landing konsisten.
- Risiko perbedaan bugfix antara legacy route logic dan feature logic.

Root cause:
- Legacy `ChapterReaderPage` tetap hidup di route `[slug]`.
- Arsitektur belum benar-benar mendorong satu pusat logika reader.

### 3.4 UX Flow & Data Context Gaps
Gejala:
- Mentor belum benar-benar memahami keadaan emosional user dari UI.
- Flow dari ritual harian ke VerseHub belum cukup terpandu.
- Kontrol yang terlalu banyak di layar membuat pengalaman baca terasa lebih “aplikasi utilitarian” daripada “sanctuary”.

Root cause:
- Payload mentor terlalu tipis.
- Overlay/CTA antar modul belum memiliki bridge state yang disengaja.
- Kontrol fungsional masih tersebar sebagai tombol individual.

## 4. Patch Timeline

### PATCH-01: Audio Engine & Layout Stabilization
Fokus:
- Memperbaiki lifecycle audio.
- Menangani fallback autoplay/iOS.
- Menstabilkan panel ambience di mobile kecil.

Perubahan penting:
- Semua pemanggilan `audio.play()` dibungkus helper defensif.
- Ditambahkan `requiresUserGesture` dan mekanisme retry pada interaksi berikutnya.
- Ditambahkan `cleanupAudioElement()` dan `primeAudioElement()` agar engine lama di-pause, `src=""`, lalu `load()`.
- Playlist ambience memakai viewport-aware width dan safe-area-aware bottom offset.
- `max-h` playlist dibuat scrollable.
- Timeout / state sync volume diperbaiki untuk mencegah leak suara saat mute.

Hasil:
- Ambience jauh lebih tahan terhadap iOS autoplay policy.
- Zombie audio berkurang.
- Panel playlist lebih stabil di iPhone kecil.

### PATCH-02: Structural Unification & 100dvh Layout
Fokus:
- Menghapus fragmentasi route reader.
- Menstandarkan layout ke `100dvh`.
- Menyatukan semua mode reader ke feature page tunggal.

Perubahan penting:
- `src/app/versehub/[lang]/[slug]/page.tsx` dipangkas menjadi delegator tipis.
- Legacy `ChapterReaderPage` dihapus.
- `VersehubReaderPage` kini menangani:
  - `landing`
  - `chapter`
  - `verse`
- Semua view penting dimigrasikan ke `h-[100dvh]` / `min-h-[100dvh]`.
- Padding bawah menggunakan formula berbasis `env(safe-area-inset-bottom, 24px)`.

Hasil:
- Reader punya single source of truth.
- Risiko regression akibat route duplikatif turun drastis.
- Layout mobile menjadi lebih iOS-native.

### PATCH-03: Contextual Mentor & Ritual-to-Explore Flow
Fokus:
- Memperkaya payload mentor.
- Menghapus ghosting text pada Today Ritual.
- Menghubungkan ritual selesai ke Explore VerseHub.

Perubahan penting:
- `MentorPanel` sekarang mengirim:
  - `question`
  - `verse_id`
  - `mood`
  - `intent: "deep_study"`
  - `screen_context: "versehub_reader"`
- Mentor diberi subtitle mood-aware untuk konteks emosional.
- `TodayDailyRitualScreen` kini memakai stage machine sederhana:
  - `intro`
  - `reflect`
  - `meditation`
  - `complete`
- `activeActionText` dipakai untuk memastikan teks tahap lama tidak menumpuk saat transisi.
- Dari ritual selesai, user bisa masuk ke VerseHub dengan flag session `tct:versehub:auto-open=explore`.
- `VersehubReaderPage` membaca flag ini dan membuka Explore otomatis sekali.

Hasil:
- Mentor menjadi lebih kontekstual.
- Ghosting transisi misi/action step berhenti.
- Perjalanan dari ritual ke eksplorasi firman terasa lebih natural.

### PATCH-04: The Sanctuary Experience
Fokus:
- Visual parity dengan `/renungan`.
- Chrome auto-hide saat membaca.
- Konsolidasi kontrol ke satu control center.
- Tipografi editorial.

Perubahan penting:
- Ditambahkan grain/noise layer fixed dan bloom halus seperti di ritual harian.
- Header chapter/verse kini memakai greeting naratif + tanggal kapital ala `TodayHeader`.
- Ditambahkan kicker: `EKSPLORASI FIRMAN HARI INI`.
- Header dan floating control menggunakan scroll-triggered hide/show dengan motion calm.
- Teks ayat diperbesar ke rentang editorial dengan line-height lega.
- Control individual disatukan ke satu tombol plus yang membuka menu aksi:
  - Mentor
  - Explore
  - Kitab
  - Audio
- `AmbienceController` diperluas agar bisa dikontrol secara eksternal (`menuOpen`, `hideTrigger`).

Hasil:
- VerseHub terasa lebih premium, tenang, dan fokus pada teks.
- Visual noise berkurang.
- Kontrol tetap mudah diakses, tetapi tidak mendominasi layar.

## 5. Current Architecture Snapshot

### 5.1 Route Layer
`src/app/versehub/[lang]/[slug]/page.tsx`

Peran saat ini:
- Menentukan apakah slug adalah chapter atau verse.
- Meneruskan props ke `VersehubReaderPage`.

Nilai arsitektural:
- Route sekarang bersih.
- Tidak lagi menjadi tempat logika data utama.

### 5.2 Reader Feature Layer
`src/features/versehub/pages/VersehubReaderPage.tsx`

Peran saat ini:
- Menjadi pusat state dan render untuk semua mode VerseHub utama.
- Menangani:
  - loading/error
  - landing sanctuary
  - chapter reader
  - verse focus mode
  - overlay explore
  - overlay picker
  - mentor handoff
  - audio integration
  - auto-open explore dari ritual
  - scroll-hide chrome
  - control center

Catatan:
- Ini adalah file pusat sistem saat ini.
- Besar file cukup tinggi, tetapi konsistensi behavior sekarang jauh lebih kuat daripada struktur split sebelumnya.

### 5.3 Audio Layer
`src/components/versehub/AmbienceController.tsx`

Peran saat ini:
- Mengelola dua engine `HTMLAudioElement` untuk cross-fade.
- Menangani retry user gesture.
- Menjaga cleanup audio.
- Menyediakan UI playlist dan volume.
- Bisa dibuka/tutup dari parent melalui prop controlled.

Keuntungan:
- Audio engine tidak lagi terikat ke trigger UI internal saja.
- Cocok untuk control center tunggal.

### 5.4 Mentor Layer
`src/components/versehub/MentorPanel.tsx`

Peran saat ini:
- Menampilkan insight ayat.
- Menangani pertanyaan AI.
- Menyertakan konteks emosi user.

Nilai produk:
- Mentor tidak lagi terasa stateless.
- Lebih cocok untuk pengalaman pendampingan rohani.

### 5.5 Ritual Bridge Layer
`src/features/today-ritual/components/TodayDailyRitualScreen.tsx`

Peran saat ini:
- Menjadi “pintu masuk emosional” ke VerseHub.
- Menyimpan context transition ke Explore.

Nilai produk:
- `/renungan` dan `/versehub/id` kini terasa seperti bagian dari satu sistem, bukan dua halaman yang kebetulan bertetangga.

## 6. Detailed Change Log by Concern

### 6.1 Audio Concern
Sudah:
- play rejection handling
- user gesture retry
- src cleanup
- controlled audio menu
- mobile-friendly playlist sizing

Belum final:
- Belum ada telemetry untuk failure rate autoplay per device/browser.
- Belum ada explicit analytics event untuk “tap to play fallback”.

### 6.2 Reader Concern
Sudah:
- unified route
- mode landing/chapter/verse
- improved mobile viewport handling
- safer bottom spacing

Belum final:
- `VersehubReaderPage` masih kandidat kuat untuk dipecah lagi setelah fase stabilisasi, misalnya ke:
  - `VersehubLandingView`
  - `VersehubChapterView`
  - `VersehubVerseView`
  - `VersehubControlCenter`

### 6.3 UX Concern
Sudah:
- sanctuary visual language
- chrome auto-hide
- editorial typography
- consolidated controls
- contextual greeting

Belum final:
- Belum ada reduced-motion specific tuning untuk semua motion baru di VerseHub.
- Belum ada UX metrics untuk memastikan scroll-hide tidak membingungkan first-time user.

### 6.4 Mentor Concern
Sudah:
- mood-aware payload
- mood-aware subtitle
- explicit `intent` dan `screen_context`

Belum final:
- Belum ada context memory lintas sesi.
- Belum ada adaptive starter question berdasarkan mood atau mode baca.

## 7. UX Parity Matrix: /renungan vs /versehub/id

Elemen yang sekarang sudah searah:
- Grain/noise texture tipis di background.
- Radial bloom lembut pada kanvas.
- Glass surface ringan dengan `ring-black/5`.
- Motion calm, tidak agresif.
- Greeting dan tanggal dengan karakter editorial.
- Safe-area-aware spacing.
- Nuansa “quiet premium” alih-alih dashboard utilitarian.

Elemen yang masih berbeda secara sadar:
- `/renungan` lebih ritualized dan linear.
- `/versehub/id` tetap perlu affordance eksplorasi dan navigasi kitab.
- VerseHub tetap lebih padat fitur karena harus memfasilitasi explore, mentor, audio, dan picker.

Kesimpulan:
- Parity sekarang bukan berarti identik 1:1, tetapi memiliki bahasa visual dan ritme interaksi yang konsisten.

## 8. QA Matrix

### 8.1 Audio QA
- iOS Safari: tap pertama, fallback tap kedua, audio harus benar-benar start.
- iOS Safari: ganti track saat play, tidak ada double audio.
- iOS Safari: mute ke 0, tidak ada leak pelan.
- Android Chrome: play/pause/ganti track tetap stabil.
- Audio menu yang dibuka dari control center tidak boleh memunculkan trigger ganda.

### 8.2 Reader QA
- `/versehub/id` landing membuka Explore otomatis bila datang dari ritual.
- `/versehub/id/<book>-<chapter>` harus memuat chapter dan mentor dengan benar.
- `/versehub/id/<book>-<chapter>-<verse>` harus memuat verse mode, share, like, bookmark.
- Safe area bawah harus aman pada device dengan home indicator.
- Tidak boleh ada double scrollbar pada landing/chapter/verse mode.

### 8.3 Serenity QA
- Scroll down saat membaca: header/control center mundur pelan.
- Scroll up atau berhenti: chrome kembali muncul organik.
- Overlay explore, picker, mentor, audio tidak boleh saling ghosting.
- Typography ayat tetap nyaman dibaca dalam paragraf panjang.

### 8.4 Ritual Bridge QA
- Selesaikan ritual, tekan CTA ke VerseHub.
- Landing VerseHub harus membuka Explore otomatis satu kali.
- Setelah overlay ditutup dan halaman di-refresh, Explore tidak boleh auto-open lagi.

## 9. Validation Commands Used / Recommended
Untuk menjaga parity lokal dan production, command yang relevan:

```powershell
npm run typecheck
npm run build
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\smoke-production.ps1 -BaseUrl https://www.thechoosentalks.org
```

Smoke lokal yang direkomendasikan:
- buka `/renungan`
- buka `/versehub/id`
- buka chapter VerseHub
- buka verse mode
- trigger Explore, Picker, Audio, Mentor

## 10. Efficiency Audit
Perubahan struktural utama yang sudah dilakukan:
- Route `[slug]` dipangkas dari legacy logic panjang menjadi delegator tipis.
- Dead code `ChapterReaderPage` dihapus.
- State/action terpecah kini lebih terkonsolidasi ke `VersehubReaderPage`.

Estimasi dampak:
- Debt arsitektur berkurang signifikan.
- Risiko fix yang “hanya hidup di satu route” turun drastis.
- QA sekarang lebih terfokus karena locus of truth jauh lebih jelas.

## 11. Open Risks & Next Recommendations

### Risiko aktif
- `VersehubReaderPage.tsx` masih besar dan memikul banyak tanggung jawab.
- Banyak transisi halus baru berarti QA visual di device nyata tetap wajib.
- Audio mobile selalu punya variabilitas browser yang lebih tinggi daripada desktop.

### Rekomendasi next pass
1. Pecah `VersehubReaderPage` ke subview terpisah tanpa memecah state orchestration.
2. Tambahkan analytics event untuk:
   - auto-open Explore dari ritual
   - mentor ask success/failure
   - audio unlock fallback
3. Tambahkan smoke test UI semi-otomatis untuk:
   - `/renungan`
   - `/versehub/id`
   - chapter mode
   - verse mode
4. Tambahkan small regression suite untuk overlay exclusivity.

## 12. Final Assessment
VerseHub saat ini sudah naik kelas dari “fitur menarik tetapi rapuh” menjadi “sistem pengalaman baca yang jauh lebih matang”. Audio lebih stabil, arsitektur lebih jernih, payload mentor lebih kontekstual, dan UX lebih imersif. Fokus berikutnya bukan lagi menyelamatkan fondasi, tetapi menjaga kualitas melalui QA disiplin, pemecahan file besar secara bertahap, dan telemetry yang membantu keputusan patch berikutnya.
