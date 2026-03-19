# VerseHub Double Sidebar Final Fix

## 1. Ringkasan Masalah
Pada desktop VerseHub, masih terlihat efek "double sidebar" karena ada elemen navigasi/branding duplikat di area konten, sementara sidebar kiri global sebenarnya sudah benar.

## 2. Elemen yang Salah Sasaran Sebelumnya
1. `VersehubReaderPage` merender sidebar/navigation lagi secara lokal.
2. `AppShell` juga merender sidebar kiri global.
3. Kombinasi keduanya menimbulkan persepsi dua kolom navigasi.

## 3. Akar Masalah Final
Akar masalah final bukan dark hero card, melainkan **duplikasi render shell navigasi** di page VerseHub:
1. `DesktopSidebarNav` dirender di `VersehubReaderPage`.
2. `FloatingBottomNav` juga dirender di `VersehubReaderPage`.
3. Keduanya sebenarnya sudah disediakan oleh `AppShell`.

## 4. Perubahan yang Dihapus
1. Hapus import `DesktopSidebarNav` dari `VersehubReaderPage`.
2. Hapus import `FloatingBottomNav` dari `VersehubReaderPage`.
3. Hapus render blok desktop sidebar lokal.
4. Hapus render blok floating mobile nav lokal.
5. Hapus `getUiNavItems` dan `navItems` yang hanya dipakai untuk nav lokal tersebut.

## 5. Perubahan Layout yang Dirapikan
1. Wrapper konten kanan dirapikan menjadi satu kolom fokus (`max-w-3xl`) tanpa nested shell duplikat.
2. Urutan area konten dipertahankan:
   - top row
   - Gerbang VerseHub
   - search
   - quick entry
   - dark hero
3. Dark hero **tetap dipertahankan** sebagai anchor utama landing.

## 6. Status Akhir
1. Card branding/navigasi duplikat di konten atas kiri: **terhapus**.
2. Sidebar kiri global: **tetap** (tidak disentuh).
3. Dark hero: **tetap ada**.
4. Efek "double sidebar": **ditutup pada source layout VerseHub**.

## 7. Checklist Verifikasi Visual
1. Buka `/versehub/id` di desktop (>=1280px).
2. Pastikan hanya ada satu sidebar kiri (dari `AppShell`).
3. Pastikan tidak ada card branding/navigasi tambahan di area konten atas kiri.
4. Pastikan dark hero masih muncul setelah quick entry.
5. Pastikan alur kanan: top row -> Gerbang -> search -> quick entry -> dark hero.
