import { describe, expect, it } from "vitest";
import {
  computeMonthlyTotals,
  computePriceVariations,
  monthBounds,
  previousMonthBounds,
  topWastedProducts,
} from "@/lib/monthly-summary";

describe("computeMonthlyTotals", () => {
  it("sums consumed items as saved and wasted items as wasted", () => {
    const items = [
      { product_name: "jitomate", value_amount: 20, status: "consumed" },
      { product_name: "leche", value_amount: 15, status: "wasted" },
      { product_name: "pan", value_amount: 10, status: "consumed" },
    ];
    expect(computeMonthlyTotals(items)).toEqual({ saved: 30, wasted: 15 });
  });

  it("ignores items with any other status", () => {
    const items = [{ product_name: "x", value_amount: 100, status: "active" }];
    expect(computeMonthlyTotals(items)).toEqual({ saved: 0, wasted: 0 });
  });

  it("returns zeros for an empty list", () => {
    expect(computeMonthlyTotals([])).toEqual({ saved: 0, wasted: 0 });
  });
});

describe("topWastedProducts", () => {
  it("aggregates by product and sorts by total value descending", () => {
    const items = [
      { product_name: "leche", value_amount: 10, status: "wasted" },
      { product_name: "leche", value_amount: 10, status: "wasted" },
      { product_name: "pan", value_amount: 5, status: "wasted" },
      { product_name: "jitomate", value_amount: 30, status: "wasted" },
      { product_name: "queso", value_amount: 1, status: "consumed" },
    ];
    expect(topWastedProducts(items, 3)).toEqual([
      { product_name: "jitomate", value: 30 },
      { product_name: "leche", value: 20 },
      { product_name: "pan", value: 5 },
    ]);
  });

  it("respects the limit", () => {
    const items = [
      { product_name: "a", value_amount: 1, status: "wasted" },
      { product_name: "b", value_amount: 2, status: "wasted" },
      { product_name: "c", value_amount: 3, status: "wasted" },
      { product_name: "d", value_amount: 4, status: "wasted" },
    ];
    expect(topWastedProducts(items, 3)).toHaveLength(3);
  });
});

describe("computePriceVariations", () => {
  it("requires at least 3 observations", () => {
    const observations = [
      { normalized_name: "jitomate", unit_price: 20, observed_at: "2026-08-01" },
      { normalized_name: "jitomate", unit_price: 25, observed_at: "2026-08-15" },
    ];
    expect(computePriceVariations(observations)).toEqual([]);
  });

  it("computes percent change from first to last observation", () => {
    const observations = [
      { normalized_name: "jitomate", unit_price: 20, observed_at: "2026-08-01" },
      { normalized_name: "jitomate", unit_price: 22, observed_at: "2026-08-15" },
      { normalized_name: "jitomate", unit_price: 25, observed_at: "2026-08-30" },
    ];
    const [variation] = computePriceVariations(observations);
    expect(variation.firstPrice).toBe(20);
    expect(variation.lastPrice).toBe(25);
    expect(variation.percentChange).toBe(25);
    expect(variation.observationCount).toBe(3);
  });

  it("sorts observations by date before comparing first/last, regardless of input order", () => {
    const observations = [
      { normalized_name: "leche", unit_price: 30, observed_at: "2026-08-30" },
      { normalized_name: "leche", unit_price: 20, observed_at: "2026-08-01" },
      { normalized_name: "leche", unit_price: 25, observed_at: "2026-08-15" },
    ];
    const [variation] = computePriceVariations(observations);
    expect(variation.firstPrice).toBe(20);
    expect(variation.lastPrice).toBe(30);
  });

  it("ranks by observation count and respects the limit", () => {
    const products = ["a", "b", "c", "d", "e", "f"];
    const observations = products.flatMap((name, i) =>
      Array.from({ length: 3 + i }, (_, obsIndex) => ({
        normalized_name: name,
        unit_price: 10,
        observed_at: `2026-08-${String(obsIndex + 1).padStart(2, "0")}`,
      })),
    );
    const variations = computePriceVariations(observations, 5);
    expect(variations).toHaveLength(5);
    expect(variations[0].normalized_name).toBe("f");
  });
});

describe("monthBounds", () => {
  it("returns the first day of the month through the first day of the next month", () => {
    expect(monthBounds(new Date("2026-09-15T12:00:00Z"))).toEqual({
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-10-01T00:00:00.000Z",
    });
  });

  it("handles December correctly", () => {
    expect(monthBounds(new Date("2026-12-15T12:00:00Z"))).toEqual({
      start: "2026-12-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
    });
  });
});

describe("previousMonthBounds", () => {
  it("returns the prior calendar month", () => {
    expect(previousMonthBounds(new Date("2026-09-15T12:00:00Z"))).toEqual({
      start: "2026-08-01T00:00:00.000Z",
      end: "2026-09-01T00:00:00.000Z",
    });
  });

  it("handles January rolling back to December of the prior year", () => {
    expect(previousMonthBounds(new Date("2027-01-15T12:00:00Z"))).toEqual({
      start: "2026-12-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
    });
  });
});
