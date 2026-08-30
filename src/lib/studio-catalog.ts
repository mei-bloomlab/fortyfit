export type CatalogPackage = {
  id: string;
  name: string;
  sessions: number;
  priceIdr: number;
  archived: boolean;
};

export type CatalogExercise = {
  id: string;
  name: string;
  archived: boolean;
};

export const DEFAULT_PACKAGES: {
  name: string;
  sessions: number;
  priceIdr: number;
  sortOrder: number;
}[] = [
  { name: "Fat Loss", sessions: 4, priceIdr: 2_400_000, sortOrder: 0 },
  { name: "Fat Loss Starter", sessions: 8, priceIdr: 1_200_000, sortOrder: 1 },
  { name: "Personal Training Pemula", sessions: 12, priceIdr: 2_800_000, sortOrder: 2 },
  { name: "Strength Foundation", sessions: 12, priceIdr: 3_600_000, sortOrder: 3 },
];

export const PACKAGE_SESSION_DEFAULTS: Record<string, number> = {
  "Fat Loss": 4,
  "Couple Session": 8,
  "Fat Loss Starter": 8,
  "Personal Training Pemula": 12,
  "Strength Foundation": 12,
};

export function defaultSessionsForPackage(name: string, fallback = 8) {
  return PACKAGE_SESSION_DEFAULTS[name] ?? fallback;
}

export const DEFAULT_EXERCISES: { name: string; sortOrder: number }[] = [
  { name: "Squat", sortOrder: 0 },
  { name: "Chest Press", sortOrder: 1 },
  { name: "Goblet squat", sortOrder: 2 },
  { name: "Sit to stand", sortOrder: 3 },
  { name: "Bird dog", sortOrder: 4 },
  { name: "Hip hinge dowel", sortOrder: 5 },
  { name: "Incline push-up", sortOrder: 6 },
  { name: "Farmer carry", sortOrder: 7 },
  { name: "Band row", sortOrder: 8 },
  { name: "Romanian deadlift", sortOrder: 9 },
  { name: "Dead bug", sortOrder: 10 },
  { name: "Step-up", sortOrder: 11 },
  { name: "Glute bridge", sortOrder: 12 },
  { name: "Split squat", sortOrder: 13 },
  { name: "Calf raise", sortOrder: 14 },
];

export function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function packageLabel(name: string, sessions: number, priceIdr: number) {
  return `${name} · ${sessions} sesi · ${formatIdr(priceIdr)}`;
}

export function fallbackProgramName() {
  return DEFAULT_PACKAGES[0]?.name ?? "Fat Loss";
}
