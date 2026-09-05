/**
 * The NADA palette (CLAUDE.md section 10), duplicated here because
 * `next/og`'s ImageResponse (used by the shareable summary image) cannot
 * consume Tailwind classes or CSS custom properties — it needs literal
 * hex values. Keep these in sync with the `:root` custom properties in
 * `src/app/globals.css`; `tests/unit/palette.test.ts` fails if they drift.
 */
export const PAPER = "#fbfaf6";
export const INK = "#16211c";
export const NOPAL = "#2f6b4f";
export const JAMAICA = "#a3123a";
export const SAND = "#e9e3d6";
export const FADE = "#706f69";
