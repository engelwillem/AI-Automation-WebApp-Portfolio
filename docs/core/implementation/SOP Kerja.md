# SOP UNTUK TIM WORK GEMINI DAN CODEX
Buat prompt untuk gemini dan codex yang lebih simple, efektif dan cepat di eksekusi! anda CHAT-GPT harus analisa folder /docs, agar Gemini dan Codex bekerja terkoordinasi lewat /docs, dengan aturan bahwa Gemini menulis audit + evidence dulu, lalu Codex mengeksekusi berdasarkan output dokumentasi Gemini. Karena mereka harus mendokumentasikan pekerjaan mereka pada file dan folder yang sesuai di dalam folder /docs, jadi anda harus menentukan file pada folder mana di dalam /docs untuk mereka lakukan kerjasama, gemini mencatat audit mendalam, dan codex akan menyelesaikan masalah tersebut berdasarkan output dokumentasi yang sudah gemini tulis. pastikan di folder /docs anda memutuskan dengan bijak file mana untuk codex dan gemini dapat bekerjasama, apakah buat baru atau pakai file yang sudah ada, anda harus analisa file zip saya. Urutan kerja yang benar: selesai di lokal dulu, test lokal dulu, baru nanti bicara live. Batasi scope validasi kerja masih lokal dan belum commit/push/deploy. server hanya dinyalakan saat perlu sesudah cek selesai, harus dimatikan lagi jangan dibiarkan hidup dan makan CPU desktop terus.



# SOP Stabilization (Single Branch Main)

Dokumen ini adalah standar release wajib. Semua batch kerja harus mengikuti urutan ini.
Parity UI/UX wajib mengacu ke:

- [UI_UX_PARITY_GUIDE.md](/e:/thechoosentalksnext/docs/core/architecture/laravel-decoupled-hybrid/UI_UX_PARITY_GUIDE.md)

## 1. Pre-merge Local Gate (wajib)

Jalankan dari root repo:

1. `npm run typecheck`
2. `npm run build`
3. Jalankan dev smoke:
   - `npx next dev -p 9010`
   - pastikan server start tanpa error startup
4. Validasi backend yang diubah:
   - `php -l backend-api/routes/api.php`
   - `php -l backend-api/app/Http/Controllers/<ControllerYangDiubah>.php`
5. Tutup semua bug sampai semua langkah di atas hijau.

## 2. PR Gate (wajib)

1. Commit ke branch feature.
2. Buka PR ke `main`.
3. Pastikan checklist PR terisi:
   - `.github/pull_request_template.md`
4. Merge hanya jika semua status check hijau:
   - `Frontend Monorepo Checks / frontend-checks`
   - `Backend Monorepo Checks / backend-checks`

## 3. Post-merge Deploy Gate

1. Backend deploy cPanel berjalan otomatis jika ada perubahan `backend-api/**`.
2. Frontend deploy Tencent Edge ditrigger dari workflow frontend via secret:
   - `TENCENT_EDGE_DEPLOY_HOOK_URL`
3. Jika trigger frontend gagal, release dianggap belum selesai.

## 4. Referensi kebijakan

- [BRANCH_CI_MINIMUM_POLICY.md](/e:/thechoosentalksnext/docs/core/architecture/laravel-decoupled-hybrid/BRANCH_CI_MINIMUM_POLICY.md)
