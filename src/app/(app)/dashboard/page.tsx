import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  computeMonthlyTotals,
  computePriceVariations,
  monthBounds,
  topWastedProducts,
} from "@/lib/monthly-summary";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { start, end } = monthBounds(new Date());

  const [{ data: profile }, { data: resolvedItems }, { data: priceObservations }, { count: receiptCount }] =
    await Promise.all([
      supabase.from("profiles").select("currency").eq("id", user.id).single(),
      supabase
        .from("inventory_items")
        .select("product_name, value_amount, status")
        .eq("user_id", user.id)
        .in("status", ["consumed", "wasted"])
        .gte("resolved_at", start)
        .lt("resolved_at", end),
      supabase
        .from("price_observations")
        .select("normalized_name, unit_price, observed_at")
        .eq("user_id", user.id),
      supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const currency = profile?.currency ?? "MXN";
  const { saved, wasted } = computeMonthlyTotals(resolvedItems ?? []);
  const topWasted = topWastedProducts(resolvedItems ?? []);
  const priceVariations = computePriceVariations(priceObservations ?? []);
  const hasReceipts = (receiptCount ?? 0) > 0;

  return (
    <main className="flex flex-col gap-10 px-4 py-8">
      <section>
        <p className="text-sm text-fade">{t("title")}</p>
        <p className="mt-1 text-6xl font-medium tabular-nums text-nopal">
          {formatCurrency(saved, currency)}
        </p>
        <p className="text-fade">{t("savedLabel")}</p>

        {wasted > 0 ? (
          <p className="mt-4 text-fade">
            <span className="text-jamaica">{formatCurrency(wasted, currency)}</span>{" "}
            {t("wastedLabel")}
          </p>
        ) : null}

        {hasReceipts ? (
          <a
            href="/api/summary/image"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm text-fade underline underline-offset-2"
          >
            {t("downloadImage")}
          </a>
        ) : null}
      </section>

      {topWasted.length > 0 ? (
        <section className="border-t border-sand pt-6">
          <h2 className="pb-2 text-sm text-fade">{t("topWastedTitle")}</h2>
          <ul className="flex flex-col">
            {topWasted.map((product) => (
              <li
                key={product.product_name}
                className="flex justify-between border-b border-sand py-2"
              >
                <span className="text-ink">{product.product_name}</span>
                <span className="tabular-nums text-jamaica">
                  {formatCurrency(product.value, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {priceVariations.length > 0 ? (
        <section className="border-t border-sand pt-6">
          <h2 className="pb-2 text-sm text-fade">{t("priceChangesTitle")}</h2>
          <ul className="flex flex-col">
            {priceVariations.map((variation) => (
              <li
                key={variation.normalized_name}
                className="flex justify-between border-b border-sand py-2"
              >
                <span className="text-ink">{variation.normalized_name}</span>
                <span
                  className={`tabular-nums ${variation.percentChange > 0 ? "text-fade" : "text-nopal"}`}
                >
                  {variation.percentChange > 0 ? "+" : ""}
                  {variation.percentChange.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!hasReceipts ? (
        <section className="flex flex-col items-start gap-4 border-t border-sand pt-8">
          <div>
            <p className="text-ink">{t("emptyTitle")}</p>
            <p className="text-fade">{t("emptySubtitle")}</p>
          </div>
          <Button asChild variant="positive">
            <Link href="/receipts/new">{t("addReceipt")}</Link>
          </Button>
        </section>
      ) : (
        <Button asChild variant="positive" className="mt-auto">
          <Link href="/receipts/new">{t("addReceipt")}</Link>
        </Button>
      )}
    </main>
  );
}
