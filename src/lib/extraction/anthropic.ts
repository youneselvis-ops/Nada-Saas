import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompt";
import { extractionResultSchema, type ExtractionResult } from "./schema";

export type ReceiptImage = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

const USER_INSTRUCTION =
  "Extrae los datos de este ticket de compra según el esquema indicado. Responde únicamente con el JSON.";

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(match[0]);
}

async function callModel(
  client: Anthropic,
  images: ReceiptImage[],
  extraInstruction?: string,
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((image) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: image.mediaType,
              data: image.base64,
            },
          })),
          {
            type: "text" as const,
            text: extraInstruction
              ? `${USER_INSTRUCTION}\n\nTu respuesta anterior no cumplió el esquema: ${extraInstruction}`
              : USER_INSTRUCTION,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model response contained no text block");
  }
  return textBlock.text;
}

/** Calls the vision model, validates with Zod, and retries at most once on a
 * validation failure (per the pipeline spec: one retry, then a clean
 * failure). */
export async function extractReceiptWithClaude(
  images: ReceiptImage[],
): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const firstText = await callModel(client, images);
  const firstAttempt = extractionResultSchema.safeParse(extractJson(firstText));
  if (firstAttempt.success) return firstAttempt.data;

  const retryText = await callModel(client, images, firstAttempt.error.message);
  return extractionResultSchema.parse(extractJson(retryText));
}
