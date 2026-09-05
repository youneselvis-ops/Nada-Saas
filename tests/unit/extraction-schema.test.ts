import { describe, expect, it } from "vitest";
import { extractionResultSchema } from "@/lib/extraction/schema";

const validItem = {
  raw_label: "JIT TOM 1KG",
  normalized_name: "jitomate",
  category: "produce",
  quantity: 1,
  unit: "kg",
  unit_price: 25.5,
  total_price: 25.5,
  is_food: true,
  confidence: 0.92,
};

const validPayload = {
  store_name: "Walmart",
  purchased_at: "2026-09-01",
  currency: "MXN",
  total_amount: 25.5,
  confidence: 0.9,
  items: [validItem],
};

describe("extractionResultSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(extractionResultSchema.parse(validPayload)).toEqual(validPayload);
  });

  it("accepts null for unreadable optional fields", () => {
    const payload = {
      ...validPayload,
      store_name: null,
      purchased_at: null,
      total_amount: null,
      items: [{ ...validItem, normalized_name: null, unit_price: null, total_price: null }],
    };
    expect(() => extractionResultSchema.parse(payload)).not.toThrow();
  });

  it.each([
    ["rejects an invalid currency", { ...validPayload, currency: "USD" }],
    ["rejects a malformed date", { ...validPayload, purchased_at: "09/01/2026" }],
    [
      "rejects an unknown category",
      { ...validPayload, items: [{ ...validItem, category: "toys" }] },
    ],
    [
      "rejects a confidence out of range",
      { ...validPayload, items: [{ ...validItem, confidence: 1.5 }] },
    ],
    ["rejects a missing items array", { ...validPayload, items: undefined }],
  ])("%s", (_name, payload) => {
    expect(() => extractionResultSchema.parse(payload)).toThrow();
  });
});
