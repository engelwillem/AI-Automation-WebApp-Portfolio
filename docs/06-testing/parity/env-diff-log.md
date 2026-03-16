# Environment Diff Log

## Purpose
Mencatat perbedaan environment yang dapat menyebabkan drift perilaku antara local, cPanel backend, dan Tencent Edge frontend.

Jangan isi nilai rahasia. Catat nama variable, peran, expected behavior, dan mismatch-nya.

## Status Legend
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

## Entry Template

### Entry ID
`env-diff-000`

### Date
YYYY-MM-DD

### Layer
- backend
- frontend
- proxy
- shared

### Variable Name
Contoh:
- APP_URL
- NEXT_PUBLIC_APP_URL
- SANCTUM_STATEFUL_DOMAINS
- SESSION_DOMAIN
- ASSET_URL
- APP_ENV

### Secret?
- yes / no

### Expected Role
Jelaskan fungsi variable terhadap runtime

### Expected Local Value Pattern
Contoh:
- `http://localhost:9002`
- `localhost,127.0.0.1`
- production host pattern

### Expected Production Value Pattern
Contoh:
- backend host production
- frontend Tencent Edge host
- cookie domain production

### Observed Local State
- configured / missing / unknown
- notes:

### Observed Production State
- configured / missing / unknown
- notes:

### Risk if Drift Exists
Contoh:
- redirect salah host
- CSRF gagal
- cookie tidak terkirim
- upload URL rusak
- share URL salah
- API proxy gagal

### Related Flows
- auth
- profile
- inbox
- community
- today
- versehub
- journeys
- all

### Verification Steps
1.
2.
3.

### Resolution
- documented
- updated env
- pending server update
- pending validation

### Status
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

---

## Critical Variables Checklist
### Backend
- [x] APP_ENV
- [x] APP_URL
- [ ] ASSET_URL
- [x] SESSION_DOMAIN
- [ ] SANCTUM_STATEFUL_DOMAINS
- [ ] CORS / frontend allowed origins related vars
- [ ] filesystem/public storage related vars

### Frontend
- [x] NEXT_PUBLIC_APP_URL
- [x] NEXT_PUBLIC_API_URL or equivalent
- [ ] any Firebase/public auth keys used by runtime
- [ ] any share/og/public asset host config

### Shared / Operational
- [x] database connection pattern documented
- [ ] queue/mail toggles that affect UX documented
- [ ] build-time vars for Tencent Edge documented
- [ ] cPanel runtime assumptions documented

---

## Active Environment Drift Entries

### Entry ID
`env-diff-002`

### Date
2026-03-16

### Layer
- backend

### Variable Name
- `CORS_ALLOWED_ORIGINS`

### Secret?
- no

### Expected Role
Menentukan domain eksternal React/Next.js (Edge Frontend) yang berhak meminjam token sesi dari rute `/api` Laravel di dalam cPanel.

### Expected Local Value Pattern
`http://localhost:9002` atau *null/kosong* karena di dalam mode lokal laravel sering membiarkan preflight port localhost.

### Expected Production Value Pattern
`https://app.thechoosentalks.com` (Ganti dengan origin pasti URL Tencent Edge).

### Observed Local State
- missing 

### Observed Production State
- unknown

### Risk if Drift Exists
- CORS Failed di Edge saat login lintas origin.

### Related Flows
- all (seluruh Endpoint API).

### Verification Steps
1. Push Laravel code dan Frontend ke Domain publik.
2. Buat origin `example.vercel.app` atau `app.tct.com` tidak terdaptar di `CORS_ALLOWED_ORIGINS`.
3. Akan tampil *red log* di console network browser.

### Resolution
- pending server update

### Status
- NEEDS SERVER VALIDATION

---

### Entry ID
`env-diff-001`

### Date
2026-03-16

### Layer
- backend

### Variable Name
- `SANCTUM_STATEFUL_DOMAINS`

### Secret?
- no

### Expected Role
Memberi privilesi CSRF Header Cookie pada domain UI Next.js untuk menghindari Laravel `VerifyCsrfToken` error (`419`).

### Expected Local Value Pattern
`localhost:9002`

### Expected Production Value Pattern
`thechoosentalks.com, app.thechoosentalks.com`

### Observed Local State
- missing
- notes: `SANCTUM_STATEFUL_DOMAINS` belum terwujud dalam .env file root `backend-api` maupun `.env.local` frontend. Ini meloloskan POST hanya perihal *Bearer* custom.

### Observed Production State
- unknown

### Risk if Drift Exists
- CSRF gagal
- Token Sanctum tidak tertanam di cookie.

### Related Flows
- auth
- profile
- inbox
- community

### Resolution
- pending validation

### Status
- NEEDS SERVER VALIDATION
