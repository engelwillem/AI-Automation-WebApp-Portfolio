# Favicon Runtime 404 Remediation Report (2026-03-20)

## Issue Summary
Runtime production masih memunculkan 404 untuk path root favicon:
- `https://thechoosentalks.org/favicon.png`

## Root Cause
Metadata icon di `src/app/layout.tsx` sudah mengarah ke SVG premium (`/brand/favicon-premium.svg`), namun fallback file root `public/favicon.png` belum tersedia.  
Beberapa browser/client tetap melakukan request ke `/favicon.png`, sehingga muncul 404.

## Affected Paths
- `/favicon.png` (sebelumnya 404)
- `/favicon.ico` (sudah tersedia)
- `/brand/favicon-premium.svg` (sudah tersedia)

## Files Changed
- `public/favicon.png` (baru)
- `src/app/layout.tsx` (metadata icons disinkronkan)

## Remediation Applied
1. Menambahkan fallback asset root:
   - `public/favicon.png`
2. Menyinkronkan metadata `icons` di `src/app/layout.tsx` agar kompatibel lintas platform:
   - SVG: `/brand/favicon-premium.svg`
   - PNG: `/favicon.png`
   - ICO: `/favicon.ico`
   - shortcut: `/favicon.ico`
   - apple: `/favicon.png`
3. Tidak menghapus aset lama yang masih valid.

## Verification Evidence
### A. File existence
- `public/favicon.png` -> ada
- `public/favicon.ico` -> ada
- `public/brand/favicon-premium.svg` -> ada

### B. Metadata path check
`src/app/layout.tsx` sekarang menunjuk path ikon berikut yang semuanya ada:
- `/brand/favicon-premium.svg`
- `/favicon.png`
- `/favicon.ico`

### C. Build stability
- `npm run build` -> lulus setelah patch.

## Residual Risk
- Browser cache dapat menahan favicon lama beberapa saat; biasanya hilang setelah cache refresh/CDN purge.

## Final Status
`FIXED`
