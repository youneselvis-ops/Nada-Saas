export type ResolvedInventoryItem = {
  product_name: string;
  value_amount: number;
  status: string;
};

export type MonthlyTotals = { saved: number; wasted: number };

/** Value of items eaten ("saved") vs. thrown away ("wasted") this month. */
export function computeMonthlyTotals(items: ResolvedInventoryItem[]): MonthlyTotals {
  let saved = 0;
  let wasted = 0;
  for (const item of items) {
    if (item.status === "consumed") saved += item.value_amount;
    else if (item.status === "wasted") wasted += item.value_amount;
  }
  return { saved, wasted };
}

export type WastedProductTotal = { product_name: string; value: number };

/** Top wasted products by total value this month. */
export function topWastedProducts(
  items: ResolvedInventoryItem[],
  limit = 3,
): WastedProductTotal[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.status !== "wasted") continue;
    totals.set(item.product_name, (totals.get(item.product_name) ?? 0) + item.value_amount);
  }
  return [...totals.entries()]
    .map(([product_name, value]) => ({ product_name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export type PriceObservationInput = {
  normalized_name: string;
  unit_price: number;
  observed_at: string;
};

export type PriceVariation = {
  normalized_name: string;
  firstPrice: number;
  lastPrice: number;
  percentChange: number;
  observationCount: number;
};

/** Price change (first to last observation) for the most-purchased
 * products with at least 3 observations, per the pipeline spec. */
export function computePriceVariations(
  observations: PriceObservationInput[],
  limit = 5,
): PriceVariation[] {
  const byProduct = new Map<string, PriceObservationInput[]>();
  for (const observation of observations) {
    const list = byProduct.get(observation.normalized_name) ?? [];
    list.push(observation);
    byProduct.set(observation.normalized_name, list);
  }

  const variations: PriceVariation[] = [];
  for (const [normalized_name, obs] of byProduct) {
    if (obs.length < 3) continue;
    const sorted = [...obs].sort((a, b) => a.observed_at.localeCompare(b.observed_at));
    const firstPrice = sorted[0].unit_price;
    const lastPrice = sorted[sorted.length - 1].unit_price;
    variations.push({
      normalized_name,
      firstPrice,
      lastPrice,
      percentChange: ((lastPrice - firstPrice) / firstPrice) * 100,
      observationCount: obs.length,
    });
  }

  return variations
    .sort((a, b) => b.observationCount - a.observationCount)
    .slice(0, limit);
}

/** UTC [start, end) bounds for the calendar month containing `now`. */
export function monthBounds(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/** UTC [start, end) bounds for the calendar month before the one
 * containing `now` — used by the 1st-of-month recap email. */
export function previousMonthBounds(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
