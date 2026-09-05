import { NextResponse } from "next/server";
import { extractReceipt, type ReceiptImage } from "@/lib/extraction";
import { computeExpiresAt, type StorageMode } from "@/lib/inventory";
import { CATEGORY_DEFAULTS } from "@/lib/shelf-life-defaults";
import { createClient } from "@/lib/supabase/server";

const MEDIA_TYPE_BY_EXT: Record<string, ReceiptImage["mediaType"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (receiptError || !receipt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (receipt.status !== "pending") {
    return NextResponse.json({ status: receipt.status });
  }

  await supabase.from("receipts").update({ status: "processing" }).eq("id", id);

  try {
    const { data: files, error: listError } = await supabase.storage
      .from("receipts")
      .list(receipt.image_path);

    if (listError || !files || files.length === 0) {
      throw new Error("no_images");
    }

    const images: ReceiptImage[] = [];
    for (const file of files) {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("receipts")
        .download(`${receipt.image_path}/${file.name}`);
      if (downloadError || !blob) throw new Error("download_failed");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const mediaType = MEDIA_TYPE_BY_EXT[ext] ?? "image/jpeg";
      const buffer = Buffer.from(await blob.arrayBuffer());
      images.push({ base64: buffer.toString("base64"), mediaType });
    }

    const result = await extractReceipt(images);
    const purchasedAt = result.purchased_at ?? new Date().toISOString().slice(0, 10);
    const status = result.confidence < 0.6 ? "needs_review" : "done";

    const { data: insertedItems, error: insertError } = await supabase
      .from("receipt_items")
      .insert(
        result.items.map((item) => ({
          receipt_id: id,
          raw_label: item.raw_label,
          normalized_name: item.normalized_name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_food: item.is_food,
          confidence: item.confidence,
        })),
      )
      .select();

    if (insertError) throw insertError;

    const priceRows = [];
    const inventoryRows = [];

    for (const item of insertedItems ?? []) {
      if (item.unit_price != null) {
        priceRows.push({
          user_id: user.id,
          normalized_name: item.normalized_name ?? item.raw_label.toLowerCase(),
          store_name: result.store_name,
          unit_price: item.unit_price,
          unit: item.unit,
          observed_at: purchasedAt,
        });
      }

      if (!item.is_food || !item.normalized_name) continue;

      const fallback =
        CATEGORY_DEFAULTS[item.category ?? "other"] ?? CATEGORY_DEFAULTS.other;
      let storage: StorageMode = fallback.storage;
      let days = fallback.days;

      const { data: matches } = await supabase.rpc("match_shelf_life", {
        p_name: item.normalized_name,
      });
      const match = matches?.[0];
      if (match) {
        storage = match.default_storage as StorageMode;
        const matchDays =
          storage === "fridge"
            ? match.days_fridge
            : storage === "pantry"
              ? match.days_pantry
              : match.days_freezer;
        if (matchDays != null) days = matchDays;
      }

      inventoryRows.push({
        user_id: user.id,
        receipt_item_id: item.id,
        product_name: item.normalized_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        value_amount: item.total_price ?? 0,
        storage,
        purchased_at: purchasedAt,
        expires_at: computeExpiresAt(purchasedAt, days),
      });
    }

    if (priceRows.length > 0) {
      await supabase.from("price_observations").insert(priceRows);
    }
    if (inventoryRows.length > 0) {
      await supabase.from("inventory_items").insert(inventoryRows);
    }

    await supabase
      .from("receipts")
      .update({
        status,
        store_name: result.store_name,
        purchased_at: purchasedAt,
        total_amount: result.total_amount,
        currency: result.currency,
        extraction_raw: result,
        extraction_confidence: result.confidence,
      })
      .eq("id", id);

    return NextResponse.json({ status, itemsCount: insertedItems?.length ?? 0 });
  } catch {
    await supabase
      .from("receipts")
      .update({ status: "failed", error_message: "extraction_failed" })
      .eq("id", id);
    return NextResponse.json({ error: "extraction_failed" }, { status: 500 });
  }
}
