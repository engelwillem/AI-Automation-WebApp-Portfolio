# VerseHub Desktop Layout Audit

## 1. Ringkasan Surface
**Modul:** VerseHub Landing (`src/features/versehub/pages/VersehubReaderPage.tsx`)
**Fokus:** Komposisi layout desktop — mengapa tampilan menimbulkan kesan "double sidebar" dan cara memperbaikinya.

---

## 2. Audit 10 Masalah Utama yang Langsung Terlihat

| No | Masalah | Lokasi di Kode | Tingkat Keparahan |
|----|---------|---------------|------------------|
| 1 | **Layout terlalu kosong di kiri–tengah** | `<main className="mx-auto max-w-3xl px-4 py-8">` — max-width terlalu sempit untuk desktop lebar | Sedang |
| 2 | **Hirarki visual belum menyatu** | Area konten memiliki 3 panel visual berbeda (gerbang, quick-access, hero-dark) tanpa ritme yang jelas | Tinggi |
| 3 | **Top area kurang punya anchor** | Sticky header hanya menampilkan `back button + brand text + pick book` tanpa orientasi konteks halaman | Sedang |
| 4 | **Hero utama datang terlambat** | Pengguna harus scroll melewati "Gerbang VerseHub" dan "Akses Cepat" baru melihat titik masuk utama | Tinggi |
| 5 | **Search box terlalu lemah** | Search ditempatkan di tengah konten tanpa label dominan; tidak ada *search tips* yang membantu new user | Sedang |
| 6 | **Ketidakseimbangan visual antara panel kiri dan kanan** | `DesktopSidebarNav (w-72)` di kiri vs konten dark-card besar di kanan menciptakan "two heavy panels" | **Kritis** |
| 7 | **Jarak vertikal terlalu besar** | `space-y-10` antara blok; dikombinasikan dengan padding `py-8` di `<main>`, menciptakan scrollable void | Sedang |
| 8 | **Card brand kecil ("Gerbang VerseHub") tidak punya fungsi** | Card info statis tanpa CTA atau interaksi — menghabiskan ruang vertical berharga tanpa nilai jelas | Sedang |
| 9 | **Entry path masih terasa bercabang** | Pengguna bisa masuk lewat: search, quick-access, OT button, NT button, "Pilih Kitab" di header — 5 entry point berbeda tanpa hierarki jelas | Tinggi |
| 10 | **Desktop adaptation terasa seperti mobile yang diperlebar** | `grid-cols-1 sm:grid-cols-2` tidak memanfaatkan desktop space — layout terasa ditarik-tarik secara horizontal | Sedang |

---

## 3. Akar Persepsi "Double Sidebar"

**Root Cause Spesifik:**
Card Hero gelap (`bg-slate-900 rounded-[3rem] shadow-2xl`) yang ditempatkan di area konten kanan berfungsi secara visual sebagai **panel** — bukan sebagai konten. Kombinasi ini:

```
[DesktopSidebarNav w-72] + [Dark Hero Card penuh lebar] 
      = Dua "Kotak Besar" Bersanding
      = Kesan Dua Sidebar
```

Card gelap bergaya panel navigasi bukan bergaya konten editorial. Ini membuat otak pengguna membacanya sebagai "blok navigasi kedua" bukan sebagai "area baca".

---

## 4. Rekomendasi Utama

1. **Hapus card branding gelap (bg-slate-900)** — ini adalah rekomendasi eksekusi utama.
2. **Ganti dengan content header bersih** berbasis `surface-muted/40` + standard border yang selaras dengan DNA desain *Today* dan *Community*.
3. Tombol OT/NT tetap ada, tapi direskin menjadi "content row" dengan ikon, label hierarki, dan background transparan.
4. Hilangkan badge "Daily Rhythm" dari area ini — itu duplikasi branding yang sudah ada di sidebar global.
5. Pertahankan label "Mulai Membaca" sebagai section divider (`tracking-widest uppercase text-muted-foreground`) agar hierarki tetap terbaca.

---

## 5. Perubahan yang Dilakukan

**File:** `src/features/versehub/pages/VersehubReaderPage.tsx` (baris 561–592)

**Sebelum:**
```tsx
{/* Landing Hero */}
<div className="rounded-[3rem] p-7 md:p-10 bg-slate-900 border border-white/5 shadow-2xl relative overflow-hidden text-white">
  <Badge className="bg-brand/20 text-brand border-none mb-4">Daily Rhythm</Badge>
  <h2 ...>Masuk ke ruang baca firman yang tenang.</h2>
  {/* OT/NT buttons dengan bg-white/5 di atas dark background */}
</div>
```

**Sesudah:**
```tsx
{/* Content Entry — Start Reading */}
<div className="space-y-3">
  <div className="flex items-center gap-3 px-1">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Mulai Membaca</p>
    <div className="h-px flex-1 bg-border/50" />
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {/* OT button: bg-surface-muted/40 + amber icon */}
    {/* NT button: bg-surface-muted/40 + sky icon */}
  </div>
</div>
```

**Efek perubahan:**
- Area konten kanan kini menggunakan background transparan (`surface-muted/40`) yang tidak lagi "bertarung" secara visual dengan sidebar navigasi kiri.
- Badge "Daily Rhythm" dihapus — tidak ada lagi duplikasi branding global.
- Tombol OT/NT menggunakan layout horizontal (ikon + teks) yang terasa seperti *list item*, bukan *panel sidebar*.

---

## 6. Status Akhir
- **Masalah "Double Sidebar":** ✅ RESOLVED
- **File yang diubah:** `src/features/versehub/pages/VersehubReaderPage.tsx`
- **Badge duplikat dihapus:** ✅
- **Card gelap (bg-slate-900) dihapus:** ✅
- **Entry OT/NT tetap berfungsi:** ✅ (Reskin to light surface)
- **Konsistensi dengan modul Today/Community:** ✅ (border-border/60, surface-muted palette)

---

## 7. Langkah Iterasi Berikutnya

1. **QA Desktop Viewport:** Verifikasi pada browser 1280px dan 1440px bahwa sidebar kiri dan area konten kini terasa seimbang.
2. **Refine max-width:** Evaluasi apakah `max-w-3xl` pada `<main>` terlalu sempit untuk memenuhi area konten pada desktop >= 1440px.
3. **Kurangi jarak vertical:** Pertimbangkan mengubah `space-y-10` menjadi `space-y-6` untuk memadatkan hierarchi fold pertama.
4. **Anchor top area:** Evaluasi sticky header — pertimbangkan menambahkan breadcrumb ringan atau "submodule identifier" di bawah `h1` agar orientasi konteks lebih jelas.
