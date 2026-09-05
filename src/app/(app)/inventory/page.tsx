"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { expiryZone, type ExpiryZone } from "@/lib/inventory";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type InventoryItem = Tables<"inventory_items"> & { leaving?: boolean };

const ZONE_ORDER: ExpiryZone[] = ["urgent", "soon", "later"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const recipeT = useTranslations("recipe");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [currency, setCurrency] = useState("MXN");
  const [loading, setLoading] = useState(true);
  const today = useMemo(todayIso, []);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: inventoryItems }] = await Promise.all([
        supabase.from("profiles").select("currency").eq("id", user.id).single(),
        supabase
          .from("inventory_items")
          .select("*")
          .eq("status", "active")
          .order("expires_at", { ascending: true }),
      ]);

      if (profile?.currency) setCurrency(profile.currency);
      setItems(inventoryItems ?? []);
      setLoading(false);
    }

    load();
  }, []);

  async function resolveItem(id: string, status: "consumed" | "wasted") {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 200);

    await createClient()
      .from("inventory_items")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);
  }

  if (loading) return null;

  const zones: Record<ExpiryZone, InventoryItem[]> = {
    urgent: [],
    soon: [],
    later: [],
  };
  for (const item of items) {
    zones[expiryZone(item.expires_at, today)].push(item);
  }

  const urgentValue = zones.urgent.reduce((sum, item) => sum + item.value_amount, 0);

  const zoneLabels: Record<ExpiryZone, string> = {
    urgent: t("zoneUrgent"),
    soon: t("zoneSoon"),
    later: t("zoneLater"),
  };

  return (
    <main className="flex flex-col gap-6 px-4 py-8">
      {urgentValue > 0 ? (
        <div className="flex flex-col items-start gap-3">
          <div>
            <p className="text-4xl font-medium tabular-nums text-jamaica">
              {formatCurrency(urgentValue, currency)}
            </p>
            <p className="text-fade">{t("urgentValueLabel")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/recipe?items=${zones.urgent.map((item) => item.id).join(",")}`}>
              {recipeT("cta")}
            </Link>
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div>
          <p className="text-ink">{t("emptyTitle")}</p>
          <p className="text-fade">{t("emptySubtitle")}</p>
        </div>
      ) : (
        ZONE_ORDER.map((zone) =>
          zones[zone].length > 0 ? (
            <section key={zone} className="flex flex-col">
              <h2 className="pb-2 text-sm text-fade">{zoneLabels[zone]}</h2>
              <ul className="flex flex-col border-t border-sand">
                {zones[zone].map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 border-b border-sand py-3 transition-opacity duration-200",
                      item.leaving && "opacity-0",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate text-ink">{item.product_name}</span>
                      <span className="shrink-0 text-sm text-fade">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <time className="shrink-0 text-sm text-fade">
                      {item.expires_at}
                    </time>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => resolveItem(item.id, "consumed")}
                        className="min-h-11 min-w-11 px-2 text-sm text-nopal"
                      >
                        {t("markEaten")}
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveItem(item.id, "wasted")}
                        className="min-h-11 min-w-11 px-2 text-sm text-jamaica"
                      >
                        {t("markWasted")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )
      )}
    </main>
  );
}
