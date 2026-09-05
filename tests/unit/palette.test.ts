import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { FADE, INK, JAMAICA, NOPAL, PAPER, SAND } from "@/lib/palette";

// src/lib/palette.ts exists only because next/og (the shareable summary
// image route) can't consume CSS custom properties. This test guards
// against exactly the regression found once already: the image route kept
// the pre-WCAG-fix --fade value after globals.css was corrected. Any drift
// between the two sources should fail here instead of silently reappearing
// on the exported image.
const globalsCss = readFileSync(
  join(__dirname, "..", "..", "src", "app", "globals.css"),
  "utf-8",
);

function cssVar(name: string): string {
  const match = globalsCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`));
  if (!match) throw new Error(`--${name} not found in globals.css`);
  return match[1];
}

describe("palette.ts stays in sync with globals.css", () => {
  it.each([
    ["paper", PAPER],
    ["ink", INK],
    ["nopal", NOPAL],
    ["jamaica", JAMAICA],
    ["sand", SAND],
    ["fade", FADE],
  ])("--%s matches", (name, value) => {
    expect(value.toLowerCase()).toBe(cssVar(name).toLowerCase());
  });
});
