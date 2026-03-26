# DompetKu Cash Flow PWA

Frontend mobile-first untuk aplikasi kas berbasis React + Vite yang disiapkan menuju arsitektur:

- React SPA + Vite
- PWA dengan `vite-plugin-pwa`
- Firebase Authentication
- Cloud Firestore
- Offline queue berbasis IndexedDB

## Status Saat Ini

Repo ini sekarang sudah punya fondasi awal untuk:

- installable PWA
- app shell caching melalui Workbox
- login email/password via Firebase Auth
- penyimpanan master data di IndexedDB per user
- bootstrap snapshot awal dari Firestore ke perangkat
- antrean sinkronisasi transaksi saat offline
- sinkronisasi ulang otomatis saat koneksi kembali

Yang belum aktif penuh:

- Cloud Functions untuk alur idempotency yang lebih ketat
- App Check
- FCM / push notification
- skema Firestore yang lebih granular untuk reporting lanjutan

## Prasyarat

- Node.js 20 LTS atau lebih baru
- npm
- project Firebase aktif

## Jalankan Lokal

1. Install dependency:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu sesuaikan:

   ```bash
   cp .env.example .env.local
   ```

3. Isi variabel Firebase dari Firebase Console.

   Contoh:

   ```env
   VITE_FIREBASE_API_KEY="..."
   VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="..."
   ```

4. Di Firebase Console, aktifkan:

   - Authentication > Sign-in method > Email/Password
   - Firestore Database

5. Deploy rules Firestore dari repo ini:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

6. Jalankan development server:

   ```bash
   npm run dev
   ```

7. Buka [http://localhost:3000](http://localhost:3000)

## Build Production

```bash
npm run build
```

## Catatan Offline Sync

- Snapshot utama `wallets`, `categories`, dan `transactions` disimpan di IndexedDB per user.
- `localStorage` dipertahankan untuk hal ringan seperti tema.
- Saat user menambah, mengubah, atau membatalkan transaksi, perubahan langsung diterapkan ke UI lokal.
- Perubahan itu juga dimasukkan ke antrean IndexedDB.
- Jika device offline, antrean tetap aman di browser.
- Saat koneksi kembali, frontend mencoba mengirim antrean ke Firestore.
- Sinkronisasi `wallets` dan `categories` dilakukan sebagai snapshot referensi saat user online.

## File Firebase yang Perlu Diperhatikan

- `firestore.rules`
- `firestore.indexes.json`
- `.env.local`
- `src/context/AuthContext.tsx`
- `src/lib/firebase.ts`
- `src/lib/firestoreStore.ts`
- `src/lib/transactionSync.ts`

## Langkah Lanjut yang Disarankan

1. Pindahkan mutasi transaksi sensitif ke Cloud Functions agar idempotency dan validasi saldo lebih kuat.
2. Tambahkan App Check sebelum production.
3. Pisahkan store IndexedDB menjadi domain yang lebih granular jika transaksi sudah besar.
4. Tambahkan sinkronisasi pull Firestore yang lebih cerdas untuk multi-device conflict handling.
