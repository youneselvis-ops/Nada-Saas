import { describe, expect, it } from "vitest";
import {
  buildRecipeCacheKey,
  recipeSchema,
  recipeUsesOnlyAllowedIngredients,
} from "@/lib/recipe-generation/schema";

describe("recipeUsesOnlyAllowedIngredients", () => {
  const available = ["jitomate", "cebolla", "huevo"];

  it("accepts a recipe using only inventory items", () => {
    expect(
      recipeUsesOnlyAllowedIngredients(
        { ingredients: ["jitomate", "cebolla"] },
        available,
      ),
    ).toBe(true);
  });

  it("accepts a recipe mixing inventory items and basics", () => {
    expect(
      recipeUsesOnlyAllowedIngredients(
        { ingredients: ["jitomate", "aceite", "sal", "ajo"] },
        available,
      ),
    ).toBe(true);
  });

  it("rejects a recipe naming an ingredient outside inventory and basics", () => {
    expect(
      recipeUsesOnlyAllowedIngredients(
        { ingredients: ["jitomate", "queso parmesano"] },
        available,
      ),
    ).toBe(false);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(
      recipeUsesOnlyAllowedIngredients(
        { ingredients: ["  JITOMATE  ", "Aceite"] },
        available,
      ),
    ).toBe(true);
  });

  it("rejects when the recipe uses nothing from an empty inventory beyond basics", () => {
    expect(
      recipeUsesOnlyAllowedIngredients({ ingredients: ["pollo"] }, []),
    ).toBe(false);
  });
});

describe("buildRecipeCacheKey", () => {
  it("is stable regardless of input order", () => {
    expect(buildRecipeCacheKey(["b", "a"], "es-MX")).toBe(
      buildRecipeCacheKey(["a", "b"], "es-MX"),
    );
  });

  it("deduplicates repeated ingredients", () => {
    expect(buildRecipeCacheKey(["a", "a", "b"], "es-MX")).toBe(
      buildRecipeCacheKey(["a", "b"], "es-MX"),
    );
  });

  it("differs by locale for the same ingredients", () => {
    expect(buildRecipeCacheKey(["a", "b"], "es-MX")).not.toBe(
      buildRecipeCacheKey(["a", "b"], "fr-FR"),
    );
  });
});

describe("recipeSchema", () => {
  const valid = {
    title: "Sopa rápida",
    prep_minutes: 20,
    ingredients: ["jitomate", "cebolla"],
    steps: ["Corta todo.", "Cocina 15 minutos."],
  };

  it("accepts a well-formed recipe", () => {
    expect(() => recipeSchema.parse(valid)).not.toThrow();
  });

  it("rejects prep time over 30 minutes", () => {
    expect(() => recipeSchema.parse({ ...valid, prep_minutes: 45 })).toThrow();
  });

  it("rejects an empty ingredients list", () => {
    expect(() => recipeSchema.parse({ ...valid, ingredients: [] })).toThrow();
  });

  it("rejects an empty steps list", () => {
    expect(() => recipeSchema.parse({ ...valid, steps: [] })).toThrow();
  });
});
