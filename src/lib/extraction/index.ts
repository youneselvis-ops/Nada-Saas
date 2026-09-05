import { extractReceiptWithClaude, type ReceiptImage } from "./anthropic";
import { extractReceiptMock } from "./mock";
import type { ExtractionResult } from "./schema";

export type { ReceiptImage } from "./anthropic";
export { EXTRACTION_SYSTEM_PROMPT } from "./prompt";
export * from "./schema";

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true" || !process.env.ANTHROPIC_API_KEY;
}

export async function extractReceipt(
  images: ReceiptImage[],
): Promise<ExtractionResult> {
  if (isMockMode()) {
    return extractReceiptMock();
  }
  return extractReceiptWithClaude(images);
}
