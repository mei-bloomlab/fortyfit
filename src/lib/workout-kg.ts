export function parseOptionalKg(value?: number | string | null): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function formatKgLabel(kg?: number): string | undefined {
  const parsed = parseOptionalKg(kg);
  return parsed == null ? undefined : `${parsed}kg`;
}

export function formatExerciseDetail(sets?: string, kg?: number): string | undefined {
  const setsText = sets?.trim() || undefined;
  const kgText = formatKgLabel(kg);
  if (setsText && kgText) return `${setsText}, ${kgText}`;
  return setsText ?? kgText;
}
