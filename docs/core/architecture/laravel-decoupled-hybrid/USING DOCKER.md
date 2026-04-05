# Using Docker

Dokumen ini mengikuti keputusan parity web-versus-cPanel terbaru yang dipakai tim pada audit lokal April 2026.

## Tujuan

Docker lokal di repo ini bukan untuk meniru cPanel 1:1 di level panel hosting, tetapi untuk meniru hal yang paling menentukan perilaku aplikasi:

- frontend Next.js berjalan terpisah dari backend Laravel
- frontend melakukan proxy server-to-server ke Laravel
- backend Laravel berjalan dengan runtime yang mendekati production
- database memakai MariaDB, bukan SQLite
- session, cache, dan queue mengikuti mode production saat ini

## Parity Rules

Aturan yang dianggap wajib dari audit production:

- frontend dan backend dipisah sebagai service berbeda
- frontend publik hidup di `localhost:9002`
- backend API publik hidup di `localhost:8000`
- Next server-side proxy harus menuju `http://backend:8000`
- Laravel memakai MariaDB
- Laravel Docker memakai PHP 8.3 line
- backend env default mengikuti production untuk:
  - `FILESYSTEM_DISK=public`
  - `SESSION_DRIVER=file`
  - `CACHE_STORE=file`
  - `QUEUE_CONNECTION=sync`
- frontend tetap serverful, bukan static export

## Intentional Deviations

Penyimpangan ini sengaja dipertahankan karena localhost tidak identik dengan domain production:

- `APP_ENV=local`
- `APP_DEBUG=true`
- `APP_URL=http://localhost:8000`
- `NEXT_PUBLIC_APP_URL=http://localhost:9002`
- `SESSION_SECURE_COOKIE=false`
- `SESSION_DOMAIN=null`
- `CORS_ALLOWED_ORIGINS` dan `SANCTUM_STATEFUL_DOMAINS` diarahkan ke host lokal

Semua item di atas adalah dev-safety deviations, bukan perbedaan arsitektur.

## Topology

Service yang dijalankan:

- `frontend`
  Next.js root app, port `9002`
- `backend`
  Laravel API di `backend-api`, port `8000`
- `mariadb`
  MariaDB `11.4`, port host `3307` -> container `3306`
- `redis`
  Redis `7`, port `6379`
- `mailpit`
  utilitas lokal, port `8025`

Alur request:

1. browser memanggil `http://localhost:9002`
2. route handler Next mem-proxy request server-side ke `http://backend:8000`
3. Laravel mengakses MariaDB melalui service internal compose
4. browser hanya perlu tahu origin publik lokal, bukan host internal Docker

## File Ownership

File yang menjadi sumber kebenaran runtime Docker:

- [docker-compose.yml](/e:/thechoosentalksnext/docker-compose.yml)
- [docker/backend/Dockerfile](/e:/thechoosentalksnext/docker/backend/Dockerfile)
- [docker/backend/start.sh](/e:/thechoosentalksnext/docker/backend/start.sh)
- [docker/frontend/Dockerfile](/e:/thechoosentalksnext/docker/frontend/Dockerfile)
- [docker/frontend/start.sh](/e:/thechoosentalksnext/docker/frontend/start.sh)
- [.env.docker](/e:/thechoosentalksnext/.env.docker)
- [backend-api/.env.docker](/e:/thechoosentalksnext/backend-api/.env.docker)

## Default Env Contract

Frontend Docker env:

- `LARAVEL_API_BASE_URL=http://backend:8000`
- `NEXT_PUBLIC_LARAVEL_API_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_APP_URL=http://localhost:9002`

Backend Docker env:

- `DB_CONNECTION=mysql`
- `DB_HOST=mariadb`
- `DB_PORT=3306`
- `FILESYSTEM_DISK=public`
- `SESSION_DRIVER=file`
- `CACHE_STORE=file`
- `QUEUE_CONNECTION=sync`

## Startup Contract

Backend startup:

1. install Composer dependencies bila `vendor` belum ada
2. menunggu database siap
3. menjalankan migration hanya bila `RUN_MIGRATIONS=true`
4. membersihkan optimize cache
5. menjalankan `php artisan serve --host=0.0.0.0 --port=8000`

Frontend startup:

1. install `node_modules` bila volume masih kosong
2. memastikan binary Linux SWC untuk Next tersedia
3. menjalankan `next build` hanya bila artefak `.next` belum ada atau source lebih baru
4. bila output `standalone` tersedia, menjalankan `node .next/standalone/server.js`
5. fallback ke `next start` bila artefak standalone belum tersedia

## Jalankan

```powershell
npm run docker:up
```

Frontend Docker sekarang memakai mode `production-local` untuk smoke test:
- container menjalankan `next build` bila artefak `.next` belum ada atau source lebih baru dari build terakhir
- hasil `.next` disimpan di volume Linux terpisah agar tidak terikat filesystem host Windows
- setelah build, frontend dijalankan dengan server production Next di `http://localhost:9002`
- env frontend Docker dipaksa membaca `.env.docker` sebagai `.env.local` agar konsisten dan tidak tercampur `.env.local` host
- healthcheck frontend memukul `http://127.0.0.1:9002` dari dalam container

Helper:

- `npm run docker:down`
- `npm run docker:logs`
- `npm run docker:reset`

## Smoke Test Checklist

Setelah compose hidup, cek minimal ini:

1. `http://localhost:9002` merespons
2. `http://localhost:8000/api/v1/community/posts` merespons
3. route handler Next yang mem-proxy ke Laravel merespons
4. login flow yang memakai Laravel API tidak gagal karena host mismatch
5. upload media community tetap menghasilkan URL yang bisa diakses browser

## Current Runtime Note

Validasi runtime lokal terakhir:

- backend API `http://localhost:8000/api/v1/community/posts` merespons `200`
- frontend `http://localhost:9002` merespons `200`
- first boot production-local tetap berat karena harus membuat build Next penuh
- restart berikutnya jauh lebih cepat karena artefak `.next` tersimpan di volume Linux terpisah
