# Build Font Network Remediation Report (2026-03-20)

## Issue Summary
Build frontend gagal di CI/deploy karena `next/font/google` melakukan fetch build-time ke host Google Fonts yang tidak selalu dapat di-resolve pada environment build.

## Root Cause
`src/app/layout.tsx` mengimpor dan menginisialisasi:
- `Inter` dari `next/font/google`
- `DM_Serif_Display` dari `next/font/google`

Saat `next build`, Next.js mencoba mengunduh font metadata/asset dari:
- `fonts.googleapis.com`
- `fonts.gstatic.com`

Ketika host tersebut gagal di-resolve/fetch, pipeline build ikut gagal.

## Affected Files
- `src/app/layout.tsx`
- `src/app/globals.css`

File yang diaudit untuk memastikan tidak ada dependency implisit lain:
- `package.json`
- `next.config.ts`
- `.github/workflows/frontend-monorepo-checks.yml`
- `apphosting.yaml`

## Remediation Approach Chosen
Pendekatan: **system font fallback** (bukan local font asset).

Alasan:
- Perubahan paling kecil dan aman untuk memutus total network dependency build-time ke Google Fonts.
- Tidak perlu menambah aset font baru ke repo dalam perbaikan darurat stabilitas deploy.
- Tetap menjaga tampilan mendekati semula dengan stack fallback yang rapi.

## Exact Code/Config Changes
### 1) `src/app/layout.tsx`
- Hapus import `next/font/google`.
- Hapus inisialisasi `Inter(...)` dan `DM_Serif_Display(...)`.
- Hapus class variable font pada `<html>`.

### 2) `src/app/globals.css`
- Pertajam fallback stack:
  - `--font-sans`: tambah stack system yang lebih lengkap.
  - `--font-serif`: tambah stack serif fallback yang lebih konsisten.
- Tidak ada lagi wiring yang memaksa fetch external font saat build.

## Verification Evidence
### A. Source check
Pencarian pola font Google di source:
- `next/font/google`
- `fonts.googleapis.com`
- `fonts.gstatic.com`
- `DM_Serif_Display`
- `Inter(`

Hasil: `NO_MATCH_IN_SRC`.

### B. Type check
Perintah:
- `npm run typecheck`

Hasil:
- lulus.

### C. Production build
Perintah:
- `npm run build`

Hasil:
- build berhasil (`Compiled successfully`, static page generation selesai, chunk mirror selesai).

## Residual Risk
- Karena memakai system fallback, rendering tipografi bisa sedikit berbeda antar OS/browser.
- Risiko ini visual-only, tidak memblokir build/deploy.

## Final Status
`FIXED`
