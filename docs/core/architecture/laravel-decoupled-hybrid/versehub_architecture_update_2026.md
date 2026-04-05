# VerseHub UI/UX & Flow Architecture Update
**Tanggal Pembaruan:** 25 Maret 2026  
**Fokus Utama:** Transformasi Native App Feel, Zero-Scroll Logic, & Seamless Flow.

Dokumen ini mencatat rekayasa ulang (reconstruction) pada arsitektur UI/UX VerseHub (khususnya `/versehub/id`) guna menghilangkan limitasi paradigma "web biasa" dan beralih ke pengalaman yang setara dengan aplikasi *iOS Native Premium* (seperti Glorify/Abide).

---

## 1. Visi Utama: The "Sensory" Sanctuary
Arah terbaru dari VerseHub bukan sekadar aplikasi pembaca Alkitab, melainkan **Ruang Doa Digital**.

*   **Peniadaan Batas Browser:** Menggunakan desain satu-layar (*One-Screen/Zero-Scroll*) pada halaman sentral untuk menjaga imersi. Tidak ada elemen yang terpotong *(clipping bug)*.
*   **Sensory UI:** Transformasi warna dari blok solid/hitam tebal menjadi *Glassmorphism* (latar tembus pandang putih pucat, *backdrop-blur* tinggi) agar terasa melayang di atas *Soft Mesh Gradient*.
*   **Premium Typography:** Mengembalikan teks firman sebagai pahlawan utama (*Hero*) dengan gaya *serif italic*, jarak spasi (leading) longgar, dan transisi pemunculan kata per kata (*word-by-word fade-in*).

---

## 2. Pemisahan Mode Secara Logis (Landing vs Chapter)
Perkembangan terbaru memisahkan `VersehubReaderPage` ke dalam dua kerangka besar menggunakan *conditional rendering* berdasar prop `mode` atau turunan state `!isChapter`:

### A. Landing Mode (zero-scroll)
Bertindak sebagai teras (*porch*) atau intro spiritual harian.
*   **Wrapper:** Ditahan secara absolut dengan `fixed inset-0 overflow-hidden flex flex-col`. Memastikan tinggi layar persis mengikuti 100vh sesungguhnya *(bebas scroll bar)*.
*   **Elemen Spesifik:** Menampilkan satu kutipan ayat harian, *Daily Mana*, atau "Action Pill" *(Waktunya Selidiki Firman Lebih Dalam)*.
*   **Native Action Bar:** Menu (Diamond, Wand, Profil) dikonfigurasi menggunakan penahan sumbu Y khusus di bagian bawah yang merespons `env(safe-area-inset-bottom)`.

### B. Chapter/Reader Mode (scrollable)
Diaktifkan saat pengguna masuk ke pasal/ayat yang panjang.
*   **Wrapper:** Kembali menggunakan format dokumen panjang (`min-h-screen relative`), membebaskan limitasi `fixed` agar pengguna dapat memutar roda tetikus (scroll) membaca struktur pasal secara penuh.
*   **Penyajian Konten:** Ayat-ayat di-render menggunakan *clean list* dengan nomor ayat memudar (*opacity-0 hover:opacity-100*) sebagai angka marginal.

---

## 3. Komponen-Komponen Kritis & Penanganannya

*   **Global Navigation Collision (Precision Anchor)**  
    Masalah *overlapping* antara ikon-ikon VerseHub dengan *Bottom Navbar* global diselesaikan dengan "Precision Anchor". Semua aksi VerseHub dinaikkan di atas `64px + padding` agar *Safe Area* sistem navigasi bawaan tetap sinkron.
    
*   **Ambience & Audio Controller (The Clipping Fix)**  
    Menu pemutar *Audio/Mood* yang semula lepas batas monitor kini ditangani secara ketat menggunakan batas (*viewport boundaries*):
    *   Lebar maksimum *(max-w)* ditekan agar tidak tumpah ke luar sisi kanan ponsel.
    *   Ditambahkan **Intuitive Dismissal** *(Klik/Tap area luar otomatis menutup overlay Audio)*.
    *   **Singleton Menu Logic:** Membuka *Audio* akan menutup panel *Explore/Deep Dive*, begitu pula sebaliknya.

*   **The "Clean Swap" Action Pill**  
    Konversi *Flow* yang menghilangkan kebuntuan pasca-centang (*checklist*). Saat "Misi hobi/harian" ditekan:
    1.  Teks misi lama di-unmount.
    2.  Teks baru muncul dengan transisi: **"Waktunya Selidiki Firman Lebih Dalam!"**.
    3.  Titik sentuh area pil bertambah luas untuk memicu *Deep Dive*.

---

## 4. Alur Interaksi Terbaru (The "Seamless Flow")
Untuk menyelaraskan antara cantiknya UI dengan lancarnya UX (berkaca pada kelancaran Flow di `/renungan`), berikut adalah alur terbaru:

1.  **Entry Point:** Pengguna membuka `/versehub/id`.
2.  **Engagement:** Jika ini awal hari, layar diam (Katalog Kitab atau Daily Mana).
3.  **Discovery (Explore):** Mengeklik aksi utama *"Explore"* memicu `setIsExploreOpen(true)` yang menggerakkan *Bottom Sheet Drawer* raksasa dari bawah ke atas menggunakan *Framer Motion (spring animation)*.
4.  **Deep Dive:** Di dalam trayak *Explore*, terdapat paparan lebih detail: Tafsiran dan Refleksi.
5.  **Mentor Bridge:** Di ujung perjalanan *Deep Dive*, terdapat CTA **"Tanya Mentor"**. Tombol ini menyuntikkan muatan kontekstual *(intent, verse_id, teks)* dan ber-routing langsung ke `/inbox` agar terhubung ke *Mentor Engine (Generative AI)*. 

---

## 5. Standar Teknis Pengerjaan Kode
Untuk tim yang akan memodifikasi area ini selanjutnya, pastikan mengikuti aturan berikut:
1. **Network Resilience**: *Fetch* ke API selalu menggunakan `fetchJsonWithTimeout` (12-detik limiter) mengingat fluktuasi *connection aborted*.
2. **Animation Foundation**: `AnimatePresence` Wajib membungkus *Popup, Sheet, dan Picker Modal* untuk memastikan `exit` properti ter-render (*sliding down/fade out*) transisi yang halus sebelum elemen terhapus dari DOM.
3. **Typography Tokens**: Hindari `font-bold` biasa pada judul *(Headers)*. Gunakan `font-black tracking-tight` untuk memicu nuansa iOS Premium UI.
4. **Z-Index Map**:
   - Canvas/Mesh: `z-0`
   - Header Nav: `z-40`
   - Picker/Overlays: `z-50` hingga `z-[60]`
   - Mentor/Modal absolute: `z-[80]`

---
*Semua adaptasi ini menjamin standar tertinggi untuk modul Renungan Interaktif di ekosistem The Choosen Talks MonoRepo.*
