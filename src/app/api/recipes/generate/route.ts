import { NextResponse } from "next/server";
import { buildRecipeCacheKey, generateRecipe } from "@/lib/recipe-generation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { itemIds } = (await request.json()) as { itemIds?: string[] };
  if (!itemIds || itemIds.length === 0) {
    return NextResponse.json({ error: "no_items" }, { status: 400 });
  }

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("product_name")
      .in("id", itemIds)
      .eq("user_id", user.id),
    supabase.from("profiles").select("locale").eq("id", user.id).single(),
  ]);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "no_items" }, { status: 400 });
  }

  const locale = profile?.locale ?? "es-MX";
  const availableIngredients = items.map((item) => item.product_name);
  const cacheKey = buildRecipeCacheKey(availableIngredients, locale);

  const { data: cached } = await supabase
    .from("recipe_cache")
    .select("recipe")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ recipe: cached.recipe, cached: true });
  }

  try {
    const recipe = await generateRecipe(availableIngredients, locale);
    await supabase.from("recipe_cache").insert({
      cache_key: cacheKey,
      locale,
      recipe,
    });
    return NextResponse.json({ recipe, cached: false });
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
