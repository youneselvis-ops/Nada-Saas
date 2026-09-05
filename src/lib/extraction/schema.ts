import { z } from "zod";

export const CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "fish",
  "bakery",
  "frozen",
  "pantry",
  "beverage",
  "household",
  "other",
] as const;

export const UNITS = ["unit", "kg", "g", "l", "ml"] as const;

export const extractedItemSchema = z.object({
  raw_label: z.string().min(1),
  normalized_name: z.string().nullable(),
  category: z.enum(CATEGORIES),
  quantity: z.number().positive(),
  unit: z.enum(UNITS),
  unit_price: z.number().nonnegative().nullable(),
  total_price: z.number().nonnegative().nullable(),
  is_food: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const extractionResultSchema = z.object({
  store_name: z.string().nullable(),
  purchased_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  currency: z.enum(["MXN", "EUR"]),
  total_amount: z.number().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
  items: z.array(extractedItemSchema),
});

export type ExtractedItem = z.infer<typeof extractedItemSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
