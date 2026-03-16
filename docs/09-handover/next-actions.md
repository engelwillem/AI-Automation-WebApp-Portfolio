# Next Actions

## Immediate
1. Eksekusi konfigurasi panel DNS / Tencent Edge untuk *Domain Redirect Matrix* (Canonical Host WWW & HTTPS Force).
2. Selesaikan mitigasi Auth Header cPanel (Patch `.htaccess` sudah siap, butuh uji *Server Validation* nyata).
3. Eksekusi *Server-side Deploy Action Plan*: Admin VPS mengeksekusi *Server Execution Checklist* (me-meriksa `sshd` *port*, membaca `/var/log/lfd.log`, dan membuka blokade IP Github Actions lewat proksi Tailscale / Whitelist CSF) serta membuktikan kebebasan laluan dari aksi *Re-Test Deploy*.
4. Selesaikan *Community Smart Composer* unlinked parameters.
5. Siapkan E2E inventory (dengan host *production* kelak).

## After Immediate
1. Verifikasi Today dan VerseHub sebagai bagian dari experience layer baru
2. Siapkan release-readiness report

## Execution Rule
Jangan buka step berikutnya sebelum step sekarang berstatus PASS atau BLOCKED.
