# Next Actions

## Eksekusi Prioritas (CI/Build Pipeline Recovery)
- [x] Identifikasi masalah source code pada `Frontend Monorepo Checks`: `Google Fonts Network Dependency` (DONE 2026-03-20).
- [x] Implementasi Remediasi: System Fonts Fallback (DONE 2026-03-20).
- [x] Verifikasi lokal: `npm run typecheck` & `npm run build` PASS.
- [ ] Lanjutkan deploy ke production (Tencent Edge) via **Manual Rerun** atau GitHub Action trigger (PENDING).

## Eksekusi Prioritas (Production Recovery)
- [x] Selesaikan blocker Edge artifact drift: Implementasi `generateBuildId` unik untuk memaksa update bundle.
- [x] Lakukan root cleanup & hygiene: Memindahkan log/debug files ke `docs/`.
- [x] Audit log deployment (Tencent Edge): Membedakan scanner noise vs error sistem nyata.
- [x] Recovery admin login production (`/admintalk/login`) sampai pulih dan terverifikasi live.
- [x] Closed blocker `Route [register] not defined` pada login-links.
- [x] Closed blocker CSP admin runtime dengan scoped `unsafe-eval` untuk area `admintalk/*`.
- [x] Verifikasi header live admin login memuat `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`.
- [x] **SECURITY HOTFIX**: Hapus logging token di `src/lib/proxy-laravel.ts` (RESOLVED 2026-03-20).
- [x] **Contract Fix (Today API)**: Penyesuaian frontend mengikuti backend nyata (RESOLVED 2026-03-20).
- [x] **Wiring Reflections**: Sambungkan UI `/reflections` ke backend API (DONE 2026-03-20).
- [x] **Logic Fix (Profile)**: Tambahkan deep-link untuk aktivasi Journey CTA (DONE 2026-03-20).
- [ ] Stabilisasi Data: Mengisi konten utama (Daily Verse, Rituals, Study Paths) di database produksi via Filament.
- [x] Audit & Patch `/profile` (Readability & Avatar issue) - **PATCHED IN SOURCE**.
- [ ] Validasi live profile readability & avatar resolution (Awaiting CI Green).
- [x] Implementasi *Reflections API* (RESOLVED 2026-03-20).
- [ ] Refactor Community Types: standarisasi *ApiPost* interface (Backend Contract Cleanup).
- [ ] Hardening observability: tambah smoke script otomatis (login, today, community, versehub) pasca deploy.
- [x] Deploy frontend patch (VerseHub route/nav, OG card source, login parser, profile logout).
- [x] Verifikasi perbaikan VerseHub Desktop pasca CI Hijau (Staging Pass).
- [x] Global Background System Foundation - UI foundation done.
- [ ] QA visual lintas halaman untuk background global.
- [ ] Cleanup Dead Code: Hapus `src/components/core/GreetingHeader.tsx` dan `src/features/community/mock.ts`.

## Verifikasi Admin Credential (Production DB)
- [x] Validasi user `engel.willem@gmail.com` bisa login di production.
- [x] Konfirmasi status admin via `/api/profile` (`is_admin=True`).
- [x] Logout API untuk sesi admin tervalidasi.

## Reality Matrix & Contract Gap Resolution
- [x] **Priority 1**: Implement real API integration for Reflections and My Spiritual Journey (DONE).
- [ ] **Priority 2**: Reduce fallback dependency in Today dashboard
- [ ] **Priority 3**: Standardize field naming conventions between frontend and backend
- [x] **Priority 4**: Implement real API integration for Reflections (`src/app/reflections/[slug]/page.tsx`) (FIXED).
- [x] **Priority 5**: Implement real API integration for My Spiritual Journey (`src/app/versehub/[lang]/my-spiritual-journey/page.tsx`) (FIXED).

## Operasional Deploy
- [ ] Nonaktifkan "Automatic Deployment" di Tencent Console untuk project Edge Pages (Penerapan Opsi B - One-Way Webhook).
- [ ] Verifikasi rilis berikutnya hanya dipicu sekali oleh GitHub Actions.

## Dokumentasi
- [x] Audit report screenshot-based tersedia.
- [x] Roadmap eksekusi checklist tersedia.
- [x] Catat hasil re-test production final ke checklist parity + current status.
- [x] Sinkronisasi dokumen final recovery admin login production (`audit`, `current-status`, `next-actions`, `open-blockers`).
- [x] Reality Matrix Audit: `docs/01-audits/overall/frontend-backend-reality-matrix-audit.md`
- [x] Contract Gap Audit: `docs/03-architecture/technical/frontend-backend-contract-gap-audit.md`
- [x] Profile Fix Status Sync: `docs/09-handover/profile-fix-status-sync.md`
- [x] Global Background Status Sync: `docs/02-uiux/global-background-status-sync.md`
