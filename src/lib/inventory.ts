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

export type ExpiryZone = "urgent" | "soon" | "later";

/** Whole days between `today` (YYYY-MM-DD) and `expiresAt` (YYYY-MM-DD).
 * Negative when already expired. */
export function daysUntil(expiresAt: string, today: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(`${today}T00:00:00.000Z`).getTime();
  const end = new Date(`${expiresAt}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / msPerDay);
}

/** Classifies an item into the three visual zones from the design spec:
 * expiring within 48h, within 5 days, or later. */
export function expiryZone(expiresAt: string, today: string): ExpiryZone {
  const days = daysUntil(expiresAt, today);
  if (days <= 2) return "urgent";
  if (days <= 5) return "soon";
  return "later";
}

export function daysForStorage(
  storage: StorageMode,
  days: { days_fridge: number | null; days_pantry: number | null; days_freezer: number | null },
): number | null {
  if (storage === "fridge") return days.days_fridge;
  if (storage === "pantry") return days.days_pantry;
  return days.days_freezer;
}
