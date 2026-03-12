# Platform Config Checklist

## Tujuan

Dokumen ini merangkum konfigurasi operasional untuk:

- GitHub Secrets
- Tencent Edge
- Firebase Studio

Repo target:
- `https://github.com/engelwillem/TCT--Hybrid--Monorepo.git`

Branch target:
- backend source of truth: `main`
- frontend release: `frontend-prod`

## 1. GitHub Secrets

Masuk ke:
- `GitHub repo`
- `Settings`
- `Secrets and variables`
- `Actions`

### Field dan Nilai

- `CPANEL_SSH_HOST`
  - nilai: `209.42.27.90`
- `CPANEL_SSH_PORT`
  - nilai: `22`
- `CPANEL_SSH_USER`
  - nilai: `thechoosentalks`
- `CPANEL_DEPLOY_PATH`
  - nilai: `/home/thechoosentalks/deploy/apps/thechoosentalks`
- `CPANEL_SSH_KEY`
  - nilai: private key OpenSSH lengkap

Format `CPANEL_SSH_KEY`:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### Yang Harus Dihindari

- jangan isi `CPANEL_SSH_KEY` dengan public key `.pub`
- jangan isi host dengan domain web jika host SSH berbeda
- jangan arahkan `CPANEL_DEPLOY_PATH` ke `public_html`
- jangan simpan secret backend di file repo

## 2. Tencent Edge

Tujuan:
- frontend hanya tayang dari `frontend-prod`

### Field dan Nilai

- `Git Provider`
  - nilai: `GitHub`
- `Repository`
  - nilai: `engelwillem/TCT--Hybrid--Monorepo`
- `Branch`
  - nilai: `frontend-prod`
- `Root Directory`
  - nilai: `/`
- `Framework`
  - nilai: `Next.js`
- `Node Version`
  - nilai: `20`
- `Install Command`
  - nilai: `npm ci`
- `Build Command`
  - nilai: `npm run build`
- `Output Directory`
  - nilai: kosongkan jika preset Next.js otomatis
- `Auto Deploy`
  - nilai: aktif hanya untuk `frontend-prod`

### Environment Variables Frontend

Isi sesuai kebutuhan frontend:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `LARAVEL_API_BASE_URL`

Nilai `LARAVEL_API_BASE_URL`:
- `https://thechoosentalks.org`
  - atau origin backend Laravel produksi yang benar

### Yang Harus Dihindari

- jangan pilih branch `main`
- jangan isi `Root Directory` dengan `backend-api`
- jangan arahkan `Output Directory` ke path Laravel
- jangan campur secret backend cPanel ke Tencent Edge
- jangan pakai Tencent Edge untuk deploy backend

### Verifikasi Setelah Save

1. trigger redeploy manual dari `frontend-prod`
2. cek build log:
   - `npm ci` sukses
   - `npm run build` sukses
3. buka URL Edge
4. cek:
   - `/`
   - `/today`
   - `/community`
   - `/profile`

## 3. Firebase Studio

Tujuan:
- Firebase Studio tetap membaca repo yang sama
- frontend tetap boot dari root repo
- backend tidak ikut mengganggu startup workspace

### Field dan Nilai

- `Repository`
  - nilai: `engelwillem/TCT--Hybrid--Monorepo`
- `Branch`
  - nilai:
    - `frontend-prod` jika Firebase Studio dipakai untuk frontend release branch
    - `main` jika Firebase Studio dipakai sebagai workspace development utama
- `Workspace Root`
  - nilai: `/`
- `Startup / Preview Command`
  - nilai: `npm run dev`
  - catatan: `.idx/dev.nix` sudah mengarah ke workflow frontend root
- `Framework`
  - nilai: `Next.js`
- `Node Version`
  - nilai: `20`

### Environment Variables Frontend

Isi variable yang sama dengan frontend root jika diperlukan:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `LARAVEL_API_BASE_URL`

### Yang Harus Dihindari

- jangan ubah root ke `backend-api`
- jangan jadikan `backend-api` sebagai startup command
- jangan menambahkan script root yang memanggil `composer` atau `artisan`
- jangan menganggap Firebase Studio sebagai target deploy backend

### Verifikasi Setelah Save

1. buka workspace dari repo ini
2. pastikan file yang terbuka tetap source frontend root
3. jalankan preview
4. pastikan command yang jalan adalah `npm run dev`
5. cek bahwa frontend tetap boot walau backend belum hidup

## Rekomendasi Praktis

- GitHub Actions backend:
  - trigger dari `main`
- Tencent Edge:
  - deploy dari `frontend-prod`
- Firebase Studio:
  - gunakan `main` jika fokus development harian
  - gunakan `frontend-prod` jika ingin parity dengan branch release frontend

## Catatan Penting

- GitHub Actions path filter sudah memisahkan workflow backend dan frontend
- Tencent Edge dan Firebase Studio tetap mengikuti konfigurasi branch di dashboard mereka
- pemisahan deploy frontend yang benar-benar bersih bergantung pada branch target platform, bukan hanya pada workflow GitHub
