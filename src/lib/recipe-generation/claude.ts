import Anthropic from "@anthropic-ai/sdk";
import { buildRecipeSystemPrompt } from "./prompt";
import {
  recipeSchema,
  recipeUsesOnlyAllowedIngredients,
  type Recipe,
} from "./schema";

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response");
  return JSON.parse(match[0]);
}

async function callModel(
  client: Anthropic,
  availableIngredients: string[],
  locale: string,
  extraInstruction?: string,
): Promise<string> {
  const instruction = `Ingredientes disponibles: ${availableIngredients.join(", ")}.${
    extraInstruction ? `\n\nTu respuesta anterior no fue válida: ${extraInstruction}` : ""
  }`;

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: buildRecipeSystemPrompt(locale),
    messages: [{ role: "user", content: instruction }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model response contained no text block");
  }
  return textBlock.text;
}

function validate(raw: unknown, availableIngredients: string[]): Recipe {
  const recipe = recipeSchema.parse(raw);
  if (!recipeUsesOnlyAllowedIngredients(recipe, availableIngredients)) {
    throw new Error(
      "Recipe used an ingredient outside the provided inventory and basics list",
    );
  }
  return recipe;
}

/** Generates a recipe restricted to `availableIngredients` plus basics,
 * retrying at most once if the model violates the containment rule or the
 * schema. */
export async function generateRecipeWithClaude(
  availableIngredients: string[],
  locale: string,
): Promise<Recipe> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const text = await callModel(client, availableIngredients, locale);
    return validate(extractJson(text), availableIngredients);
  } catch (firstError) {
    const message =
      firstError instanceof Error ? firstError.message : "invalid response";
    const retryText = await callModel(client, availableIngredients, locale, message);
    return validate(extractJson(retryText), availableIngredients);
  }
}
