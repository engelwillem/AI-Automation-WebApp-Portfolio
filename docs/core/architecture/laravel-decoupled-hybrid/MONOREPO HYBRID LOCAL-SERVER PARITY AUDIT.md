# Monorepo Hybrid Local-Server Parity Audit

Dokumen ini adalah parity audit aktif antara:
- source lokal monorepo
- runtime backend Laravel di cPanel
- runtime frontend Next.js di Tencent Cloud

Tujuan dokumen ini:
- menjaga sinkronisasi frontend, backend, storage, auth, dan route
- memberi baseline yang jujur untuk bug fixing
- memberi bahan yang bisa dipakai untuk security review dan threat modeling
- mencegah tim membaca source patch seolah sama dengan runtime success

Tanggal audit: `2026-03-23`  
Local source HEAD: `3e80faef9ce551e6a055d0332e1c639b7b6e76c5`

---

## 1. Source of Truth Saat Ini

### Model deploy yang aktif
- frontend Next.js:
  - source ada di root monorepo
  - production host: Tencent Cloud
  - deploy mengikuti commit terbaru di branch `main`
- backend Laravel:
  - source ada di `backend-api/`
  - production host: cPanel
  - runtime baru berubah setelah operator pull manual dan menjalankan deploy script

### Boundary yang wajib dijaga
- frontend live tidak otomatis membuktikan backend live sudah ikut berubah
- backend live tidak otomatis membuktikan frontend Tencent sudah menyajikan artifact terbaru
- parity harus dibaca per layer:
  - source parity
  - runtime parity
  - auth parity
  - storage/media parity
  - database boundary parity

---

## 2. Scope Audit Ini

### Yang dibuktikan langsung
- struktur source frontend lokal
- struktur source backend lokal
- helper konektivitas frontend ke backend
- route backend live
- config auth/session live di cPanel
- marker runtime frontend publik di `www.thechoosentalks.org`
- marker runtime backend publik di `api.thechoosentalks.org`

### Yang belum dibuktikan penuh pada pass ini
- schema MySQL production vs schema lokal
- isi data MySQL production vs lokal
- konfigurasi Tencent dashboard internal
- commit SHA deployment Tencent dari panel
- payload authenticated semua surface selain profile yang sempat diaudit sebelumnya

Jadi dokumen ini adalah parity audit operasional yang kuat di level source, route, runtime, auth, dan storage, tetapi belum menjadi schema diff MySQL penuh.

---

## 3. Peta Source Lokal Monorepo

### Frontend aktif
- root app: [package.json](../../../package.json)
- build config: [next.config.ts](../../../next.config.ts)
- app routes: `src/app/**`
- shared helpers:
  - [src/lib/laravel-api.ts](../../../src/lib/laravel-api.ts)
  - [src/lib/proxy-laravel.ts](../../../src/lib/proxy-laravel.ts)

### Backend aktif
- backend root: [backend-api](../../../backend-api)
- API routes: [backend-api/routes/api.php](../../../backend-api/routes/api.php)
- web routes: [backend-api/routes/web.php](../../../backend-api/routes/web.php)
- middleware bootstrap: [backend-api/bootstrap/app.php](../../../backend-api/bootstrap/app.php)
- auth/session config:
  - [backend-api/config/session.php](../../../backend-api/config/session.php)
  - [backend-api/config/sanctum.php](../../../backend-api/config/sanctum.php)
- filesystem config:
  - [backend-api/config/filesystems.php](../../../backend-api/config/filesystems.php)

### Jalur deploy backend
- script source lokal: [backend-api/deploy.sh](../../../backend-api/deploy.sh)
- baseline server runtime sudah dipetakan di:
  - [06 CPANEL SERVER FULL MAIN BLUEPRINT MAP.md](../implementation/06%20CPANEL%20SERVER%20FULL%20MAIN%20BLUEPRINT%20MAP.md)

---

## 4. Evidence Ringkas yang Dipakai

### Evidence lokal
- `git rev-parse HEAD` -> `3e80faef9ce551e6a055d0332e1c639b7b6e76c5`
- source login/register live marker ditemukan di:
  - [src/app/login/page.tsx](../../../src/app/login/page.tsx)
  - [src/app/register/page.tsx](../../../src/app/register/page.tsx)
- versehub overlay suppression source ditemukan di:
  - [src/layouts/AppShell.tsx](../../../src/layouts/AppShell.tsx)
  - [src/features/versehub/pages/VersehubReaderPage.tsx](../../../src/features/versehub/pages/VersehubReaderPage.tsx)

### Evidence frontend live publik
- `GET https://www.thechoosentalks.org/register` -> `200`
- `GET https://www.thechoosentalks.org/login` -> `200`
- `GET https://www.thechoosentalks.org/today` -> `200`
- `GET https://www.thechoosentalks.org/versehub/id` -> `200`
- login runtime JS chunk:
  - `/_next/static/chunks/app/login/page-9e9a36cb9f0b5c1f.js`
- runtime markers ditemukan di chunk login:
  - `Masuk`
  - `intent=signup`
  - `/api/auth/register`
- runtime markers ditemukan di chunk versehub/layout:
  - `tct:overlay-activity`
  - `backend_unavailable`

### Evidence backend live cPanel
- current release:
  - `/home/thechoosentalks/deploy/apps/thechoosentalks/current`
- post-hardening release setelah deploy:
  - `/home/thechoosentalks/deploy/apps/thechoosentalks/releases/20260323070624`
- route live terkonfirmasi:
  - `GET api/today/session`
  - `POST api/v1/login`
  - `POST api/v1/register`
  - `GET api/v1/profile`
  - `GET/POST api/v1/community/posts`
  - `GET api/v1/study-paths/{lang}`
  - `GET api/v1/versehub/{lang}/books`
  - `GET api/v1/versehub/{lang}/chapter/{ref}`
- config runtime live terkonfirmasi:
  - `SANCTUM_STATEFUL=thechoosentalks.org,www.thechoosentalks.org,api.thechoosentalks.org`
  - `SESSION_DOMAIN=.thechoosentalks.org`
  - `SESSION_SECURE_COOKIE=true`
  - `SESSION_SAME_SITE=lax`
- migration tail sesudah deploy menunjukkan entry terbaru tetap `Ran`

---

## 5. Frontend Local vs Tencent Runtime Parity

| Area | Local Source | Tencent Runtime Evidence | Status | Catatan |
|---|---|---|---|---|
| Frontend app root | root monorepo via `package.json` | public site merender Next.js app dari `/_next/static/*` | PASS | Tidak ada indikasi frontend dibuild dari path lain |
| `/register` behavior | [src/app/register/page.tsx](../../../src/app/register/page.tsx) melakukan `redirect('/login?intent=signup')` | `GET /register` = `200`, HTML mengandung `intent=signup` dan marker redirect | PARTIAL PASS | Runtime tidak memberi redirect status kasar, tetapi hasil publik masih mengarah ke signup flow |
| Login button label | [src/app/login/page.tsx](../../../src/app/login/page.tsx) memakai label `Masuk` | login JS chunk mengandung `Masuk` dan tidak mengandung `Buka Blokir` | PASS | Ini marker penting bahwa artifact lama sudah tidak dominan di login surface |
| Signup mode | local source memakai `intent === 'signup'` | login JS chunk mengandung `intent=signup`; `/register` HTML juga mengandung marker itu | PASS | Signup mode source sudah terbawa ke runtime publik |
| Backend auth proxy | source memanggil `/api/auth/register` dan `/api/auth/login` | login JS chunk mengandung `/api/auth/register` | PASS | Menunjukkan runtime frontend memakai proxy pattern baru |
| VerseHub overlay suppression | [src/layouts/AppShell.tsx](../../../src/layouts/AppShell.tsx) mendengar event `tct:overlay-activity` | chunk versehub/layout live mengandung `tct:overlay-activity` | PASS | Marker suppression source terbukti masuk ke artifact live |
| VerseHub backend unavailable handling | [VersehubReaderPage.tsx](../../../src/features/versehub/pages/VersehubReaderPage.tsx) punya state `backend_unavailable` | chunk versehub live mengandung `backend_unavailable` | PASS | Error-state logic source ada di runtime |
| Build strictness | [next.config.ts](../../../next.config.ts) mengaktifkan `ignoreBuildErrors` dan `ignoreDuringBuilds` | tidak bisa dilihat dari public HTML | RISK | Ini bukan parity gap, tetapi runtime risk karena build bisa lolos dengan error |

### Kesimpulan frontend parity
- parity source ke runtime Tencent saat audit ini jauh lebih sehat daripada fase stale sebelumnya
- marker frontend penting yang dulu drift sekarang sudah terlihat di runtime publik
- masih belum ada bukti panel-level deployment SHA, jadi parity frontend dinilai `PASS with runtime-only evidence`, bukan `panel-verified deploy evidence`

---

## 6. Backend Local vs cPanel Runtime Parity

| Area | Local Source | cPanel Runtime Evidence | Status | Catatan |
|---|---|---|---|---|
| API route `GET /api/today/session` | [backend-api/routes/api.php](../../../backend-api/routes/api.php) | route live ada | PASS | canonical today route sinkron |
| API route `POST /api/v1/login` | source route ada | route live ada | PASS | auth endpoint sinkron |
| API route `POST /api/v1/register` | source route ada | route live ada | PASS | register endpoint sinkron |
| API route `GET /api/v1/profile` | source route ada di auth:sanctum group | route live ada | PASS | profile read sinkron |
| Community API | source route ada | route live GET/POST live | PASS | surface publik dan member sinkron secara route |
| Study Paths API | source route ada | route live ada | PASS | route parity baik |
| VerseHub books/chapter API | source route ada | route live ada | PASS | reader data contract sinkron di level route |
| Session driver | [config/session.php](../../../backend-api/config/session.php) memakai env `SESSION_DRIVER` | runtime = `file` | PASS | runtime eksplisit terbaca dari audit cPanel sebelumnya dan tetap konsisten dengan release aktif |
| Session cookie domain | source baca `SESSION_DOMAIN` | runtime = `.thechoosentalks.org` | PASS | lintas subdomain siap |
| Secure cookie | source baca `SESSION_SECURE_COOKIE` | runtime = `true` | PASS | konsisten dengan HTTPS-only production |
| Same-site policy | source baca `SESSION_SAME_SITE` | runtime = `lax` | PASS | cukup aman untuk flow saat ini |
| Sanctum stateful domains | [config/sanctum.php](../../../backend-api/config/sanctum.php) mengharapkan env `SANCTUM_STATEFUL_DOMAINS` atau fallback source | runtime = `thechoosentalks.org,www.thechoosentalks.org,api.thechoosentalks.org` | PASS | auth config backend kini fully verified live pasca-deploy dan selaras dengan target domain production utama |
| Redirect guests to frontend | [bootstrap/app.php](../../../backend-api/bootstrap/app.php) redirect ke `NEXT_PUBLIC_APP_URL` | runtime file live sudah dipetakan di cPanel blueprint | PASS | decoupled boundary sinkron |
| Web landing redirect | [routes/web.php](../../../backend-api/routes/web.php) redirect root backend ke frontend app | runtime route file ada | PASS | backend tidak dipakai sebagai public web shell utama |

### Kesimpulan backend parity
- parity route lokal ke runtime cPanel berada dalam kondisi baik
- deploy topology backend sudah konsisten dengan source lokal
- hardening source Sanctum sudah terdeploy ke release baru
- backend auth config kini `fully verified`
- tidak ada drift aktif yang tersisa pada boundary Sanctum/session production utama

---

## 7. Storage, Media, dan Asset URL Parity

Audit storage detail server sebelumnya menunjukkan:
- avatar fisik ada di `shared/storage/app/public/avatars/...`
- community image fisik ada di `shared/storage/app/public/community/posts/...`
- avatar publik diserve lewat:
  - `/api/v1/avatar/{user}`
- community image publik diserve lewat:
  - `/storage/...`

### Local source parity
- filesystem public disk:
  - [backend-api/config/filesystems.php](../../../backend-api/config/filesystems.php)
  - `public` disk -> `storage_path('app/public')`
  - `url` -> `APP_URL + /storage`
- route `storage/{path}` live tidak berasal dari custom controller aplikasi, tetapi dari internal framework Laravel

### Status parity
| Area | Status | Catatan |
|---|---|---|
| Public disk root | PASS | source dan runtime sama-sama memakai `storage/app/public` |
| Avatar delivery path | PASS | backend memang memakai API avatar route |
| Community image delivery path | PASS | payload `/storage/...` cocok dengan file fisik |
| `public/storage` symlink dependency | PARTIAL | runtime server memakai local serving route; symlink fisik tidak jadi satu-satunya jalur |

### Implikasi
- bug avatar/community image ke depan tidak boleh diasumsikan sebagai satu masalah yang sama
- avatar route dan community image route harus diaudit terpisah
- threat model untuk media exposure harus memperhitungkan dua jalur delivery:
  - API avatar
  - storage serve route

---

## 8. Auth, Session, Sanctum Parity

### Source lokal
- backend menyalakan:
  - `$middleware->statefulApi();`
  - redirect guest ke frontend app
- frontend proxy meneruskan:
  - `Authorization`
  - `Cookie`
  - `X-XSRF-TOKEN`
- helper base URL frontend fallback ke:
  - `https://api.thechoosentalks.org`

### Runtime backend
- session cookie domain production sudah tepat untuk root domain dan subdomain
- secure cookie aktif
- same-site `lax`
- stateful domains live terbaca:
  - `thechoosentalks.org`
  - `www.thechoosentalks.org`
  - `api.thechoosentalks.org`

### Parity verdict
| Area | Status | Risiko |
|---|---|---|
| Bearer-token based flow | PASS | frontend proxy dan backend auth routes sinkron |
| Cookie/session domain | PASS | cocok untuk `www` <-> `api` boundary |
| Sanctum stateful env | PASS | config live pasca-deploy sudah memuat domain production utama secara lengkap |
| CSRF forwarding in proxy | PASS | source sudah meneruskan header penting |

### Catatan penting
- aplikasi saat ini masih aman berjalan cukup jauh dengan kombinasi:
  - bearer token
  - proxy forwarding
  - secure cookie domain
- env production `SANCTUM_STATEFUL_DOMAINS` kini sudah selaras dengan kebutuhan domain production utama

---

## 9. Filament, MySQL, dan Boundary Data

### Yang terbukti
- backend live memuat route profile, community, today, versehub, study-paths
- backend cPanel production memang menjalankan Laravel production yang terhubung ke data nyata
- profile live terautentikasi pernah berhasil dibaca pada audit server sebelumnya dan mengembalikan:
  - user
  - `avatar_url`
  - `opsGateway`
  - `twoFactor`
- ini membuktikan boundary app -> DB -> serializer berjalan

### Yang belum dibuktikan pada audit ini
- schema diff MySQL production vs lokal
- tabel Filament/admin secara langsung
- migration parity penuh
- user/content row parity antara lokal dan production

### Verdict
- boundary aplikasi terhadap MySQL production terbukti hidup
- parity schema/database penuh masih `NOT YET VERIFIED`
- untuk pekerjaan bug, security, dan web dev, tim harus membedakan:
  - application runtime parity
  - database schema parity
  - production data parity

---

## 10. Drift dan Risiko yang Paling Penting

### Drift 1: `parity_analysis.md` lama sudah obsolete
- dokumen lama masih menyebut parity 100% dan arsitektur cPanel standalone
- ini berbahaya jika dijadikan dasar keputusan engineering

### Drift 2: Sanctum stateful domains kosong di runtime
- status lama ini sekarang sudah CLOSED
- source hardening sudah terdeploy
- runtime live kini memuat:
  - `thechoosentalks.org`
  - `www.thechoosentalks.org`
  - `api.thechoosentalks.org`

### Drift 3: Frontend build strictness terlalu longgar
- `ignoreBuildErrors: true`
- `ignoreDuringBuilds: true`
- ini membuat Tencent bisa menayangkan artifact yang build-nya lolos walau ada kualitas source yang seharusnya memblokir release

### Drift 4: MySQL parity belum dijadikan artefak audit tersendiri
- aplikasi hidup bukan berarti schema parity aman
- domain profile/community/opsGateway tetap punya potensi drift data

### Drift 5: Banyak dokumen architecture lama masih memuat asumsi obsolete
- khususnya file lama yang masih menyebut:
  - `frontend-prod`
  - deploy backend via GitHub Actions ke cPanel
- file-file itu tidak boleh dipakai sebagai baseline aktif tanpa review ulang

---

## 11. Parity Verdict Akhir

### Frontend lokal vs Tencent
Verdict: `MOSTLY IN SYNC`

Alasan:
- marker source penting sudah terlihat di runtime publik
- login/signup/proxy/auth surface terlihat sudah lebih selaras
- VerseHub overlay suppression marker juga sudah muncul di runtime

Batasan:
- belum ada panel-level deployment SHA verification

### Backend lokal vs cPanel
Verdict: `IN SYNC WITH ONE AUTH CONFIG RISK`

Alasan:
- route parity baik
- session config inti baik
- deploy topology sinkron

Batasan:
- `SANCTUM_STATEFUL_DOMAINS` kosong di runtime adalah drift yang harus dicatat serius

### Monorepo hybrid secara keseluruhan
Verdict: `OPERATIONALLY USABLE WITH BACKEND AUTH FULLY VERIFIED`

Maknanya:
- cukup kuat untuk bug cleanup, security triage, dan web development
- belum cukup untuk mengklaim full parity final lintas source, runtime, env, dan database karena schema MySQL production dan Tencent panel-level deployment evidence masih punya batasan tersendiri

---

## 12. Cara Memakai Audit Ini untuk Pekerjaan Selanjutnya

### Untuk bug fixing
Gunakan dokumen ini untuk menentukan bug termasuk layer mana:
- frontend runtime
- backend runtime
- auth/session
- storage/media
- DB/schema

### Untuk security threat review
Mulai dari boundary ini:
- public web `www.thechoosentalks.org`
- API `api.thechoosentalks.org`
- bearer token vs cookie session
- avatar route vs storage route
- admin/Filament boundary

### Untuk web development
Sebelum klaim sebuah fix selesai, tandai dulu:
- patched in source
- proven in public runtime
- proven in backend runtime
- proven authenticated
- proven against real storage/data

---

## 13. Command Pack untuk Audit Ulang

### A. Audit source lokal
```powershell
git rev-parse HEAD
Get-Content package.json -First 80
Get-Content next.config.ts -First 120
Get-Content backend-api/routes/api.php -First 220
Get-Content src/lib/laravel-api.ts -First 220
Get-Content src/lib/proxy-laravel.ts -First 220
```

### B. Audit frontend runtime publik
```powershell
$html=(Invoke-WebRequest 'https://www.thechoosentalks.org/login' -UseBasicParsing).Content
$m=[regex]::Matches($html,'/_next/static/chunks/app/login/page-[^\"'']+\.js')
$chunk=$m.Value | Select-Object -First 1
$js=(Invoke-WebRequest ('https://www.thechoosentalks.org' + $chunk) -UseBasicParsing).Content
'JS_HAS_MASUK=' + [string]($js -match 'Masuk')
'JS_HAS_BUKA_BLOKIR=' + [string]($js -match 'Buka Blokir')
'JS_HAS_SIGNUP=' + [string]($js -match 'intent=signup')
'JS_HAS_REGISTER_PROXY=' + [string]($js -match '/api/auth/register')
```

### C. Audit backend runtime cPanel
```bash
cd /home/thechoosentalks/deploy/apps/thechoosentalks/current
php artisan route:list --path=api | grep -E "today/session|api/v1/login|api/v1/register|api/v1/profile|community/posts|study-paths|versehub/.*/books|versehub/.*/chapter"
php artisan tinker --execute="echo 'APP_URL='.config('app.url').PHP_EOL; echo 'SESSION_DRIVER='.config('session.driver').PHP_EOL; echo 'SESSION_DOMAIN='.config('session.domain').PHP_EOL; echo 'SESSION_SECURE_COOKIE='.(config('session.secure')?'true':'false').PHP_EOL; echo 'SESSION_SAME_SITE='.config('session.same_site').PHP_EOL; echo 'SANCTUM_STATEFUL_DOMAINS='.(env('SANCTUM_STATEFUL_DOMAINS') ?: '').PHP_EOL;"
```

### D. Audit authenticated profile safely
Gunakan hanya bila operator memang berwenang, dan revoke token segera setelah selesai.

```bash
cd /home/thechoosentalks/deploy/apps/thechoosentalks/current
php artisan tinker --execute="\$user=\App\Models\User::find(3); \$token=\$user->createToken('audit-temp')->plainTextToken; echo \$token.PHP_EOL;"
curl -H "Authorization: Bearer <TOKEN_SEMENTARA>" https://api.thechoosentalks.org/api/v1/profile
php artisan tinker --execute="\App\Models\PersonalAccessToken::where('name','audit-temp')->delete();"
```

---

## 14. Recommended Next Hardening

1. Verifikasi dan perbaiki `SANCTUM_STATEFUL_DOMAINS` di production env cPanel.
2. Buat audit schema MySQL terpisah agar parity database tidak lagi implisit.
3. Kurangi build leniency di frontend:
   - matikan `ignoreBuildErrors`
   - matikan `ignoreDuringBuilds`
4. Tandai dokumen architecture lama yang masih memuat `frontend-prod` atau CI deploy backend sebagai `historical`.
5. Simpan parity audit lanjutan per domain penting:
   - today
   - profile
   - community
   - versehub
   - auth

---

## 15. Final Summary

Parity hybrid monorepo saat ini tidak lagi boleh dibaca dengan kacamata lama.

Kondisi real saat audit ini:
- source lokal frontend dan backend sudah cukup selaras dengan runtime publik
- frontend Tencent menunjukkan marker bahwa source baru sudah masuk ke artifact live
- backend cPanel menunjukkan route parity yang baik terhadap source lokal
- auth/session boundary backend production kini fully verified untuk domain utama
- storage/media blueprint sudah cukup kuat untuk membantu bug cleanup
- MySQL/Filament parity penuh masih membutuhkan audit lanjutan tersendiri

Kesimpulan kerja:
- dokumen ini cukup kuat untuk jadi baseline engineering sync
- cukup aman dipakai untuk bug fixing dan security triage
- belum boleh dipakai untuk mengklaim full production parity final lintas semua layer
