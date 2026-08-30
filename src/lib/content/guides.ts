export type Guide = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  sections: { heading: string; body: string[] }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "cara-memulai-fitness-dari-nol",
    title: "Cara memulai fitness dari nol",
    date: "2026-06-20",
    excerpt:
      "Pemula tidak butuh program paling canggih. Yang dibutuhkan adalah langkah kecil yang bisa dijalani.",
    sections: [
      {
        heading: "Tentukan tujuan, lalu bangun kebiasaan",
        body: [
          "Turun berat badan, kurangi lemak, bangun otot, atau sekadar lebih bugar — tulis satu tujuan utama. Untuk pemula, yang lebih penting dari program terbaik adalah kebiasaan latihan yang konsisten.",
        ],
      },
      {
        heading: "Mulai sederhana, tiga kali seminggu",
        body: [
          "Kesalahan paling sering: melakukan terlalu banyak sekaligus. Tubuh tidak butuh latihan ekstrem. Tiga sesi seminggu, fokus teknik, sudah cukup.",
          "Contoh: squat, push-up, dan row di hari pertama. Latihan beban membantu bakar kalori, jaga tulang, dan menambah kekuatan — termasuk kalau tujuannya fat loss.",
        ],
      },
      {
        heading: "Makan, protein, tidur",
        body: [
          "Tidak perlu diet ekstrem. Perbanyak protein, sayur, air; kurangi minuman manis. Tidur 7–9 jam. Itu fondasi yang lebih berguna daripada ganti program setiap minggu.",
        ],
      },
    ],
  },
  {
    slug: "protein-untuk-membangun-otot",
    title: "Berapa banyak protein untuk membangun otot",
    date: "2026-06-25",
    excerpt:
      "Kebanyakan orang yang aktif cukup di kisaran 1,6–2,2 gram per kilogram berat badan per hari.",
    sections: [
      {
        heading: "Kenapa protein penting",
        body: [
          "Latihan beban merusak serat otot secara mikro. Tubuh memperbaikinya supaya lebih kuat. Protein menyediakan asam amino untuk proses itu.",
        ],
      },
      {
        heading: "Berapa yang cukup",
        body: [
          "Untuk yang aktif olahraga, target realistis 1,6–2,2 g/kg. Berat 70 kg berarti sekitar 112–154 gram sehari. Lebih banyak dari itu tidak otomatis mempercepat otot.",
          "Sumber sehari-hari: dada ayam, telur, ikan, tempe, tahu, yogurt. Whey praktis, bukan wajib.",
        ],
      },
    ],
  },
  {
    slug: "progressive-overload-untuk-pemula",
    title: "Progressive overload untuk pemula",
    date: "2026-06-23",
    excerpt:
      "Kalau latihan selalu sama, tubuh tidak punya alasan untuk jadi lebih kuat.",
    sections: [
      {
        heading: "Apa itu progressive overload",
        body: [
          "Naikkan tuntutan latihan secara bertahap. Bukan harus nambah beban setiap sesi. Bisa nambah repetisi, set, kualitas teknik, atau range of motion.",
        ],
      },
      {
        heading: "Yang sering salah",
        body: [
          "Terlalu cepat naik beban sampai teknik rusak. Mengejar capek, bukan progres. Tidak mencatat latihan, jadi tidak tahu apakah benar-benar naik.",
          "Catat beban, repetisi, dan set. Coach FortyFit yang bantu pantau progresnya.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
