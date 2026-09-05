import { z } from "zod";

export const recipeSchema = z.object({
  title: z.string().min(1),
  prep_minutes: z.number().int().positive().max(30),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
});

export type Recipe = z.infer<typeof recipeSchema>;

/** Basics assumed to be on hand, in both extraction languages — a recipe
 * may use these even when they're not in the user's inventory. */
export const RECIPE_BASICS = [
  "aceite",
  "huile",
  "sal",
  "sel",
  "pimienta",
  "poivre",
  "ajo",
  "ail",
  "cebolla",
  "oignon",
  "arroz",
  "riz",
  "huevo",
  "oeuf",
];

/** The one rule this whole feature exists to enforce: a recipe never names
 * an ingredient absent from the user's inventory, outside the basics list.
 * This is the automated test from the acceptance criterion, not a visual
 * check. */
export function recipeUsesOnlyAllowedIngredients(
  recipe: Pick<Recipe, "ingredients">,
  availableIngredients: string[],
): boolean {
  const allowed = new Set([
    ...availableIngredients.map((ingredient) => ingredient.toLowerCase().trim()),
    ...RECIPE_BASICS,
  ]);
  return recipe.ingredients.every((ingredient) =>
    allowed.has(ingredient.toLowerCase().trim()),
  );
}

/** Deterministic cache key for a set of available ingredients + locale, so
 * the same combination is never (re-)generated twice. */
export function buildRecipeCacheKey(
  availableIngredients: string[],
  locale: string,
): string {
  const normalized = [
    ...new Set(availableIngredients.map((i) => i.toLowerCase().trim())),
  ].sort();
  return `${locale}:${normalized.join("|")}`;
}
