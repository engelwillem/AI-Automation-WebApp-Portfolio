# Next Actions

## Immediate
1. Pertahankan folder bernomor sebagai sumber kebenaran current web situation, dan simpan seluruh material historis hanya di `docs/archive/`.
2. Selesaikan parity production yang murni berada di luar repo:
   - fokus utama: stabilkan `https://thechoosentalks.org` karena `www.thechoosentalks.org` sudah hidup di `edgeone-pages`
   - pastikan apex HTTPS tidak lagi reset dan benar-benar mengalir ke host canonical
   - Sanctum / CORS production origin
   - validasi `Authorization` header cPanel
3. Setelah konfigurasi server disentuh, jalankan kembali `Apex Redirect Validation Checklist` dan parity validation yang relevan.

## Track 4: Backend Pipeline Fixes (Patch First)
1. [x] **Patch CI/CD Workflow**: Eksekusi pembuangan (*remove*) sesi `Preflight TCP Reachability Check` dari berkas `.github/workflows/backend-cpanel-deploy.yml`. Taktik pengosongan jaringan tersebut terbukti fatal dalam log rilis terbaru karena menyulut sensor LFD / port-scan protection cPanel yang aktif memblokir IP Github pasca-ping.
2. [x] **Pipeline Re-Run (IMMEDIATE ACTION)**: Karena *file workflow* lokal telah dihilangkan duri *TCP timeout*-nya, kode perlu diikat ke commit baru dan digeser ke *remote repository*. Validasi log Github Action secara nyata untuk memastikan blokade rilis tidak menyala.
## Track 4: Backend Pull Deploy Redesign (Active Design Lock)
1. [x] **DECISION: Push vs Pull Deploy Redesign**: Evaluasi hasil kebuntuan blokir LFD cPanel terbaru menyatakan opsi menyusup ke `scp` `ssh` diblokir permanen oleh tembok api provider hosting. Konfigurasi beralih ke arsitektur **Pull-Based Deployment**.
2. [ ] **IMPLEMENTATION: Deploy Scripts (Repo Boundary)**: Tulis `backend-api/deploy.sh` murni, difokuskan pada `git fetch --all`, `git reset --hard`, `composer install`, dan eksekusi cache secara konservatif (`optimize:clear`, `config:cache`, `view:cache`). Dilarang memakai `git stash` atau `route:cache` yang prematur.
3. [ ] **IMPLEMENTATION: Secure Webhook (Server Boundary)**: Buat skrip *template* `deploy.php` yang dilindungi dengan *secret token header*, metode abstrak POST, perlindungan terminal *log-to-file*, dan direkomendasikan ditempatkan secara rahasia sebagai `deploy-[hash].php` atau minimal di-*proxy* di cPanel, menghindari pencurian kode rahasia di dalam `.env` publik root cPanel.
4. [ ] **CI/CD Workflow**: Ubah `backend-cpanel-deploy.yml` semata-mata menjadi pemanggil API (`curl -X POST`) yang mengalokasikan Token untuk memantik Webhook tersebut seusai fase QA Code selesai.

## Track 5: Frontend Visual Reset & Component Redesign (Paused)

1. [x] **App Layout & Global Shell:** Implement `Dawn Theme` variables logic lock internally inside `globals.css` and `AppShell.tsx` layouts. Remove `bg-mesh` and old shadow artifacts.
2. [x] **Core Batch Redesign:** Apply structural redesign (`tct-card-pad`, explicit semantic mapped class instead of `slate` tokens) against `/today`, `/versehub/[uuid]`, `/paths`, dan `/community` screens. 
3. [ ] **Secondary UI Sweep**: Migrate profile, inbox, and other standalone UI routes into `Dawn Theme` constraints. Add missing responsive alignments.
4. [ ] **Page Pruning:** Execute hard delete of obsolete routes mapped as REMOVE (`/library`, `/visitors`) from `navigation-ia.md`. Fix references and linkings afterward.

## After Immediate
1. Tutup placeholder dokumentasi yang memang masih dipakai pada roadmap, architecture, dan testing.
2. Siapkan release-readiness report final setelah blocker server berubah menjadi `PASS`, `CLOSED`, atau `ACCEPTED RISK`.

## Execution Rule
Jangan buka step berikutnya sebelum step sekarang berstatus PASS atau BLOCKED.
