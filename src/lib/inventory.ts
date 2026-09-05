export type StorageMode = "fridge" | "pantry" | "freezer";

/** Adds `days` to `purchasedAt` (YYYY-MM-DD) in UTC, returning YYYY-MM-DD. */
export function computeExpiresAt(
  purchasedAt: string,
  days: number,
): string {
  const date = new Date(`${purchasedAt}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysForStorage(
  storage: StorageMode,
  days: { days_fridge: number | null; days_pantry: number | null; days_freezer: number | null },
): number | null {
  if (storage === "fridge") return days.days_fridge;
  if (storage === "pantry") return days.days_pantry;
  return days.days_freezer;
}
