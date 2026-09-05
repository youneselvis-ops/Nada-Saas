import { describe, expect, it } from "vitest";
import { isAlertHour, localDateKey, localHour } from "@/lib/notifications";

describe("localHour", () => {
  it("reads the hour in a given timezone", () => {
    // 2026-09-01T23:00:00Z is 17:00 in America/Mexico_City (UTC-6).
    expect(localHour("America/Mexico_City", new Date("2026-09-01T23:00:00Z"))).toBe(17);
  });

  it("reads the hour in a different timezone for the same instant", () => {
    // Same instant is 01:00 the next day in Europe/Paris (UTC+2 in September).
    expect(localHour("Europe/Paris", new Date("2026-09-01T23:00:00Z"))).toBe(1);
  });

  it("never returns 24 for local midnight", () => {
    expect(localHour("America/Mexico_City", new Date("2026-09-02T06:00:00Z"))).toBe(0);
  });
});

describe("localDateKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(localDateKey("America/Mexico_City", new Date("2026-09-01T23:00:00Z"))).toBe(
      "2026-09-01",
    );
  });

  it("rolls over to the next local day near midnight UTC", () => {
    expect(localDateKey("Europe/Paris", new Date("2026-09-01T23:00:00Z"))).toBe(
      "2026-09-02",
    );
  });
});

describe("isAlertHour", () => {
  it("is true at 17:00 local time", () => {
    expect(isAlertHour("America/Mexico_City", new Date("2026-09-01T23:00:00Z"))).toBe(true);
  });

  it("is false at other hours", () => {
    expect(isAlertHour("America/Mexico_City", new Date("2026-09-01T12:00:00Z"))).toBe(false);
  });
});
