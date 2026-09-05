import { describe, expect, it } from "vitest";
import esMX from "@/i18n/messages/es-MX.json";
import frFR from "@/i18n/messages/fr-FR.json";

function flattenKeys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flattenKeys(value, path)
      : [path];
  });
}

describe("i18n messages", () => {
  it("es-MX and fr-FR expose the exact same keys", () => {
    const esKeys = flattenKeys(esMX).sort();
    const frKeys = flattenKeys(frFR).sort();
    expect(frKeys).toEqual(esKeys);
  });
});
