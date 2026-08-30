import { startOpenWaDrain } from "../src/lib/openwa/drain";

if (!process.env.DATABASE_URL) {
  console.error(
    "[openwa-drain] DATABASE_URL wajib. Pakai Neon pooled URL yang sama dengan Vercel. Jangan commit file .env.",
  );
  process.exit(1);
}

console.log(
  "[openwa-drain] Membaca antrian Neon dan jam ringkasan pagi dari studioSettings.",
);
startOpenWaDrain();
