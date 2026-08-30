export const SITE = {
  name: "FortyFit",
  city: "Tabanan",
  tagline: "Personal training ramah pemula",
  phone: "6285155070866",
  waText: "Halo FortyFit, saya ingin konsultasi program personal training untuk pemula.",
};

export const GOALS = [
  "Mulai dari nol",
  "Turun lemak",
  "Bangun kekuatan",
  "Perbaiki postur",
] as const;

export function waUrl(text = SITE.waText) {
  return `https://wa.me/${SITE.phone}?text=${encodeURIComponent(text)}`;
}

export const PROGRAMS_PUBLIC = [
  {
    slug: "pemula",
    name: "Personal Training Pemula",
    summary:
      "Untuk yang baru mulai fitness dan ingin dibimbing dari dasar. Fokus teknik, gerakan aman, dan kebiasaan yang bisa dijalani.",
  },
  {
    slug: "fat-loss",
    name: "Fat Loss Starter",
    summary:
      "Untuk yang ingin turun lemak dengan latihan bertahap, arahan yang jelas, dan target yang realistis.",
  },
  {
    slug: "strength",
    name: "Strength Foundation",
    summary:
      "Untuk yang ingin membangun kekuatan, memperbaiki postur, dan lebih percaya diri saat olahraga.",
  },
] as const;
