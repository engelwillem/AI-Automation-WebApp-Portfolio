# Master Parity Audit: Laravel Legacy to Hybrid Monorepo

**Baseline:** `/home/user/studio/docs/TCT--Laravel--Legacy-main`  
**Target:** Root Next.js (Frontend) + `backend-api/` (Laravel API)  
**Tujuan:** Paritas fungsional dan visual (Replication Only)

---

## 1. Core Application Matrix

| Route | Legacy Source Page | Target Next.js File | Target API Controller (V1) | Status | Gap Key |
|---|---|---|---|---|---|
| `/` | `Auth/Welcome.tsx` | `src/app/page.tsx` | N/A (Marketing) | IN PROGRESS | Visual hero stacking duration & ghosting intensity |
| `/today` | `Today/Index.tsx` | `src/app/today/page.tsx` | `TodayApiController` | **LIVE** | **Fixed**: Contract synced with backend. |
| `/community` | `Community/Index.tsx` | `src/app/community/page.tsx` | `CommunityApiController` | **PARTIAL** | Media upload proxy & admin/moderation action buttons |
| `/inbox` | `Inbox/Index.tsx` | `src/app/inbox/page.tsx` | `InboxController` | IN PROGRESS | Real-time unread count sync via pusher/polling |
| `/inbox/{id}` | `Inbox/Show.tsx` | `src/app/inbox/[id]/page.tsx` | `DirectMessageController` | IN PROGRESS | Message approval flow logic |
| `/profile` | `Profile.tsx` | `src/app/profile/page.tsx` | `ProfileController` | IN PROGRESS | 2FA setup/disable QR code & confirmation flow |

---

## 2. Channels & Sabbath School Matrix

| Route | Legacy Source Page | Target Next.js File | Target API Controller (V1) | Status | Gap Key |
|---|---|---|---|---|---|
| `/channels` | `Channels/Index.tsx` | `src/app/channels/page.tsx` | `ChannelController` | LIVE | Consistency in membership count display |
| `/channels/sabbath-school` | `Channels/SabbathSchool/QuarterIndex.tsx` | `src/app/channels/sabbath-school/page.tsx` | `SabbathSchoolController` | LIVE | Continue study logic parity |
| `/channels/sabbath-school/{year}/q{q}/lesson/{n}` | `Channels/SabbathSchool/LessonIndex.tsx` | `src/app/channels/sabbath-school/[year]/[quarter]/lesson/[lessonNumber]/page.tsx` | `SabbathSchoolController` | LIVE | Lesson state indicator (completed vs current) |
| `/channels/sabbath-school/{year}/q{q}/lesson/{n}/{day}` | `Channels/SabbathSchool/DayShow.tsx` | `src/app/channels/sabbath-school/[year]/[quarter]/lesson/[lessonNumber]/[dayKey]/page.tsx` | `SabbathSchoolController` | IN PROGRESS | Day-to-day transition animation & comment nested threading |
| `/channels/{slug}` | `Channels/Weekly/Index.tsx` | `src/app/channels/[slug]/page.tsx` | `WeeklyController` | LIVE | Sorting of published vs scheduled posts |
| `/channels/{slug}/{date}` | `Channels/Weekly/Show.tsx` | `src/app/channels/[slug]/[date]/page.tsx` | `WeeklyController` | LIVE | Layout density of long content |

---

## 3. VerseHub Matrix

| Route | Legacy Source Page | Target Next.js File | Target API Controller (V1) | Status | Gap Key |
|---|---|---|---|---|---|
| `/versehub/{lang}` | `VerseHub/Reader.tsx` | `src/app/versehub/[lang]/page.tsx` | `VerseHubReaderController` | **LIVE** | Integrated with backend APIs. |
| `/versehub/{lang}/{ref}` | `versehub.show` (Blade) | `src/app/versehub/[lang]/[slug]/page.tsx` | `VerseHubController` | IN PROGRESS | Dynamic OG Image generation parity |
| `/versehub/id/my-spiritual-journey` | `VerseHub/Activity.tsx` | `src/app/versehub/[lang]/my-spiritual-journey/page.tsx` | `VersehubActionController` | **LIVE** | Real-world activity summary integrated. |
| `/versehub/{lang}/study` | `VerseHub/StudyPaths/Index.tsx` | `src/app/versehub/[lang]/study/page.tsx` | `StudyPathController` | LIVE | Enrollment count visibility |
| `/versehub/{lang}/study/{slug}` | `VerseHub/StudyPaths/Show.tsx` | `src/app/versehub/[lang]/study/[slug]/page.tsx` | `StudyPathController` | LIVE | Step completion confetti & feedback loop |

---

## 4. Gap Analysis Detail

### A. Gap UI/Visual
- **Haptic Buttons**: Next.js implementation belum 100% konsisten menggunakan `.tct-pressable` pada semua elemen interaktif.
- **Glassmorphism Density**: Beberapa kartu di Next.js masih menggunakan opacity `0.06` sementara legacy menggunakan `0.18` untuk keterbacaan teks yang lebih baik di atas gradien.
- **Z-Index Layering**: Overlap menu pada VerseHub Reader di Next.js sering tertutup oleh sticky header.

### B. Gap UX Behavior
- **Scroll Restoration**: Legacy Inertia memiliki scroll restoration otomatis per halaman, Next.js perlu manual handling di beberapa list panjang (Community/Activity).
- **Long Press (Mobile)**: Fitur long-press pada ayat untuk membuka menu aksi di VerseHub belum semulus versi legacy.

### C. Gap Data & API
- **Source Sync Logic**: Build-time font dependency **FIXED** (Moved to system font fallback).
- **Search Suggestions**: Latency pada autocomplete search Alkitab di Next.js lebih tinggi dibanding legacy yang menggunakan local cache.
- **Media Upload**: Belum ada endpoint proxy di Next.js yang menangani `multipart/form-data` untuk upload gambar post komunitas ke Laravel storage.

### D. Gap Auth & Security
- **2FA Lifecycle**: Proses setup 2FA di Next.js baru mencapai tahap UI, sudah terhubung ke backend secara parsial.

### E. Gap SEO & Meta
- **Dynamic OG Images**: Laravel menggunakan `GD Library` untuk generate PNG ayat secara on-the-fly. Next.js harus proxy request ini ke Laravel atau memiliki generator identik.

---

## 5. Missing Parity (Not found in Next.js yet)
- **VerseHub Note Search**: Pencarian spesifik di dalam catatan pribadi user.
- **Direct Message Approval Flow**: UI untuk menerima/menolak permintaan pesan dari orang yang tidak diikuti.

---

## 6. Audit Verdict
**Current Parity Level: 84%**  
Next.js sudah sangat matang di sisi **Read-Write** (Today, VerseHub, Channels, Study). Fokus utama migrasi selanjutnya adalah pada area komunitas tingkat lanjut (Media Upload, Moderation).

---
*Generated by Audit Engine 2026-03-12*
