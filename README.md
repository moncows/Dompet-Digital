# DompetKu Cash Flow PWA

Frontend mobile-first untuk aplikasi kas berbasis React + Vite yang disiapkan menuju arsitektur:

- React SPA + Vite
- PWA dengan `vite-plugin-pwa`
- Offline queue berbasis IndexedDB
- Backend stateless CodeIgniter REST API
- PostgreSQL

## Status Saat Ini

Repo ini sekarang sudah punya fondasi awal untuk:

- installable PWA
- app shell caching melalui Workbox
- penyimpanan master data di IndexedDB
- antrean sinkronisasi transaksi saat offline
- sinkronisasi ulang otomatis saat koneksi kembali

Yang belum aktif penuh:

- backend CodeIgniter API
- JWT login
- endpoint sinkronisasi transaksi yang benar-benar hidup

## Prasyarat

- Node.js 20 LTS atau lebih baru
- npm

## Jalankan Lokal

1. Install dependency:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu sesuaikan:

   ```bash
   cp .env.example .env.local
   ```

3. Isi `VITE_API_BASE_URL` dengan root API CodeIgniter kamu.

   Contoh:

   ```env
   VITE_API_BASE_URL="http://localhost/app-kas-api/public/api"
   ```

4. Jalankan development server:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000)

## Build Production

```bash
npm run build
```

## Catatan Offline Sync

- Snapshot utama `wallets`, `categories`, dan `transactions` sekarang disimpan di IndexedDB.
- `localStorage` hanya dipertahankan untuk hal ringan seperti tema dan token.
- Saat user menambah, mengubah, atau membatalkan transaksi, perubahan langsung diterapkan ke UI lokal.
- Perubahan itu juga dimasukkan ke antrean IndexedDB.
- Jika device offline, antrean tetap aman di browser.
- Saat koneksi kembali, frontend mencoba mengirim antrean ke API.

## Endpoint Backend yang Diasumsikan

Frontend saat ini menarget pola endpoint berikut:

- `POST /transactions`
- `PUT /transactions/:id`
- `PATCH /transactions/:id/cancel`

Base URL endpoint diambil dari `VITE_API_BASE_URL`.

## Langkah Lanjut yang Disarankan

1. Siapkan CodeIgniter API + JWT.
2. Pastikan setiap transaksi menerima `client_id` dari frontend untuk idempotency.
3. Tambahkan user session/auth storage yang aman.
4. Pisahkan snapshot master data, cache API, dan queue sinkronisasi ke store IndexedDB yang berbeda jika domain data mulai besar.
