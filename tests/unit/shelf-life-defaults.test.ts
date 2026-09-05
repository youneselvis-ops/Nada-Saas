import { describe, expect, it } from "vitest";
import { CATEGORY_DEFAULTS } from "@/lib/shelf-life-defaults";
import { CATEGORIES } from "@/lib/extraction/schema";

describe("CATEGORY_DEFAULTS", () => {
  it("has a conservative fallback for every extraction category", () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_DEFAULTS[category]).toBeDefined();
      expect(CATEGORY_DEFAULTS[category].days).toBeGreaterThan(0);
      expect(["fridge", "pantry", "freezer"]).toContain(
        CATEGORY_DEFAULTS[category].storage,
      );
    }
  });
});
