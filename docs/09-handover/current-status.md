# Current Status

## Project Stage
Proyek sekarang berada di fase `late implementation / pre-release hardening`.

Dua track utama masih berlaku:
1. parity migration domain lama ke hybrid monorepo
2. experience layer web baru berbasis relevance, reflection, journeys, dan community response

## What Is Effectively Done
- `Profile lifecycle`: domain docs menunjukkan `CLOSED`
- `Inbox / DM`: domain docs menunjukkan `CLOSED`
- `Community`: local flow utama dan smart-composer handoff menunjukkan `PASS/CLOSED`
- `Spiritual journeys`: docs terbaru menunjukkan migrasi dari local-only ke API-backed flow sudah selesai di level implementasi/verifikasi lokal

## What Is Active Now
- **Track 3: Frontend Visual Reset & Application Shell Redesign** (In Progress)
- [x] Lock Navigation Model & UI Architecture Docs.
- [x] Build `Dawn Theme` semantic styling base in `globals.css` and `AppShell.tsx`.
- [ ] Next: Implement Dawn theme explicitly on individual core screens (Today, VerseHub, Community).
- Continued resolving parity action items strictly isolated around EdgeOne and cPanel external configs.

## Current Priority
1. Rapikan dan samakan sumber kebenaran dokumentasi agar status lokal yang sudah selesai tidak tetap tercatat sebagai blocker.
2. Selesaikan parity production yang memang berada di luar repo: DNS/TLS/canonical host, CORS/Sanctum, validasi `Authorization` header di cPanel, dan akses deploy.
3. Setelah blocker server jelas, lanjutkan hardening visual/layout pada halaman aktif web dimulai dari `/today`, lalu shell halaman lain yang masih membawa pola lama.

## Reality Check
- Sebagian besar hambatan terbesar saat ini bukan lagi di ide produk atau struktur fitur.
- Risiko tertinggi ada pada `server readiness`, bukan pada komponen UI lokal.
- Dokumen parity masih memiliki beberapa status lama yang perlu dibersihkan agar tim tidak salah membaca progres.
- Bukti terbaru menunjukkan `www.thechoosentalks.org` sudah melayani halaman publik dari `edgeone-pages`, sedangkan masalah utama tersisa terkonsentrasi di jalur `https://thechoosentalks.org` (apex HTTPS / TLS / binding).

## Non-Negotiable Constraints
- root repo harus clean
- docs hanya di `docs/`
- jangan membuat file acak
- jangan lanjut step baru tanpa status jelas
