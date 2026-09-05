import type { Recipe } from "./schema";

const BASIC_FOR_LOCALE = (locale: string) =>
  locale === "fr-FR" ? ["huile", "sel"] : ["aceite", "sal"];

const STEPS_FOR_LOCALE = (locale: string) =>
  locale === "fr-FR"
    ? [
        "Coupe tous les ingrédients en petits morceaux.",
        "Fais-les revenir avec l'huile et le sel pendant 10 minutes.",
        "Sers chaud.",
      ]
    : [
        "Corta todos los ingredientes en trozos pequeños.",
        "Saltéalos con aceite y sal durante 10 minutos.",
        "Sirve caliente.",
      ];

/** Deterministic mock recipe used in MOCK_MODE. Ingredients are drawn only
 * from what's passed in plus a couple of basics, so it always satisfies the
 * same containment rule real generations are held to. */
export function generateRecipeMock(
  availableIngredients: string[],
  locale: string,
): Recipe {
  const picks = availableIngredients.slice(0, 3);
  return {
    title: locale === "fr-FR" ? "Sauté anti-gaspi" : "Salteado anti-desperdicio",
    prep_minutes: 20,
    ingredients: [...picks, ...BASIC_FOR_LOCALE(locale)],
    steps: STEPS_FOR_LOCALE(locale),
  };
}
