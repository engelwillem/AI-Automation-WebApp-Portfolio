# Open Blockers

## Active Blockers

### 1. Community Smart Composer Unlinked Parameters
- root cause: `CommunityComposer.tsx` belum diimplementasikan untuk menangkap React `useSearchParams` URL `?intent=xyz&ref=abc`.
- file terkait: `src/features/community/components/CommunityComposer.tsx`
- dampak: Komunitas tidak bisa dipakai untuk menyambung Refleksi atau Doa dari halaman Journey/VerseHub.
- langkah verifikasi: Patch membaca nilai parameter `intent` dan `text` lewat `useSearchParams` pada `CommunityPage.tsx` dan memasukkannya ke initial props Composer. Referensi URL teraba abaikan pada rute POST demi kompatibilitas format awal. Fitur terbukti aman dan formulir mematuhi instruksi otomatis dari luar.
- status: **PASS**

### 1b. VerseHub End of Chapter Reflection Mismatch
- root cause: `VersehubReaderPage.tsx` merender prompt statik `Bagaimana ayat-ayat ini...` dan mengabaikan suplai prop dinamis `reflection_question` (dari *AI Mentor Insight* pada backend), serta tidak mencegat kondisi `has_reflected`.
- file terkait: `src/features/versehub/pages/VersehubReaderPage.tsx`
- dampak: Pengguna kehilangan konteks pertanyaan bimbingan personal dari *Backend Mentor Engine*, menjadikannya pengalaman yang monoton (*static placeholder*).
- langkah verifikasi: Bongkar objek respons pada `loadChapter`, pancing masuk ke parameter `EndOfChapterPrompt`. Pastikan tulisan di UI menyamai cetakan *Database*. (TERBUKTI)
- status: **PASS**

### 1c. VerseHub Reflection CTA to Community Transition Cut-off
- root cause: `VersehubReaderPage.tsx` merender komponen `<EndOfChapterPrompt>` yang mana tombol *Tulis Refleksimu* memanggil modal lokal eksklusif (`<ReflectionComposer>`) bukan melempar *(redirect)* pengguna menuju sistem *Smart Composer* lewat `/community?intent=reflection`.
- file terkait: `src/features/versehub/pages/VersehubReaderPage.tsx`
- dampak: Jurnal refleksi tertutup mati di backend sebagai spesimen `ReflectionResponse` tanpa pernah menjangkau papan etalase Diskusi Anggota (tidak direkam sebagai `MemberPost`). Perjalanan pengguna terbelit jalan buntu (_isolated dead-end_).
- langkah verifikasi: Patch prop `onReflect` pada panitan `<EndOfChapterPrompt>` agar memicu transisi rute langsung ke `router.push('/community?intent=reflection&ref=...&text=...&question=...` (meninggalkan modal sama sekali). Pastikan Komunitas menangkap utuh muatan parameter tersebut secara alami.
- status: **READY FOR PATCH**

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
- instruksi panel server:
  1. Akses menu **Domain Settings / Page Rules** di konsol Tencent Edge/CDN.
  2. Buat **Rule 1 (HTTPS Enforce)**: Paksa asal skema origin "HTTP" (`http://thechoosentalks.org/` dan `http://www.thechoosentalks.org/`) ter-redirect ke "HTTPS" (Status 301).
  3. Buat **Rule 2 (Apex to WWW)**: Arahkan `https://thechoosentalks.org/*` ke `https://www.thechoosentalks.org/$1` dengan status 301 Permanent. Biarkan argumen rute tersalin utuh ($1/preserve path).
  4. Sangat krusial agar Urutan (*Priority*) dieksekusi dengan mendahulukan HTTPS Force agar rute tidak nyasar.
- dampak: Ketiadaan aturan peladen eksternal ini akan menjebol *Sanctum Session Domain* (sebab HTTP biasa dan apex non-www dinilai sebagai asal rentan oleh Laravel Middleware) yang berpenetrasi ke `419 Page Expired`.
- langkah verifikasi: Lakukan pengunjungan anonim (*incognito*):
  - [ ] `http://thechoosentalks.org` -> harus membelok ke `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org` -> harus membelok ke `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org/community` -> harus membelok ke `https://www.thechoosentalks.org/community`
  - [ ] `https://www.thechoosentalks.org/` -> harus membelok ke `https://www.thechoosentalks.org/today`
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
  - [x] Admin VPS mengkonfirmasi mitigasi mod_security/firewall telah aktif sepenuhnya. (ASUMSI DIBATALKAN KARENA GAGAL)
  - [x] Pemanggilan *Re-run* pada *Deploy Job* `backend-cpanel-deploy.yml` dari panel GitHub Actions ditekankan manual.
  - [ ] **Evidence 1:** Mata rantai langkah `Upload artifact and deploy scripts` melepaskan jebakan *timeout*, log `scp` mengalir lancar ke server.
  - [ ] **Evidence 2:** Eksekusi `ssh` remote bash script menggapai baris final: `Deployment completed successfully`.
  - **HASIL TERBARU:** Pekerjaan mati di pijakan awal `Preflight TCP Reachability Check` yang berteriak `Network unreachable`. Artinya server masih menutup akses.
- status: **BLOCKED**

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
- browser validation layer:
  - [ ] `http://thechoosentalks.org` memindahkan (*redirect*) mulus ke pendaratan utama `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org` memindahkan mulus ke pendaratan utama `https://www.thechoosentalks.org/today`
  - [ ] `https://thechoosentalks.org/community` memindahkan merawat sisa lajur spesifik ke `https://www.thechoosentalks.org/community`
  - [ ] `https://www.thechoosentalks.org` memindahkan mulus ke pendaratan utama `https://www.thechoosentalks.org/today`
  - [ ] `https://www.thechoosentalks.org/today` menggapai HTTP 200 OK beserta UI termuat penuh.
- success criteria:
  - Lenyapnya ancaman *NXDOMAIN*.
  - Lenyapnya *certificate mismatch* / gembok merah/keamanan tercoreng.
  - Lenyapnya kutukan *redirect loop*.
  - Pendaratan *root* persis berpatok di garis *canonical landing*.
  - Pengetikan panjang (*Non-root paths*) mengekalkan *path* ekornya.
- status: **READY FOR SERVER EXECUTION**

## Notes
Setiap blocker harus terus dipantau dan statusnya harus dinaikkan dari BLOCKED/NV menjadi PASS/CLOSED pada lembar ini beserta `06-testing/parity/*-diff-log.md` terkait.
