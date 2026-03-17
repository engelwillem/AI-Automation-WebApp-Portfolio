# Implementation Log: Relevance Homepage

## Actions Taken
- Membuat `src/app/today/components/sections/StateChips.tsx` untuk UI pill buttons yang menembak `onChange`.
- Mengubah `src/app/today/page.tsx` dari grid index statis ke sistem *array object mapping* (semua feed disimpan dalam memori klien dan direorder sesuai bobot state).
- Menyisipkan `<HookCard>` yang disembunyikan/tampil (*conditional render*) ketika state tertentu aktif.

## Risks/Decisions
- Pemilihan *Client-side filtering* (hanya filter di frontend UI) tanpa membebani query backend Laravel. (Resiko: batas batch data *pagination* masih perlu dipikirkan).

## Visual System Foundation (Phase 2)
### Actions Taken
- Melakukan reset besar ke `src/app/globals.css`.
- Menanam `The Dawn Theme` Color Tokens (hsl 210/215). Menghapus paksa skema `dark` mode dari css.
- Menanam `The Glassmorphism Shell` (shadow-premium, blur overlays).
- Mendaftarkan hierarki teks, spacing ultra-lapang (`radius-[40px]`), dan `tct-pressable` micro-animations.
- **Architectural Cleanup**: Membersihkan `bg-mesh` blur blobs legacy dari `AppShell` dan `MobileAppLayout` untuk murni bertumpu pada clean `bg-background` Dawn Theme.
- **Navigation Lock**: Memodifikasi `getUiNavItems` (bottom tab) dan `DesktopSidebarNav` menuju V1 Core (`Today`, `VerseHub`, `Paths`, `Community`, `Profile`) dan membuang relik lama.

### Risks/Decisions
- Modifikasi ini memaksa `globals.css` menimpa warisan tailwind *inline*. Halaman yang masih berpegang pada utilitas kaku mungkin akan perlu disesuaikan (*padding* dll). Hapus rute mati (`library`, `visitors`, dsb) akan dilakukan di fase page pruning.
