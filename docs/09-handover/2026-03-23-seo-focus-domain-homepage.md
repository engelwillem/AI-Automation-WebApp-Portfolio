# SEO Focus: Domain, Indexing, Homepage

## 1. Root cause singkat

- Metadata global belum punya guard yang konsisten untuk membedakan domain utama vs non-primary/staging.
- `robots.txt` masih statis di `public/robots.txt`, sehingga tidak bisa menyesuaikan behavior indexing per environment.
- `sitemap.xml` belum tersedia dari App Router.
- Homepage masih memakai title brand-only, meta description terlalu tipis, dan belum punya 3 internal link intent SEO yang jelas.

## 2. File yang diubah

- `src/lib/seo.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `next.config.ts`
- `public/robots.txt` dihapus

## 3. Perubahan yang dilakukan

### Fokus 1: Domain dan indexing

- Menambahkan util SEO kecil di `src/lib/seo.ts` untuk:
  - memusatkan primary site URL ke `https://www.thechoosentalks.org`
  - membedakan primary production vs non-primary
  - memperlakukan `localhost` dan `127.0.0.1` sebagai primary-like saat verifikasi lokal agar canonical tetap ke domain utama tetapi output lokal tetap bisa divalidasi
- Mengganti metadata global di `src/app/layout.tsx` menjadi `generateMetadata()` agar:
  - canonical terpusat ke domain utama
  - primary menghasilkan `robots: index, follow`
  - non-primary menghasilkan `robots: noindex, nofollow`
- Menambahkan `src/app/robots.ts`:
  - primary: `Allow: /` + `Sitemap: https://www.thechoosentalks.org/sitemap.xml`
  - non-primary: `Disallow: /`
- Menambahkan `src/app/sitemap.ts`:
  - sitemap tersedia di `/sitemap.xml`
  - hanya mengeluarkan URL indexable untuk primary
  - URL awal: `/`, `/today`, `/versehub/id`, `/community`
- Menghapus `public/robots.txt` statis agar tidak bentrok dengan route App Router.
- Menambahkan redirect apex ke `www` di `next.config.ts`.
- Menambahkan `X-Robots-Tag: noindex, nofollow, noarchive` untuk non-primary di `next.config.ts`.

### Fokus 2: Homepage SEO dasar

- Mengganti title homepage menjadi manfaat yang lebih jelas.
- Mengganti meta description homepage agar lebih informatif.
- Mempertahankan 1 `h1` utama dengan copy yang lebih jelas.
- Menambahkan 3 internal link intent SEO utama ke:
  - `/today`
  - `/versehub/id`
  - `/community`

## 4. Verifikasi lokal yang dijalankan

1. `npm run typecheck`
2. `npm run build`
3. Menjalankan local production server di port `9012` untuk verifikasi primary mode:
   - cek `/`
   - cek `/robots.txt`
   - cek `/sitemap.xml`
   - cek DOM homepage dengan Playwright lokal
4. Menjalankan local preview simulation:
   - sementara mengganti `.env.local` ke `NEXT_PUBLIC_APP_URL=https://preview.thechoosentalks.org` dan `VERCEL_ENV=preview`
   - `npm run build`
   - jalankan local production server di port `9013`
   - cek `/`
   - cek `/robots.txt`
   - cek `/sitemap.xml`
   - cek header `X-Robots-Tag`
   - restore `.env.local` ke isi lokal semula
5. Build primary lokal dijalankan ulang setelah preview simulation agar artifact akhir kembali ke mode lokal utama.

## 5. Hasil verifikasi lokal

### Primary lokal

- `npm run typecheck`: **PASS**
- `npm run build`: **PASS**
- Homepage `/`:
  - title: `Renungan Harian Kristen untuk Menerima Firman dan Berdoa`
  - meta description: `The Chosen Talks membantu Anda menerima firman, merenungkan ayat harian, dan bertumbuh bersama komunitas iman setiap hari.`
  - canonical: `https://www.thechoosentalks.org`
  - robots meta: `index, follow`
  - jumlah `h1` pada DOM: `1`
  - link ke `/today`: ada
  - link ke `/versehub/id`: ada
  - link ke `/community`: ada
- `/robots.txt`:
  - `Allow: /` ada
  - `Sitemap: https://www.thechoosentalks.org/sitemap.xml` ada
- `/sitemap.xml`:
  - tersedia
  - memuat `/`
  - memuat `/today`
  - memuat `/versehub/id`
  - memuat `/community`

### Non-primary / preview lokal

- build preview lokal: **PASS**
- Homepage `/`:
  - canonical tetap `https://www.thechoosentalks.org`
  - robots meta: `noindex, nofollow, nocache`
- response header:
  - `X-Robots-Tag: noindex, nofollow, noarchive`
- `/robots.txt`:
  - `Disallow: /`
- `/sitemap.xml`:
  - tersedia sebagai route
  - tidak mengeluarkan URL indexable

## 6. Apakah server sudah dimatikan setelah testing

- Ya. Verifikasi terakhir menghasilkan `ALL_PORTS_CLOSED`.
- Port verifikasi yang dipakai (`9012` dan `9013`) sudah dimatikan setelah testing lokal.

## 7. Hal yang belum dikerjakan

- Tidak ada pekerjaan tambahan di luar 2 fokus ini.
- Tidak dilakukan cek ke production/live site.
- Tidak dilakukan commit, push, atau deploy.

## 8. Status akhir

- Domain & Indexing: Done
- Domain & Indexing: Done
- Homepage SEO: Done

---

# Audit Gemini Lokal (24.03.2026)

## Fokus 1 — Domain dan indexing (Lokal Only)
- **Status: Pass**
- **Evidence:**
  - `src/lib/seo.ts`: Sudah memusatkan `PRIMARY_HOST` ke `www.thechoosentalks.org` dan menyertakan `localhost` dalam set primary-like host untuk kemudahan testing lokal.
  - `src/app/layout.tsx`: Menggunakan `generateMetadata()` yang secara dinamis mengatur `robots: index, follow` hanya jika `isPrimaryProductionDeployment()` bernilai true. Canonical diset `/` sesuai `metadataBase`.
  - `src/app/robots.ts` dan `src/app/sitemap.ts`: Implementasi logic environment-aware sudah benar. Default non-primary akan menghasilkan `Disallow: /` dan sitemap kosong.
  - `public/robots.txt`: Sudah dihapus (List dir mengonfirmasi tidak ada file statis tersebut).
  - `next.config.ts`: Redirect apex ke `www` sudah tertulis permanen. Header `X-Robots-Tag` untuk non-primary (`noindex, nofollow, noarchive`) sudah diimplementasikan.

## Fokus 2 — Homepage (Lokal Only)
- **Status: Pass**
- **Evidence:**
  - `src/app/page.tsx`:
    - Title: "Renungan Harian Kristen untuk Menerima Firman dan Berdoa" (Deskriptif & Manfaat).
    - Meta Description: Lengkap dan informatif.
    - H1: "Renungan harian Kristen untuk memulai hari ini." (Tunggal & Jelas).
    - Link Internal: Terdapat `nav` eksplisit dengan 3 link target SEO (`/today`, `/versehub/id`, `/community`).

## Verifikasi Kesehatan Kode
- `npm run typecheck`: **PASS** (Exit code 0).
- `npm run build`: **PASS** (Exit code 0). 

## Catatan Server
- Verifikasi dilakukan melalui audit source code yang sudah terbukti buildable.
- Tidak ada server lokal yang dibiarkan menyala setelah verifikasi audit source.

## Keputusan Akhir
- **Ready for commit** (Seluruh implementasi lokal memenuhi requirement SEO Fokus).
