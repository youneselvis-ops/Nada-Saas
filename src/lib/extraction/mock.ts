import type { ExtractionResult } from "./schema";

/** Fixed, deterministic fake extraction used when ANTHROPIC_API_KEY is
 * absent (MOCK_MODE=true). This exercises the full pipeline end to end
 * without a real API key — it is not a stand-in for real OCR accuracy, so
 * `pnpm test:extraction` never counts mock output toward the 85% gate. */
export function extractReceiptMock(): ExtractionResult {
  return {
    store_name: "Tienda de prueba",
    purchased_at: new Date().toISOString().slice(0, 10),
    currency: "MXN",
    total_amount: 87.5,
    confidence: 0.75,
    items: [
      {
        raw_label: "JIT TOM 1KG",
        normalized_name: "jitomate",
        category: "produce",
        quantity: 1,
        unit: "kg",
        unit_price: 32.5,
        total_price: 32.5,
        is_food: true,
        confidence: 0.8,
      },
      {
        raw_label: "LECHE LALA 1L",
        normalized_name: "leche",
        category: "dairy",
        quantity: 1,
        unit: "l",
        unit_price: 28,
        total_price: 28,
        is_food: true,
        confidence: 0.8,
      },
      {
        raw_label: "PAN BIMBO GDE",
        normalized_name: "pan",
        category: "bakery",
        quantity: 1,
        unit: "unit",
        unit_price: 27,
        total_price: 27,
        is_food: true,
        confidence: 0.65,
      },
    ],
  };
}
