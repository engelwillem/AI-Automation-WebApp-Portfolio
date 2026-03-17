# Open Blockers

## Active Blockers

### 2. Authorization Header cPanel Restriction Risk
- root cause: Apache di cPanel sering memangkas HTTP Header `Authorization: Bearer`.
- file terkait: `backend-api/public/.htaccess`
- dampak: Autentikasi lintas server (*hybrid*) patah (`401 Unauthenticated`) karena header JWT lenyap.
- langkah verifikasi: Patch `CGIPassAuth On` sudah ditambahkan. Lakukan deployment staging dan hit proxy dari UI terotentikasi.
- status: **NEEDS SERVER VALIDATION**

### 3. Stateful Sanctum / CORS Missing Server Origins
- root cause: Berkas `.env` (Legacy dan Local) belum mendefinisikan origin Tencent Edge (*app.thechoosentalks.com*) pada konfigurasi `SANCTUM_STATEFUL_DOMAINS` dan `CORS_ALLOWED_ORIGINS`.
- file terkait: `backend-api/.env`
- dampak: Form submit atau *Fetch API* dari sisi browser publik dipastikan terkena pemblokiran CORS policy *Failed to Fetch*.
- langkah verifikasi: Rilis Next.js UI ke sub-domain Tencent, coba masuk dengan akun lokal valid. Pastikan *Console logs* hijau.
- status: **NEEDS SERVER VALIDATION**

### 4. Canonical Host & SSL Force Routing
- root cause: Pengalihan apex *non-www* `thechoosentalks.org` ke `www.thechoosentalks.org` beserta validasi paksaan *HTTPS* harus ditangani oleh Panel Tencent Edge / CDN untuk mencegah *redirect loop* Node.js Edge. 
- file terkait: Panel Administrasi Tencent Edge / CDN / DNS registrar. (Lokal telah menambal root `next.config.ts` untuk `/` -> `/today`).
- instruksi panel server (cPanel Apex Recovery Plan):
  1. Akses menu **Domain Settings / Page Rules** di konsol Tencent Edge/CDN.
  2. Buat **Rule 1 (HTTPS Enforce)**: Paksa asal skema origin "HTTP" (`http://www.thechoosentalks.org/`) ter-redirect ke "HTTPS" (Status 301).
  3. **Apex Redirect Logic di cPanel**: Tambahkan blok `.htaccess` berikut di direktori root public cPanel:
     ```apache
     <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{HTTP_HOST} ^thechoosentalks\.org$ [NC]
     RewriteRule ^(.*)$ https://www.thechoosentalks.org/$1 [L,R=301]
     </IfModule>
     ```
  4. Aturan ini spesifik menangkap apex dan membelokkan lalu lintas permanen (301) tanpa merusak origin Laravel. Sertifikat Let's Encrypt / AutoSSL **harus** aktif untuk apex di cPanel.
- dampak: Ketiadaan aturan peladen eksternal ini akan menjebol *Sanctum Session Domain* (sebab HTTP biasa dan apex non-www dinilai sebagai asal rentan oleh Laravel Middleware) yang berpenetrasi ke `419 Page Expired`.
- langkah verifikasi: Lakukan pengunjungan anonim (*incognito*):
  - [ ] `http://thechoosentalks.org` -> harus membelok ke `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org` -> harus membelok ke `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org/community` -> harus membelok ke `https://www.thechoosentalks.org/community`
  - [ ] `https://www.thechoosentalks.org/` -> harus membelok ke `https://www.thechoosentalks.org/today`
- bukti terbaru (2026-03-17):
  - `http://thechoosentalks.org` -> `302 Location: https://www.thechoosentalks.org`
  - `http://thechoosentalks.org/today` -> `302 Location: https://www.thechoosentalks.org/today`
  - `http://thechoosentalks.org/community` -> `302 Location: https://www.thechoosentalks.org/community`
  - `https://www.thechoosentalks.org` -> `200 OK` (`Server: edgeone-pages`)
  - `https://www.thechoosentalks.org/today` -> `200 OK` (`Server: edgeone-pages`)
  - `https://www.thechoosentalks.org/community` -> `200 OK` (`Server: edgeone-pages`)
  - `https://thechoosentalks.org` dan `https://thechoosentalks.org/community` masih gagal (`curl: (35) Recv failure: Connection was reset`)
- status: **READY FOR SERVER CONFIG**

### 5. Deployment cPanel #21 GitHub Actions Timeout
- root cause: Alamat IP dari peladen *GitHub Actions runners* ditolak oleh *Firewall* (CSF/mod_security) cPanel milik penyedia *hosting*. Titik gagal (*Failure Point*) berada secara nyata pada baris `Upload artifact and deploy scripts`: `ssh: connect to host *** port ***: Connection timed out`.
- file terkait: `.github/workflows/backend-cpanel-deploy.yml` dan konfigurasi *Security Panel* di server cPanel.
- dampak: Pipeline CI/CD `main` menjadi rongsokan dan gagal mengeksekusi otomatisasi skrip `deploy.sh`. Seluruh rilis akan tertahan.
- server execution checklist (Untuk Admin cPanel):
  - [ ] **SSH Service Validation:** Verifikasi SSH daemon (`sshd`) beroperasi tangguh. Pastikan `CPANEL_SSH_PORT` (mis. 2121 atau 22) di Github Secrets sudah cocok dengan setelan daemon.
  - [ ] **Port Validation:** Test *port* pendengar dari IP publik di luar jaringan dengan `telnet [IP] [PORT]`. Jika menggantung (*timeout*), drop di tingkat network terlarang.
  - [ ] **CSF / Firewall Validation:** Buka panel WHM -> *ConfigServer Security & Firewall*. Periksa log IP masuk terblokir (*Port Scan Tracking*) via `/var/log/lfd.log`. 
  - [ ] **Pilih & Terapkan Opsi Jaringan Terbuka (Pilih satu):**
        *Rekomendasi Utama (Paling Aman):* Gelar **VPN/Tailscale** pada OS peladen VPS, rutekan *Action Tailscale* statis dari *runner*.
        *Rekomendasi Reguler:* Otomasi daftarkan Meta rentang IP Github Actions ke file `csf.allow` (`/etc/csf/csf.allow`).
        *Opsi Pengganti Buntut:* Batalkan Push Deploy, ubah ke Arsitektur Pull Deploy (*WebHook script* pemicu dari dalam).
- re-test checklist & success criteria:
  - **HASIL TERBARU (2026-03-17 Re-run):** Workflow dieksekusi ulang tanpa *Preflight TCP probe*. Ternyata eksekusi log terbaru (Run #23188599919) kembali mogok mutlak di `Upload artifact and deploy scripts` via `scp` (`ssh: connect to host *** port ***: Connection timed out`).
- akar masalah final: Firewall IP/TCP cPanel (CSF/LFD) menolak secara statis terhadap IP luar tanpa VPN (termasuk GitHub Runner IP ranges). Ini berarti pemblokiran adalah prosedur keamanan *default*, bukan *rate-limit* aktif.
- transisi arsitektur (2026-03-17): Repositori beralih ke arsitektur **Pull-Based Deployment** termutakhir (Hardened). Memisahkan file PHP *webhook* rahasia murni di luar repositori (atau bernama *hash unguessable*), mencegah eksploitasi URL, menggunakan metode log asinkron minimal (tanpa *echo* bash), *git reset --hard* (mencegah *stash conflict*), serta strategi *cache* konservatif (menghindari `route:cache` tahap awal).
- status: **READY FOR PATCH (Pull Deploy Redesign)**

- context: Akses publik `www.thechoosentalks.org` mengalami `ERR_CERT_COMMON_NAME_INVALID`. Error ini murni konfigurasi rilis eksternal. Repo code tidak membutuhkan *patch* atau perbaikan. Titik masalah terisolasi pada sisi DNS, CDN Binding, atau SAN TLS.
- exact checks by layer:
  - **1. DNS Layer**
    - [ ] Tentukan tipe record `www` di registrar (layaknya CNAME jika pakai host CDN, atau A/AAAA jika diberi IP langsung).
    - [ ] Pastikan record `www` secara konseptual menunjuk ke *Tencent Edge* tempat aset frontend disadur.
    - [ ] Pastikan record `www` DILARANG KERAS menunjuk ke server hosting *cPanel* tempat backend ditaruh.
    - [ ] Bukti kebenaran DNS: Eksekusi `ping www.thechoosentalks.org` menghasilkan IP yang merepresentasikan server node Tencent Edge, propogasi tuntas.
  - **2. Tencent Edge / CDN Layer**
    - [ ] Verifikasi `www.thechoosentalks.org` telah ditambahkan selaiknya entitas domain (attached/bound) di control panel CDN.
    - [ ] Konfirmasi *Apex* maupun rute awalan `www` sama-sama terdaftar pada layanan aktif.
    - [ ] Cek agar taktik pemaksaan Canonical (HTTP ke HTTPS / Apex ke WWW) tidak direplika tabrakan hingga menyulut *redirect loop*.
    - [ ] Bukti kebenaran Binding: Baris domain di dasbor CDN berstatus operasional/siap layan (*Active*).
  - **3. TLS Layer**
    - [ ] Periksa rincian properti sertifikat yang menyertai lalu lintas masuk.
    - [ ] Inspeksi bahwa SAN (Subject Alternative Name) pada sertifikat meng-_cover_ kembaran ganda: `thechoosentalks.org` dan `www.thechoosentalks.org`.
    - [ ] Lakukan penerbitan ulang sertifikat (*re-issue*) dan penyematan bundel (*re-bind*) jika nama `www.` tidak tercakup di sertifikat yang aktif.
    - [ ] Bukti kebenaran TLS: *Handshake* SSL pada `curl -vI https://www.thechoosentalks.org` mengkonfirmasi CN/SAN *match*.
- target architecture:
  - Canonical Host: `www.thechoosentalks.org` (EdgeOne)
  - Redirect Host: `thechoosentalks.org` (cPanel)
- strict apex validation checklist:
  - Required validation URLs:
    - [ ] `http://thechoosentalks.org` -> expected final: `https://www.thechoosentalks.org/today`
    - [ ] `https://thechoosentalks.org` -> expected final: `https://www.thechoosentalks.org/today`
    - [ ] `http://thechoosentalks.org/today` -> expected final: `https://www.thechoosentalks.org/today`
    - [ ] `https://thechoosentalks.org/community` -> expected final: `https://www.thechoosentalks.org/community`
  - Success criteria:
    - All URLs land exactly on their expected final destination.
    - Path preservation must work natively across redirect hops without dropping context.
  - Failure patterns to watch for:
    - Redirect loops (`ERR_TOO_MANY_REDIRECTS`).
    - Loss of path precision (`/community` incorrectly resolving back to `/today`).
    - Mixed-host issues where `thechoosentalks.org` encounters an `ERR_CERT_COMMON_NAME_INVALID` failure.
- status: **READY FOR SERVER ACTION**

## Notes
Dokumen ini sekarang hanya memuat blocker yang masih aktif. Item yang sudah `PASS` atau `CLOSED` harus dipertahankan pada dokumen domain/feature terkait dan tidak perlu tinggal di sini.
