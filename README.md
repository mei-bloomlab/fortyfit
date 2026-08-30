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

Dua nomor, dua tugas:

- **QR / pengirim** = nomor WhatsApp FortyFit. Scan di `/admin/setting` (panel Scan WhatsApp FortyFit) dari browser **pada Mac yang sama** dengan sidecar.
- **Nomor admin** = penerima digest dan notice (field di Setting, misalnya 081293931134). Bukan nomor yang di-scan.

Paket `@whiskeysockets/baileys` tidak masuk `package.json` — Vercel tidak menginstal Baileys, Chrome, atau Puppeteer. Sidecar memakai Baileys (tanpa browser). WhatsApp Web + Chrome/Puppeteer ditolak di Mac ini.

Di laptop studio, sekali saja:

```bash
cp .env.example .env
# isi DATABASE_URL dengan Neon pooled URL yang sama seperti Vercel
npm install
npm install @whiskeysockets/baileys qrcode --no-save
npm run openwa
```

Tidak ada jendela Chrome. Buka `/admin/setting` di browser pada Mac itu. Dari HP FortyFit: WhatsApp → Setelan → Perangkat tertaut. Panel membedakan sidecar tidak terjangkau, sidecar nyala tapi QR belum terbit, QR siap, dan tersambung. HP tidak melihat `127.0.0.1` di Mac.

Kalau sesi rusak atau minta scan lagi:

```bash
rm -rf _IGNORE_baileys
npm run openwa
```

Biarkan terminal `npm run openwa` terbuka (~09–17 WITA). Sidecar mengirim antrian pending dan, setelah jam di Setting (default 09:30 WITA), **satu** ringkasan pagi ke nomor admin. Kalau laptop nyala lebih siang, ringkasan tetap dikirim sekali hari itu.

Jangan commit `.env`. Tidak perlu VPS atau tunnel.
