"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/lib/recipe-generation/schema";

export default function RecipePage() {
  const t = useTranslations("recipe");
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const itemIds = searchParams.get("items")?.split(",").filter(Boolean) ?? [];
    if (itemIds.length === 0) {
      setError(true);
      setLoading(false);
      return;
    }

    fetch("/api/recipes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setRecipe(data.recipe))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <main className="flex min-h-svh flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-medium text-ink">{t("title")}</h1>

      {loading ? <p className="text-fade">{t("loading")}</p> : null}
      {error ? <p className="text-sm text-jamaica">{t("error")}</p> : null}

      {recipe ? (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xl text-ink">{recipe.title}</p>
            <p className="text-fade">{t("prepTime", { minutes: recipe.prep_minutes })}</p>
          </div>

          <section>
            <h2 className="pb-2 text-sm text-fade">{t("ingredientsTitle")}</h2>
            <ul className="flex flex-col border-t border-sand">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient} className="border-b border-sand py-2 text-ink">
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="pb-2 text-sm text-fade">{t("stepsTitle")}</h2>
            <ol className="flex flex-col gap-2">
              {recipe.steps.map((step, index) => (
                <li key={index} className="text-ink">
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}

      <Button asChild variant="outline" className="mt-auto">
        <Link href="/inventory">{t("back")}</Link>
      </Button>
    </main>
  );
}
