# API Contract Diff Log

## Purpose
Mencatat drift kontrak API antara local dan production, atau antara expected contract dan observed contract.

Jangan isi dengan dugaan umum. Setiap entry harus merujuk ke flow nyata.

## Status Legend
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

## Entry Template

### Entry ID
`api-diff-000`

### Date
YYYY-MM-DD

### Domain
- auth
- profile-lifecycle
- inbox-dm
- community
- today
- versehub
- relevance-layer
- journeys

### Flow
Contoh:
- login
- profile update
- inbox send message
- community create comment

### Endpoint
- Method:
- Local URL:
- Production URL:
- Proxy route (jika ada):

### Expected Contract
#### Request
- headers:
- query:
- params:
- body:

#### Response
- success status:
- success payload shape:
- validation error shape:
- auth error shape:
- not-found/forbidden shape:

### Observed Local Behavior
- status:
- payload:
- notes:

### Observed Production Behavior
- status:
- payload:
- notes:

### Diff Summary
- Jelaskan mismatch paling nyata

### Root Cause Hypothesis
- Env mismatch
- Proxy mismatch
- Backend code drift
- cPanel header/rewrite issue
- Tencent Edge runtime issue
- Unknown

### Files Potentially Involved
- backend:
- frontend:
- proxy:
- env/config:

### Verification Steps
1.
2.
3.

### Resolution
- Fixed / not fixed / pending

### Status
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

---

## Active Diff Entries

### Entry ID
`api-diff-002`

### Date
2026-03-16

### Domain
- auth

### Flow
- Proxy JWT Firebase to Sanctum Login Middleware

### Endpoint
- Method: ANY (via API route proxy)
- Local URL: `http://localhost:9002/api/*`
- Production URL: `https://frontend.domain.com/api/*`
- Proxy route: `src/lib/proxy-laravel.ts`

### Expected Contract
#### Request
- headers: `Authorization: Bearer <token>`
- body: Any JSON

#### Response
- success status: `200 OK` atau `201 Created`

### Observed Local Behavior
- status: `PASS`
- payload: `Auth state recognized`
- notes: Laravel `auth:sanctum` di port 8000 menangkap Request Proxy node.js dengan sukses.

### Observed Production Behavior
- status: `UNKNOWN`
- payload: ?
- notes: Shared hosting (cPanel PHP) seringkali memotong *Auth header bearer* sehingga user terbaca *Unauthenticated / 401*.

### Diff Summary
- Risiko Laravel `Auth::user()` menghasilkan *null* jika server Edge gagal mengirim pass-through Header JWT atau cPanel menendangnya duluan.

### Root Cause Hypothesis
- cPanel header/rewrite issue

### Files Potentially Involved
- backend: `.htaccess` di map `public/` Laravel.
- proxy: `src/lib/proxy-laravel.ts`

### Verification Steps
1. Push Laravel code ke Staging cPanel.
2. Hit proxy dari Postman/Insomnia.
3. Cek apakah HTTP Header Auth sampai.

### Resolution
- pending server validation

### Status
- NEEDS SERVER VALIDATION

---

### Entry ID
`api-diff-001`

### Date
2026-03-16

### Domain
- community

### Flow
- community create post (Smart Composer membedah parameter `intent`)

### Endpoint
- Method: POST
- Local URL: `http://localhost:8000/api/v1/community/posts`
- Production URL: (cPanel URL)
- Proxy route (jika ada): `http://localhost:9002/api/v1/community/posts`

### Expected Contract
#### Request
- body: `{"content": "...", "intent": "verse_reflection", "ref": "mzm-34"}`

#### Response
- success status: `201`
- success payload shape: Post created with metadata

### Observed Local Behavior
- status: `BLOCKED`
- payload: `{"content": "..."}`
- notes: Komponen `CommunityComposer.tsx` di Next.js tidak mengait (`hook`) *query parameter* `?intent=xyz` sehingga Payload `intent` kosong melompong.

### Observed Production Behavior
- status: `UNKNOWN`

### Diff Summary
- API Backend (Laravel) sudah dikonfigurasi *(Change Log 10 Maret)* mendukung kolom opsi `intent` dan `ref`, namun kontrak dari *Frontend* (UI) tumpul dan luput melampirkan *key-value* tersebut di POST form data.

### Root Cause Hypothesis
- Frontend code drift

### Files Potentially Involved
- frontend: `src/features/community/components/CommunityComposer.tsx`

### Verification Steps
1. Ganti implementasi URL Search Params di area `CommunityPage`.
2. Console log payload submit sebelum Fetch Call dilakukan.
3. Hit `201` dan lihat balasan DB apakah kolom `intent` dan `ref` terisi.

### Resolution
- pending

### Status
- BLOCKED
