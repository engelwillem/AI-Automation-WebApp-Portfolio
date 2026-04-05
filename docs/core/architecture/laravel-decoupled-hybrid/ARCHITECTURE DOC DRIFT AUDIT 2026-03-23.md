# Architecture Doc Drift Audit 2026-03-23

Dokumen ini mengaudit file architecture lama yang masih membawa asumsi deploy usang.

Baseline yang dipakai:
- frontend production deploy dari `main`
- frontend production host ada di Tencent Cloud
- backend Laravel tidak auto-deploy
- backend runtime baru berubah setelah operator pull manual di cPanel dan menjalankan deploy script
- `frontend-prod` bukan lagi baseline aktif

---

## 1. Drift Pattern yang Dicari

Audit ini mencari dokumen yang masih menyebut:
- `frontend-prod` sebagai branch aktif production
- backend deploy otomatis via GitHub Actions ke cPanel
- webhook/deploy hook sebagai jalur backend production
- model release frontend lama yang tidak lagi sesuai monorepo hybrid sekarang

---

## 2. High-Risk Files

### A. Obsolete / historical only

1. [laravel-decoupled-hybrid/Mono Repo Flow.md](./laravel-decoupled-hybrid/Mono%20Repo%20Flow.md)
   - masalah:
     - menyebut `frontend-prod` sebagai branch frontend release aktif
     - menyebut backend deploy ke cPanel via GitHub Actions + SSH
   - status baru:
     - `HISTORICAL / OBSOLETE`

2. [laravel-decoupled-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-decoupled-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)
   - masalah:
     - mengarahkan Tencent Edge ke `frontend-prod`
     - masih memosisikan GitHub Actions sebagai jalur deploy backend aktif
   - status baru:
     - `HISTORICAL / OBSOLETE`

3. [laravel-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)
   - masalah:
     - duplikasi asumsi branch dan deploy usang
   - status baru:
     - `HISTORICAL / OBSOLETE`

### B. Revisi ringan diperlukan

1. [TECH STACK TCT MONOREPO.md](./TECH%20STACK%20TCT%20MONOREPO.md)
   - masalah:
     - bagian CI/CD masih menyebut webhook deployment backend
   - status baru:
     - `ACTIVE WITH REVISION`

2. [laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md](./laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md)
   - masalah:
     - masih menyebut backend deploy dari workflow dan frontend deploy hook
   - status baru:
     - `HISTORICAL / PARTIAL`

3. [laravel-decoupled-hybrid/Monorepo Deployment Boundaries.md](./laravel-decoupled-hybrid/Monorepo%20Deployment%20Boundaries.md)
   - masalah:
     - masih menyebut backend deploy via GitHub Actions ke cPanel
   - status baru:
     - `HISTORICAL / PARTIAL`

---

## 3. Files Audited by Search Evidence

Search pattern yang dipakai:
- `frontend-prod`
- `GitHub Actions`
- `deploy dari frontend-prod`
- `backend deploy ke cPanel dilakukan via GitHub Actions + SSH`

File-file yang masih terkena drift:
- [TECH STACK TCT MONOREPO.md](./TECH%20STACK%20TCT%20MONOREPO.md)
- [laravel-decoupled-hybrid/1. AUDIT KESIAPAN MONOREPO.md](./laravel-decoupled-hybrid/1.%20AUDIT%20KESIAPAN%20MONOREPO.md)
- [laravel-decoupled-hybrid/2. FIRST DEPLOY RUNBOOK.md](./laravel-decoupled-hybrid/2.%20FIRST%20DEPLOY%20RUNBOOK.md)
- [laravel-decoupled-hybrid/3. GO-LIVE CHECKLIST.md](./laravel-decoupled-hybrid/3.%20GO-LIVE%20CHECKLIST.md)
- [laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md](./laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md)
- [laravel-decoupled-hybrid/LARAVEL HYBRID CPANEL.md](./laravel-decoupled-hybrid/LARAVEL%20HYBRID%20CPANEL.md)
- [laravel-decoupled-hybrid/Mono Repo Flow.md](./laravel-decoupled-hybrid/Mono%20Repo%20Flow.md)
- [laravel-decoupled-hybrid/Monorepo Deployment Boundaries.md](./laravel-decoupled-hybrid/Monorepo%20Deployment%20Boundaries.md)
- [laravel-decoupled-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-decoupled-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)
- [laravel-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)

---

## 4. What Was Updated in This Pass

### Directly revised
- [TECH STACK TCT MONOREPO.md](./TECH%20STACK%20TCT%20MONOREPO.md)

### Directly marked historical
- [laravel-decoupled-hybrid/Mono Repo Flow.md](./laravel-decoupled-hybrid/Mono%20Repo%20Flow.md)
- [laravel-decoupled-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-decoupled-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)
- [laravel-hybrid/PLATFORM CONFIG CHECKLIST.md](./laravel-hybrid/PLATFORM%20CONFIG%20CHECKLIST.md)
- [laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md](./laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md)
- [laravel-decoupled-hybrid/Monorepo Deployment Boundaries.md](./laravel-decoupled-hybrid/Monorepo%20Deployment%20Boundaries.md)

### Not yet revised in-body
- `1. AUDIT KESIAPAN MONOREPO.md`
- `2. FIRST DEPLOY RUNBOOK.md`
- `3. GO-LIVE CHECKLIST.md`
- `LARAVEL HYBRID CPANEL.md`

Alasan belum direwrite total:
- isinya panjang
- banyak nilai historical yang masih berguna
- untuk sesi ini, yang paling penting adalah mencegah pembaca menganggap deploy model lama itu masih aktif

---

## 5. Recommended Reading Order After Cleanup

Untuk baseline aktif:
1. [MONOREPO HYBRID LOCAL-SERVER PARITY AUDIT.md](./MONOREPO%20HYBRID%20LOCAL-SERVER%20PARITY%20AUDIT.md)
2. [MYSQL SCHEMA PARITY AUDIT 2026-03-23.md](./MYSQL%20SCHEMA%20PARITY%20AUDIT%202026-03-23.md)
3. [TECH STACK TCT MONOREPO.md](./TECH%20STACK%20TCT%20MONOREPO.md)
4. [../implementation/06 CPANEL SERVER FULL MAIN BLUEPRINT MAP.md](../implementation/06%20CPANEL%20SERVER%20FULL%20MAIN%20BLUEPRINT%20MAP.md)

Untuk konteks history:
- baca file-file `HISTORICAL / OBSOLETE` hanya jika sedang menelusuri jejak keputusan lama

---

## 6. Final Verdict

Architecture docs di repo ini masih mengandung sejumlah jejak workflow lama.

Status setelah pass ini:
- baseline aktif sudah ada
- file paling berbahaya sudah ditandai
- sumber salah baca paling besar, yaitu `frontend-prod` dan backend GitHub Actions deploy, sudah tidak boleh lagi dipakai sebagai acuan operasional
