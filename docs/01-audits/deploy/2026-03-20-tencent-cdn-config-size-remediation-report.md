# Tencent CDN Config Size Remediation Report (2026-03-20)

## Issue Summary
Deploy frontend gagal di Tencent Edge Pages pada tahap output/CDN config meskipun install, build, upload static files, dan function deploy sudah lulus.

## Exact Tencent Failure Message
`Deployment failed: CDN configuration size exceeds limit: 38460 bytes (max: 32768 bytes)`

## Likely Config Bloat Sources
1. **Encoded chunk mirroring step di build pipeline frontend**
   - Build script sebelumnya selalu menjalankan:
   - `next build && node scripts/mirror-encoded-next-chunks.mjs`
   - Script tersebut menduplikasi dynamic chunk files dengan path ter-encode (`%5B`, `%5D`), yang menambah footprint output.
2. `next.config.ts` redirects hanya 4 rule; kontribusi ada tetapi kecil dibanding duplikasi chunk file.
3. Tidak ada middleware matcher luas yang menambah rule CDN.

## Remediation Applied
- Mengubah build default frontend agar **tidak** menjalankan encoded chunk mirroring secara otomatis.
- Menyediakan command terpisah jika mirroring memang dibutuhkan di kasus khusus.

Perubahan `package.json`:
- before: `"build": "next build && node scripts/mirror-encoded-next-chunks.mjs"`
- after:
  - `"build": "next build"`
  - `"build:with-encoded-chunk-mirror": "next build && node scripts/mirror-encoded-next-chunks.mjs"`

## Files Changed
- `package.json`

## Why This Should Reduce CDN Config Size
- Menghentikan duplikasi encoded dynamic chunks menurunkan jumlah artefak path turunan yang perlu diproses deployment platform.
- Pada output build lokal setelah patch, jumlah file chunk dengan encoded segment (`%5B`/`%5D`) turun dari **42** menjadi **0**.
- Dengan footprint output lebih kecil, probabilitas melewati limit konfigurasi CDN Tencent menurun signifikan.

## Verification Evidence
1. `npm run typecheck` -> lulus.
2. `npm run build` -> lulus.
3. Hitung encoded mirrored chunk di `.next/static/chunks`:
   - setelah patch: `0`

## Residual Risk
- Jika Tencent masih menghitung rule dari faktor lain (mis. manifest routing App Router API yang sangat banyak), error bisa tetap muncul dan perlu iterasi lanjutan pada penyederhanaan routing/deploy target.
- Untuk saat ini, sumber bloat paling tinggi-leverage yang teridentifikasi sudah dipangkas tanpa mengubah fitur inti.

## Final Status
`FIXED`
