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

Situs publik bisa di-deploy sekarang. Admin memakai SQLite lokal; sebelum go-live pindah ke Postgres. OpenWA belakangan, setelah live.

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
| `npm run openwa` | Sidecar WhatsApp (nanti) |
