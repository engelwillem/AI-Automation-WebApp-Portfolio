# Next Actions

## Eksekusi Prioritas (Production Recovery)
- [ ] Stabilisasi Data: Mengisi konten utama (Daily Verse, Rituals, Study Paths) di database production via Filament.
- [ ] UI Parity Check lanjutan: validasi state `posts=[]` + `archivePosts!=[]` tetap komunikatif untuk user.
- [ ] Hardening observability: tambah smoke script otomatis (login, today, community, versehub) pasca deploy.
- [x] Deploy frontend patch (VerseHub route/nav, OG card source, login parser, profile logout).

## Verifikasi Admin Credential (Production DB)
- [x] Validasi user `engel.willem@gmail.com` bisa login di production.
- [x] Konfirmasi status admin via `/api/profile` (`is_admin=True`).
- [x] Logout API untuk sesi admin tervalidasi.

## Dokumentasi
- [x] Audit report screenshot-based tersedia.
- [x] Roadmap eksekusi checklist tersedia.
- [x] Catat hasil re-test production final ke checklist parity + current status.
