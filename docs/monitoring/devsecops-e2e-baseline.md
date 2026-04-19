# DevSecOps E2E Baseline

## Tujuan

Dokumen ini menetapkan baseline DevSecOps end-to-end untuk monorepo TheChosenTalks agar kualitas release tidak hanya bergantung pada build sukses.

## Workflow Utama

Workflow baru: `.github/workflows/devsecops-e2e.yml`

Trigger:
- Pull request ke `main`
- Push ke `main`
- Manual (`workflow_dispatch`)
- Jadwal mingguan (Senin 02:30 UTC / 09:30 WIB)

Gate yang dijalankan:
- Frontend quality gate: `npm ci`, `typecheck`, `build`, `vitest`
- Backend quality gate: `composer validate`, `composer install`, `php -l`, `composer today:ready`
- Secret scan: `gitleaks`
- Dependency scan: `npm audit` (production deps) + `composer audit`
- SAST/misconfig/secret scan filesystem: `trivy fs`
- Container scan: build image frontend/backend lalu scan Trivy severity `CRITICAL`

## SAST Tambahan (CodeQL)

Workflow tambahan: `.github/workflows/codeql-analysis.yml`

Ruang lingkup:
- `javascript-typescript` (Next.js app, proxy routes, shared libs)
- `php` (Laravel API)

Trigger:
- Pull request ke `main`
- Push ke `main`
- Manual (`workflow_dispatch`)
- Jadwal mingguan (Senin 02:45 UTC / 09:45 WIB)

Tujuan:
- deteksi pattern vulnerability di source code yang tidak selalu tertangkap dependency/container scan
- memperkaya security signal di GitHub Security tab untuk triage terstruktur

## Policy Keputusan Gate

- `CRITICAL` vulnerability pada image/container: merge **ditolak**
- Secret terdeteksi oleh gitleaks: merge **ditolak**
- Error quality gate (build/typecheck/test/readiness): merge **ditolak**
- Temuan `HIGH` dari Trivy FS: saat ini **ditolak** oleh workflow

Jika tim perlu fase adopsi bertahap, severity Trivy FS bisa diturunkan sementara dari `HIGH,CRITICAL` menjadi `CRITICAL` saja. Perubahan ini harus dicatat di changelog operasional.

## Dependabot

File: `.github/dependabot.yml`

Update mingguan aktif untuk:
- npm root (`/`)
- composer backend (`/backend-api`)
- GitHub Actions (`/`)

Tujuan:
- kurangi age dependency
- percepat patch security
- jaga parity toolchain CI

## Operasional Lokal Sebelum PR

Jalankan minimum ini sebelum buat PR:

```bash
npm run typecheck
npm run build
npm run test:unit
composer --working-dir backend-api validate --strict
composer --working-dir backend-api today:ready
```

Untuk validasi Docker:

```bash
docker compose build frontend backend
```

## Triage Saat Gate Gagal

1. Gagal quality gate:
   - Perbaiki root cause di kode/test, jangan bypass gate.
2. Gagal dependency audit:
   - Prioritaskan upgrade patch/minor aman.
   - Jika belum ada fix upstream, dokumentasikan risk acceptance dengan expiry date.
3. Gagal secret scan:
   - Revoke credential dulu.
   - Hapus secret dari history jika perlu.
   - Rotasi env di semua environment.
4. Gagal container scan:
   - Upgrade base image atau paket OS di Dockerfile.
   - Ulangi scan sampai bersih dari `CRITICAL`.

## Catatan Arsitektur

- Baseline ini menjaga batas arsitektur Next.js proxy + Laravel API tetap konsisten.
- Guardrail `composer today:ready` tetap dipertahankan untuk domain ritual agar regressions produk inti tidak lolos ke release.
- Security gate ditempatkan di level monorepo agar frontend, backend, dan container dinilai sebagai satu sistem produk.
- CodeQL berjalan terpisah agar analisis SAST tidak memperlambat quality gate utama saat PR kecil.
