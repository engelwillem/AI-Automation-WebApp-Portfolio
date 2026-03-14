# Achieving 100% UI/UX Parity with Laravel Legacy

Dokumen ini adalah panduan eksekusi parity UI/UX untuk app aktif di root monorepo.

Source of truth legacy:

- `E:\thechoosentalksnext\docs\archive\TCT-Laravel-Legacy`

Target:

- Next.js app aktif di root repo (`src/app/**`) harus sama secara visual + behavior dengan Laravel legacy UI.
- Laravel di production hanya backend API + MySQL.

## 1) Definition of 100% Parity

Sebuah halaman dianggap parity 100% hanya jika seluruh poin ini match:

1. Struktur layout: urutan section, hierarchy card, sticky header/footer.
2. Token visual: warna, radius, shadow, spacing, typography, state aktif.
3. Konten UX: label, copy, empty state, loading state, error state.
4. Interaksi: navigasi, CTA, toggle, progress, disabled/loading behavior.
5. Responsive: mobile-first behavior dan breakpoint utama tetap konsisten.

Jika satu poin belum sama, status halaman adalah `NOT PARITY`.

## 2) Route-to-Route Scope

Gunakan mapping ini sebagai baseline audit utama:

- `/` (Legacy: `Auth/Welcome.tsx`) -> `src/app/page.tsx`
- `/today` (Legacy: `Today/Index.tsx`) -> `src/app/today/page.tsx`
- `/community` (Legacy: `Community/Index.tsx`) -> `src/app/community/page.tsx`
- `/inbox`, `/inbox/{id}` (Legacy: `Inbox/Index.tsx`, `Inbox/Show.tsx`) -> `src/app/inbox/**`
- `/profile` (Legacy: `Profile/Edit.tsx`) -> `src/app/profile/page.tsx`
- `/channels` (Legacy: `Channels/Index.tsx`) -> `src/app/channels/page.tsx`
- `/channels/{slug}` (Legacy: `Channels/Weekly/Index.tsx`) -> `src/app/channels/[slug]/page.tsx`
- `/channels/{slug}/{date}` (Legacy: `Channels/Weekly/Show.tsx`) -> `src/app/channels/[slug]/[date]/page.tsx`
- `/channels/sabbath-school/...` (Legacy: `Channels/SabbathSchool/*`) -> `src/app/channels/sabbath-school/**`
- `/versehub/{lang}`, `/versehub/{lang}/{slug}` (Legacy: `VerseHub/Reader.tsx`) -> `src/app/versehub/**`
- `/versehub/{lang}/study`, `/study/{slug}` (Legacy: `VerseHub/StudyPaths/*`) -> `src/app/versehub/[lang]/study/**`
- `/legal/privacy`, `/legal/terms` (Legacy: `Legal/*`) -> `src/app/legal/**`

## 3) Parity Execution Matrix

Gunakan status: `NOT STARTED`, `IN PROGRESS`, `PARITY DONE`.

| Route | Legacy Reference | Next Route | Status | Catatan Gap |
|---|---|---|---|---|
| `/` | `Auth/Welcome.tsx` | `src/app/page.tsx` | IN PROGRESS | Visual hero/feature stage masih perlu validasi akhir |
| `/today` | `Today/Index.tsx` | `src/app/today/page.tsx` | PARITY DONE | Komposisi page + cards + feed interaction shell + fallback behavior sudah diselaraskan ke baseline legacy/API-first |
| `/community` | `Community/Index.tsx` | `src/app/community/page.tsx` | PARITY DONE | Theme token parity, tab/filter state, composer, featured verse, dan member post cards sudah diselaraskan ke baseline legacy/API-first |
| `/inbox*` | `Inbox/*` | `src/app/inbox/**` | IN PROGRESS | Pola card state + thread spacing |
| `/profile` | `Profile/Edit.tsx` | `src/app/profile/page.tsx` | IN PROGRESS | Section grouping + density controls |
| `/channels*` | `Channels/*` | `src/app/channels/**` | IN PROGRESS | Weekly detail polish + sabbath reader parity |
| `/versehub*` | `VerseHub/*` | `src/app/versehub/**` | IN PROGRESS | Reader/study path interaction detail |
| `/legal/*` | `Legal/*` | `src/app/legal/**` | NOT STARTED | Audit token & typography parity |

## 4) Batch Order (Mandatory)

Kerjakan berurutan agar tidak drift:

1. Landing + App shell baseline (`/`, nav, global tokens).
2. Today.
3. Community.
4. VerseHub (reader + study).
5. Inbox + Profile.
6. Channels (weekly + sabbath).
7. Legal + static pages.

Batch tidak boleh loncat jika batch sebelumnya belum `PARITY DONE`.

## 4.1) Audit Log (Execution)

- 2026-03-13: Audit baseline component Today section:
  - Legacy reference:
    - `resources/js/Pages/Today/components/sections/GreetingHeader.tsx`
    - `resources/js/Pages/Today/components/sections/ActionShortcutBar.tsx`
  - Implemented in active Next:
    - `src/app/today/components/sections/GreetingHeader.tsx`
    - `src/app/today/components/sections/ActionShortcutBar.tsx`
  - Result:
    - Header card shape, date pill, greeting hierarchy, dan action icon shell sudah mengikuti baseline legacy.

- 2026-03-13: Audit + implement batch parity Today cards:
  - Legacy reference:
    - `resources/js/Pages/Today/components/cards/ReflectionPrompt.tsx`
    - `resources/js/Pages/Today/components/cards/QuoteCard.tsx`
    - `resources/js/Pages/Today/components/cards/DailyPrayerCard.tsx`
    - `resources/js/Pages/Today/components/cards/CommunityCard.tsx`
    - `resources/js/Pages/Today/components/cards/QuestionOfTheDay.tsx`
    - `resources/js/Pages/Today/components/cards/TalkCard.tsx`
    - `resources/js/Pages/Today/components/cards/ReflectionCard.tsx`
    - `resources/js/Pages/Today/components/cards/PinnedLessonCard.tsx`
  - Implemented in active Next:
    - `src/app/today/components/cards/ReflectionPrompt.tsx`
    - `src/app/today/components/cards/QuoteCard.tsx`
    - `src/app/today/components/cards/DailyPrayerCard.tsx`
    - `src/app/today/components/cards/CommunityCard.tsx`
    - `src/app/today/components/cards/QuestionOfTheDay.tsx`
    - `src/app/today/components/cards/TalkCard.tsx`
    - `src/app/today/components/cards/ReflectionCard.tsx`
    - `src/app/today/components/cards/PinnedLessonCard.tsx`
  - Result:
    - Shape/radius, color tokens, card density, CTA hierarchy, dan interaction shell (like/comment/bookmark/share/sheet) ditarik kembali ke baseline legacy.

- 2026-03-13: Final batch parity `/today` page-level:
  - Target:
    - `src/app/today/page.tsx`
    - `src/app/today/components/feed/UserPostCard.tsx`
    - `src/app/today/components/feed/PrayerRequestCard.tsx`
    - `src/app/today/components/feed/SystemReflectionCard.tsx`
  - Result:
    - Page sekarang membaca payload API `/api/today` dengan fallback legacy-safe (dailyVerse, rituals, feed, pinned/welcome bila tersedia).
    - Mock interaction di feed (`console.log`) dihapus, diganti call API proxy (`/api/community/posts/{id}/pray`) dengan optimistic update + rollback jika gagal.
    - Layout wrapper `/today` dikembalikan ke baseline spacing legacy (`max-w`, `space-y`, `pb-28`, `pt-2`).

- 2026-03-13: Theme token harmonization + batch parity `/community`:
  - Target:
    - `src/app/globals.css`
    - `src/app/layout.tsx`
    - `src/layouts/AppShell.tsx`
    - `src/features/community/pages/CommunityPage.tsx`
    - `src/features/community/components/*` (ActionBar, PostComposer, MemberPostCard, QuoteCard, VerseHubFeaturedCard, PostCard)
    - `src/app/today/components/**` (sections, cards, feed) untuk normalisasi token semantic
  - Result:
    - Forced dark mode global dihapus; token `:root`/`.dark` diselaraskan dengan Laravel legacy sebagai source of truth.
    - Hardcoded warna literal (`sky/amber/violet/emerald/cyan/...`) di route aktif `/today` dan `/community` direfactor ke semantic token (`bg-surface`, `text-foreground`, `text-muted-foreground`, `bg-brand`, `ring-border`, dll).
    - Visual state tabs, cards, composer, action bar, featured verse, dan feed cards di `/community` sekarang konsisten ke sistem token yang sama dengan legacy.

## 5) Execution Workflow (Mandatory)

Untuk setiap halaman parity:

1. Ambil baseline dari legacy page source di `docs/archive/TCT-Laravel-Legacy/resources/js/Pages/**`.
2. Bandingkan dengan page aktif di `src/app/**`.
3. Tutup gap visual + behavior, bukan hanya data/API.
4. Validasi state:
   - loading
   - empty
   - success/content
   - unauthorized (jika butuh auth)
   - failure fallback
5. Ulangi sampai checklist parity halaman 100% tercentang.
6. Update status di matrix section dokumen ini.

## 6) Page-level Checklist Template

Gunakan checklist ini per halaman:

- [ ] Header/footer dan nav placement sama.
- [ ] Komposisi section/card sama.
- [ ] Typography scale, weight, line-height sama.
- [ ] Color/radius/shadow token sama.
- [ ] CTA order + label + action sama.
- [ ] Loading skeleton/spinner sama intent.
- [ ] Empty/error message sama intent.
- [ ] Mobile layout parity (≤ 430px) lolos.
- [ ] Desktop/tablet layout parity (≥ 768px) lolos.

## 7) PR Evidence Template (Wajib Isi)

Setiap PR parity wajib menyertakan:

1. Legacy file source (path).
2. Next target file (path).
3. Gap yang ditutup (bullet list).
4. State yang diverifikasi:
   - loading
   - empty
   - success
   - unauthorized (jika ada)
   - failure fallback
5. Status matrix di dokumen ini sudah diperbarui.

## 8) Release Gate for Parity

Sebelum merge:

1. `npm run typecheck`
2. `npm run build`
3. Dev smoke test:
   - `npx next dev -p 9010`
   - pastikan startup bersih
4. Isi evidence parity di deskripsi PR:
   - halaman yang diubah
   - daftar gap yang ditutup
   - state yang sudah diverifikasi

## 9) Non-Negotiable Rules

- Jangan introduce visual improv yang menyimpang dari legacy jika parity belum 100%.
- Jangan merge perubahan UI yang belum punya checklist parity halaman.
- Perubahan API tidak otomatis berarti parity UI selesai.
- Jika matrix belum diupdate, PR parity dianggap tidak valid.
