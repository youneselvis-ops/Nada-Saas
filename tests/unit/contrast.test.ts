import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

// The NADA palette from CLAUDE.md section 10. Colors used for normal-size
// text against their actual background must clear WCAG AA (4.5:1) — "AA
// contrast verified, without announcing it" is an explicit, non-negotiable
// quality floor, not a nice-to-have.
const PAPER = "#fbfaf6";
const INK = "#16211c";
const NOPAL = "#2f6b4f";
const JAMAICA = "#a3123a";
const FADE = "#706f69";

describe("contrastRatio", () => {
  it("matches a known reference value (black on white is 21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#706f69", "#706f69")).toBeCloseTo(1, 5);
  });
});

describe("NADA palette meets WCAG AA for normal text (>= 4.5:1)", () => {
  it("ink on paper (primary text)", () => {
    expect(contrastRatio(INK, PAPER)).toBeGreaterThanOrEqual(4.5);
  });

  it("fade on paper (secondary text, used throughout the app)", () => {
    expect(contrastRatio(FADE, PAPER)).toBeGreaterThanOrEqual(4.5);
  });

  it("paper on nopal (positive button text)", () => {
    expect(contrastRatio(PAPER, NOPAL)).toBeGreaterThanOrEqual(4.5);
  });

  it("jamaica on paper (error/urgent text)", () => {
    expect(contrastRatio(JAMAICA, PAPER)).toBeGreaterThanOrEqual(4.5);
  });
});
