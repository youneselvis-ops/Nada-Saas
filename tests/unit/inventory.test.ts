import { describe, expect, it } from "vitest";
import { computeExpiresAt, daysForStorage } from "@/lib/inventory";

describe("computeExpiresAt", () => {
  it("adds days for fridge storage", () => {
    expect(computeExpiresAt("2026-09-01", 7)).toBe("2026-09-08");
  });

  it("adds days for pantry storage (large values)", () => {
    expect(computeExpiresAt("2026-01-01", 730)).toBe("2028-01-01");
  });

  it("adds days for freezer storage", () => {
    expect(computeExpiresAt("2026-09-01", 180)).toBe("2027-02-28");
  });

  it("handles zero days", () => {
    expect(computeExpiresAt("2026-09-01", 0)).toBe("2026-09-01");
  });

  it("rolls over month boundaries", () => {
    expect(computeExpiresAt("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("rolls over year boundaries", () => {
    expect(computeExpiresAt("2026-12-30", 5)).toBe("2027-01-04");
  });
});

describe("daysForStorage", () => {
  const days = { days_fridge: 7, days_pantry: 45, days_freezer: 180 };

  it("picks fridge days", () => {
    expect(daysForStorage("fridge", days)).toBe(7);
  });

  it("picks pantry days", () => {
    expect(daysForStorage("pantry", days)).toBe(45);
  });

  it("picks freezer days", () => {
    expect(daysForStorage("freezer", days)).toBe(180);
  });

  it("returns null when the mode has no value", () => {
    expect(
      daysForStorage("freezer", { days_fridge: 7, days_pantry: 45, days_freezer: null }),
    ).toBeNull();
  });
});
