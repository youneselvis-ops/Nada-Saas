"use client";

import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReceiptTicket } from "@/components/receipt-ticket";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";

type InventoryItem = Tables<"inventory_items">;
type Receipt = Tables<"receipts">;
type ReceiptItem = Tables<"receipt_items">;

export default function ReviewPage() {
  const t = useTranslations("review");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        { data: receiptRow },
        { data: rawItems },
        { data: inventoryItems },
      ] = await Promise.all([
        supabase.from("receipts").select("*").eq("id", params.id).single(),
        supabase
          .from("receipt_items")
          .select("*")
          .eq("receipt_id", params.id),
        supabase
          .from("inventory_items")
          .select("*, receipt_items!inner(receipt_id)")
          .eq("receipt_items.receipt_id", params.id)
          .order("expires_at", { ascending: true }),
      ]);

      setReceipt(receiptRow ?? null);
      setReceiptItems(rawItems ?? []);
      setItems((inventoryItems as InventoryItem[]) ?? []);
      setLoading(false);
    }

    load();
  }, [params.id]);

  async function updateItem(id: string, patch: Partial<InventoryItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    await createClient().from("inventory_items").update(patch).eq("id", id);
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await createClient().from("inventory_items").delete().eq("id", id);
  }

  if (loading) return null;

  const needsReview = receipt?.status === "needs_review";

  return (
    <main className="flex min-h-svh flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-medium text-ink">{t("title")}</h1>
        <p className="mt-2 text-fade">{t("subtitle")}</p>
        {needsReview ? (
          <p className="mt-2 text-sm text-jamaica">{t("needsReview")}</p>
        ) : null}
      </div>

      {receipt && receiptItems.length > 0 ? (
        <section>
          <h2 className="pb-2 text-sm text-fade">{t("ticketTitle")}</h2>
          <ReceiptTicket
            storeName={receipt.store_name}
            purchasedAt={receipt.purchased_at}
            currency={receipt.currency}
            totalAmount={receipt.total_amount}
            items={receiptItems}
            nonFoodLabel={t("nonFoodLabel")}
          />
        </section>
      ) : null}

      {items.length === 0 ? (
        <div>
          <p className="text-ink">{t("emptyTitle")}</p>
          <p className="text-fade">{t("emptySubtitle")}</p>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-sand">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 border-b border-sand py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex-1 truncate text-ink">
                  {item.product_name}
                </span>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="min-h-11 px-3 text-sm text-jamaica"
                >
                  {t("delete")}
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-fade">
                <label className="flex items-center gap-2">
                  {t("quantityLabel")}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: Number(e.target.value) })
                    }
                    className="min-h-11 w-20 border-b border-ink/20 bg-transparent px-1 text-ink"
                  />
                </label>
                <label className="flex items-center gap-2">
                  {t("priceLabel")}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.value_amount}
                    onChange={(e) =>
                      updateItem(item.id, {
                        value_amount: Number(e.target.value),
                      })
                    }
                    className="min-h-11 w-20 border-b border-ink/20 bg-transparent px-1 text-ink"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="positive"
        onClick={() => router.push("/dashboard")}
        className="mt-auto"
      >
        {t("done")}
      </Button>
    </main>
  );
}
