/** Muted tan/charcoal-adjacent pill colors for the admin month calendar. */
export const CUSTOMER_PILL_PALETTE = [
  {
    background: "oklch(0.36 0.055 80)",
    color: "oklch(0.94 0.035 80)",
    completedBackground: "oklch(0.28 0.022 80)",
    completedColor: "oklch(0.74 0.03 80)",
  },
  {
    background: "oklch(0.34 0.045 145)",
    color: "oklch(0.92 0.035 145)",
    completedBackground: "oklch(0.27 0.02 145)",
    completedColor: "oklch(0.73 0.025 145)",
  },
  {
    background: "oklch(0.35 0.055 45)",
    color: "oklch(0.93 0.035 45)",
    completedBackground: "oklch(0.28 0.022 45)",
    completedColor: "oklch(0.74 0.03 45)",
  },
  {
    background: "oklch(0.33 0.04 195)",
    color: "oklch(0.91 0.03 195)",
    completedBackground: "oklch(0.26 0.018 195)",
    completedColor: "oklch(0.72 0.022 195)",
  },
  {
    background: "oklch(0.34 0.045 320)",
    color: "oklch(0.92 0.03 320)",
    completedBackground: "oklch(0.27 0.018 320)",
    completedColor: "oklch(0.73 0.022 320)",
  },
  {
    background: "oklch(0.33 0.035 255)",
    color: "oklch(0.91 0.025 255)",
    completedBackground: "oklch(0.26 0.016 255)",
    completedColor: "oklch(0.72 0.02 255)",
  },
  {
    background: "oklch(0.35 0.04 110)",
    color: "oklch(0.93 0.03 110)",
    completedBackground: "oklch(0.27 0.018 110)",
    completedColor: "oklch(0.74 0.022 110)",
  },
  {
    background: "oklch(0.34 0.045 15)",
    color: "oklch(0.93 0.03 15)",
    completedBackground: "oklch(0.27 0.02 15)",
    completedColor: "oklch(0.73 0.022 15)",
  },
] as const;

export type CustomerPillTone = (typeof CUSTOMER_PILL_PALETTE)[number];

/** FNV-1a 32-bit. Stable across runtimes; collisions across ids are fine. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function customerColorKey(customer: {
  id?: string | null;
  name?: string | null;
}): string {
  const id = customer.id?.trim();
  if (id) return `id:${id}`;
  const name = customer.name?.trim();
  if (name) return `name:${name}`;
  return "unknown";
}

export function customerColorIndex(key: string): number {
  return hashString(key) % CUSTOMER_PILL_PALETTE.length;
}

export function customerPillTone(key: string): CustomerPillTone {
  return CUSTOMER_PILL_PALETTE[customerColorIndex(key)];
}
