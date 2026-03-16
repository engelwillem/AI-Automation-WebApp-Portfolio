# Database Schema Diff Log

## Purpose
Mencatat drift schema database antara local dan production yang dapat memengaruhi parity aplikasi.

Dokumen ini bukan dump SQL. Fokus pada perbedaan yang relevan terhadap runtime aplikasi.

## Status Legend
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

## Entry Template

### Entry ID
`db-diff-000`

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
- shared

### Table
Nama tabel

### Column / Index / Constraint
- Column:
- Type:
- Nullable:
- Default:
- Index/Constraint:

### Expected Local Schema
- describe:

### Observed Production Schema
- describe:

### Runtime Impact
Contoh:
- 500 pada write flow
- validation lolos tapi insert gagal
- avatar URL tidak tersimpan
- inbox unread state drift
- comment reply gagal

### Evidence
- migration file:
- model/controller dependency:
- query/runtime surface:
- observed error:

### Resolution Path
- add migration
- adjust code
- align seed
- server migration pending
- manual remediation needed

### Verification Steps
1.
2.
3.

### Status
- OPEN
- VERIFIED
- BLOCKED
- NEEDS SERVER VALIDATION
- CLOSED

---

## Critical Tables Checklist
- [x] users
- [x] profiles / user meta related tables
- [x] personal_access_tokens
- [x] inbox / messages / approvals related tables
- [x] community / comments / bookmarks / reactions related tables
- [ ] content / journey related tables bila aktif
- [ ] any upload/media table that affects UI

---

## Active Schema Drift Entries

### Entry ID
`db-diff-001`

### Date
2026-03-16

### Domain
- journeys

### Table
`user_journeys` (Belum ada)

### Column / Index / Constraint
- Column: `user_id`, `journey_id`, `day_completed`, `completed_at`
- Type: `Integer`, `String`, `Integer`, `Timestamp`

### Expected Local Schema
- describe: Untuk menyimpan *persistence state* progresi modul di "Spiritual Journeys" secara permanen pada DB.

### Observed Production Schema
- describe: Belum terdefinisikan di Backend Laravel cPanel dan Local MySQL.

### Runtime Impact
- Progres bacaan harian yang tersimpan (*Local Browser Data*) akan tersetrika/ulang menjadi Hari Ke-1 apabila pengguna berpindah gawai (dari Desktop ke iPhone), karena tak memiliki relasi persisten dengan DB.

### Evidence
- migration file: N/A
- query/runtime surface: `localStorage.getItem("tct_journey_...")` digunakan pada `src/app/paths/[slug]/page.tsx`.

### Resolution Path
- add migration

### Verification Steps
1. Migrasikan tabel pivot baru di sisi Laravel.
2. Bangun titik api yang menangkap dan melempar indeks hari terbaru dari `/paths/[slug]`.

### Status
- NEEDS SERVER VALIDATION
