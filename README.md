# FortyFit

Situs publik personal training pemula di Tabanan, plus admin studio di `/admin`.

Repo: [github.com/mei-bloomlab/fortyfit](https://github.com/mei-bloomlab/fortyfit)

- Situs: `/`
- Admin: `/admin`
- Atur jadwal: `/admin/jadwal` — pilih customer dulu, atau pilih jam dulu lalu cari yang sesinya masih sisa

Aplikasi admin studio yang lebih besar (kalau dipisah nanti) juga memakai path `/admin`, bukan `/ops`.

## Lokal

```bash
cp .env.example .env
npm install
npm run db:prepare
npm run dev
```

Buka http://127.0.0.1:43147 dan http://127.0.0.1:43147/admin

## Vercel

Situs publik bisa di-deploy sekarang. Admin memakai Neon Postgres — set `DATABASE_URL` (pooled connection string) di project Vercel untuk Production dan Preview. Jangan commit connection string.

Di Vercel, `OPENWA_MODE` harus `enqueue` (bukan mock-success). Server hanya menulis antrian reminder ke Neon. WhatsApp keluar dari laptop studio.

Admin bisa menghapus semua customer (plus jadwal, paket sesi, workout, reminder) dari `/admin/customers` atau `/admin/setting` lewat tombol **Hapus semua customer**. Setting studio, katalog paket, dan jenis latihan tetap. Tidak jalan otomatis saat boot — hanya saat tombol dikonfirmasi.

Kalau data dummy (Mei, Made Ayu, …) dibutuhkan lagi:

```bash
npm run db:seed
```

`db:seed` menghapus isi database lalu mengisi ulang dummy plus katalog default.

## Script

| Script | Kegunaan |
| --- | --- |
| `npm run dev` | Localhost port 43147 |
| `npm run db:prepare` | Prisma + seed |
| `npm run db:seed` | Isi ulang data dummy |
| `npm run openwa` | Sidecar WhatsApp + drain antrian (laptop studio) |
| `npm test` | Tes jam ringkasan pagi dan isi pesan WA |

## WhatsApp (laptop studio, tanpa VPS)

Dua orang, dua tugas:

- **Admin studio** memakai `/admin` di HP. Ambang sisa sesi, nomor WA admin, nyala/mati notice otomatis, ringkasan pagi, dan jam ringkasan diubah di **Setting**. Tidak perlu minta orang laptop edit kode.
- **Pemegang laptop** hanya menjaga Mac nyala (kira-kira 09–17 WITA) dan menjalankan sidecar.

Di laptop, sekali saja:

```bash
cp .env.example .env
# isi DATABASE_URL dengan Neon pooled URL yang sama seperti Vercel
npm install
npm run openwa
```

Scan QR WhatsApp sekali. Biarkan terminal terbuka. Sidecar mengirim antrian pending (ucapan terima kasih customer, notice admin, reminder manual) dan, setelah jam di Setting (default 09:30 WITA), mengirim **satu** ringkasan pagi ke nomor admin. Kalau laptop nyala lebih siang, ringkasan tetap dikirim sekali hari itu.

Jangan commit `.env`. Tidak perlu VPS.
