# Profile Avatar Rendering and Frame Fix Report (2026-03-20)

## Issue Summary
Surface `/profile` mengalami masalah avatar:
- foto profil sudah dilaporkan ter-update, tetapi tidak selalu tampil di card profile
- fallback avatar terlalu kasar (inisial tunggal besar)
- frame/avatar area belum terasa matang secara visual

## Root Cause
1. **Single-source URL rendering**  
   Renderer avatar sebelumnya memakai satu URL saja. Jika URL tersebut gagal (contoh host/path `storage` tertentu), komponen langsung fallback ke inisial.

2. **Tidak ada retry kandidat URL**  
   Untuk payload `avatar_url` berbasis `/storage/...`, tidak ada mekanisme mencoba origin alternatif yang valid.

3. **State sync avatar saat profile update belum kuat**  
   Update profile umum sebelumnya melakukan spread payload mentah ke state user tanpa normalisasi jalur avatar URL yang konsisten.

## Affected Files
- `src/app/profile/page.tsx`

## Rendering Decision
- Gunakan normalisasi **candidate-based avatar URL** di frontend profile:
  - jika URL absolut `/storage/...`, simpan kandidat multi-origin (API + WEB)
  - jika URL relatif, bangun kandidat absolut dari origin yang relevan
  - saat image error, otomatis mencoba kandidat berikutnya sebelum fallback

Keputusan ini meminimalkan perubahan backend dan menjaga scope tetap di frontend profile.

## Fallback/Avatar Frame UX Decision
- Jika semua kandidat gagal atau avatar kosong:
  - fallback menampilkan inisial lebih rapi (`2-letter initials` jika tersedia)
  - tambah label mini `TCT` agar intentional
- Frame avatar diperbarui:
  - proporsi lebih stabil
  - border/ring/shadow premium
  - tombol kamera dengan affordance lebih jelas

## Remediation Applied
1. Tambah helper:
   - `buildAvatarCandidates(...)`
   - `resolveBaseUrl(...)`
   - `dedupeCandidates(...)`
   - `getInitials(...)`
2. Tambah state `avatarCandidates` di state user profile.
3. Sinkronisasi sumber avatar dari:
   - auth profile (`authUser.photoURL`)
   - payload `/api/profile` (`avatar_url`)
   - payload upload avatar (`/api/profile` PATCH spool)
4. Ubah handler `onError` image:
   - bukan langsung `avatarUrl = null`
   - melainkan shift ke kandidat URL berikutnya
5. Rapikan frame/fallback avatar card (tanpa redesign total halaman).

## Verification Evidence
- Type safety:
  - `npm run typecheck` lulus.
- Source evidence:
  - candidate pipeline aktif di `src/app/profile/page.tsx`
  - onError image kini retry candidate, bukan fallback langsung.

## Residual Risk
- Jika file avatar memang tidak ada di kedua origin (API + WEB), fallback tetap dipakai (expected behavior).
- Cache browser/CDN bisa menunda refleksi avatar terbaru sesaat setelah upload.

## Final Status
`FIXED`
