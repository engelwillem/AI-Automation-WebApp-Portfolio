Berdasarkan audit mendalam terhadap struktur repositori monorepo, konfigurasi server (cPanel/Tencent), dan pola integrasi sistem, berikut adalah deskripsi **Tech Stack** yang digunakan oleh **TCT--Hybrid--Monorepo**:

---

### 1. Frontend (Web Application Layer)
*   **Framework Utama:** `Next.js` (App Router) dengan fokus pada performa *Server-Side Rendering* (SSR) dan *Incremental Static Regeneration* (ISR).
*   **Bahasa:** `TypeScript` (Strict Mode) untuk keamanan tipe data pada seluruh fitur ritual dan komunitas.
*   **Styling & UI:** `Tailwind CSS` untuk desain responsif bertema "Clean & Premium", dilengkapi dengan `Lucide React` untuk sistem ikonografi.
*   **Hosting:** `Tencent Edge Pages` (Serverless Edge Runtime) yang menyediakan latensi rendah global melalui CDN EdgeOne.
*   **Fitur Utama:**
    *   **Digital Sanctuary (/today):** Integrasi ritual harian dengan *dynamic payload*.
    *   **VerseHub Bible Reader:** Antarmuka pembaca Alkitab dengan normalisasi referensi otomatis.
    *   **Community Feed:** Antarmuka berbasis feed untuk berbagi refleksi dan dukungan doa.

---

### 2. Backend (API & Content Management Layer)
*   **Framework Utama:** [Laravel](cci:1://file:///e:/thechoosentalksnext/src/lib/proxy-laravel.ts:3:0-132:1) (PHP 8.x+) sebagai mesin utama API dan logika bisnis.
*   **Admin Dashboard:** `Filament` (TALL Stack: Tailwind, Alpine.js, Laravel, Livewire) untuk manajemen konten *VerseHub* dan *Today Ritual* secara internal.
*   **Arsitektur API:** `RESTful API` dengan autentikasi berbasis *Bearer Token* menggunakan `Laravel Sanctum`.
*   **Database:** `MariaDB` untuk penyimpanan data relasional (Bible Verses, Community Posts, User Profiles). Laravel tetap memakai konektor `DB_CONNECTION=mysql`.
*   **Hosting:** `cPanel` (Linux Based) dengan akses SSH terautentikasi kunci.
*   **Strategi Deployment:** **Atomic Release-based Deploy**, menggunakan sistem folder berbasis *timestamp* dan *symlink* (`current`) untuk memastikan *zero-downtime* saat pembaharuan kode.

---

### 3. Integration & Auth Layer (The Bridge)
*   **Authentication Flow:**
    *   **Frontend:** `Firebase Auth` (Client SDK) untuk manajemen session user yang cepat dan aman.
    *   **Backend Sync:** Endpoint `/api/auth/firebase/sync` untuk menyelaraskan identitas Firebase ke dalam tabel `users` lokal Laravel.
*   **API Communication:**
    *   Next.js bertindak sebagai *proxy* melalui [proxy-laravel.ts](cci:7://file:///e:/thechoosentalksnext/src/lib/proxy-laravel.ts:0:0-0:0), meneruskan permintaan dari domain utama (`www`) ke subdomain API (`api`) untuk menghindari isu CORS dan mengamankan *auth-forwarding*.

---

### 4. Infrastructure & DevOps
*   **Version Control:** `GitHub` (Private Repository) sebagai *single source of truth* untuk seluruh monorepo.
*   **CI / Deploy Reality:**
    *   `GitHub Actions` dipakai terutama untuk *checks* dan validasi source.
    *   **Frontend** tayang melalui auto-redeploy Tencent Cloud dari branch `main`.
    *   **Backend Laravel** tidak auto-deploy dari GitHub Actions; operator harus melakukan `git pull` di server/cPanel lalu menjalankan script deploy backend.
*   **Storage & Assets:**
    *   **Backend:** Sistem file lokal (`storage/app/public`) yang ditautkan melalui *shared symlink* di antara rilis backend.
    *   **Frontend:** Cloud-native assets yang di-bundle oleh sistem *build* Next.js.

---

### Audit Summary:
Ekosistem ini mengadopsi pendekatan **Hybrid Architecture**; di mana fleksibilitas `Next.js` pada *edge computing* digabungkan dengan ketangguhan `Laravel/Filament` pada *shared hosting* konvensional. Integrasi keduanya dilakukan secara ketat melalui kontrak API yang terdefinisi pada layer `TodaySessionContract` dan `CommunityResource`.
