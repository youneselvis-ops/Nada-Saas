import { isMockMode } from "@/lib/extraction";
import { generateRecipeWithClaude } from "./claude";
import { generateRecipeMock } from "./mock";
import type { Recipe } from "./schema";

export * from "./schema";

export async function generateRecipe(
  availableIngredients: string[],
  locale: string,
): Promise<Recipe> {
  if (isMockMode()) {
    return generateRecipeMock(availableIngredients, locale);
  }
  return generateRecipeWithClaude(availableIngredients, locale);
}
