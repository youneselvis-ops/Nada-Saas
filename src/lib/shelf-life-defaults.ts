import type { StorageMode } from "@/lib/inventory";

/** Conservative fallback shelf life per category, used when a
 * `normalized_name` has no exact, alias, or fuzzy match in
 * `shelf_life_catalog`. Better to alert a day too early than a day too
 * late. */
export const CATEGORY_DEFAULTS: Record<
  string,
  { storage: StorageMode; days: number }
> = {
  produce: { storage: "fridge", days: 5 },
  dairy: { storage: "fridge", days: 7 },
  meat: { storage: "fridge", days: 2 },
  fish: { storage: "fridge", days: 2 },
  bakery: { storage: "pantry", days: 3 },
  frozen: { storage: "freezer", days: 90 },
  pantry: { storage: "pantry", days: 365 },
  beverage: { storage: "pantry", days: 180 },
  household: { storage: "pantry", days: 365 },
  other: { storage: "pantry", days: 14 },
};
