import { ImageResponse } from "next/og";
import {
  computeMonthlyTotals,
  monthBounds,
  topWastedProducts,
} from "@/lib/monthly-summary";
import { createClient } from "@/lib/supabase/server";

const WIDTH = 1080;
const HEIGHT = 1920;

const PAPER = "#fbfaf6";
const INK = "#16211c";
const NOPAL = "#2f6b4f";
const JAMAICA = "#a3123a";
const FADE = "#8c8b84";

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { start, end } = monthBounds(new Date());

  const [{ data: profile }, { data: resolvedItems }, regularFont, boldFont] =
    await Promise.all([
      supabase.from("profiles").select("currency, locale").eq("id", user.id).single(),
      supabase
        .from("inventory_items")
        .select("product_name, value_amount, status")
        .eq("user_id", user.id)
        .in("status", ["consumed", "wasted"])
        .gte("resolved_at", start)
        .lt("resolved_at", end),
      fetch(new URL("../../../../lib/fonts/InstrumentSans-Regular.ttf", import.meta.url)).then(
        (res) => res.arrayBuffer(),
      ),
      fetch(new URL("../../../../lib/fonts/InstrumentSans-Bold.ttf", import.meta.url)).then(
        (res) => res.arrayBuffer(),
      ),
    ]);

  const currency = profile?.currency ?? "MXN";
  const locale = profile?.locale ?? "es-MX";
  const { saved, wasted } = computeMonthlyTotals(resolvedItems ?? []);
  const topWasted = topWastedProducts(resolvedItems ?? []);

  const savedLabel = locale === "fr-FR" ? "économisé ce mois-ci" : "ahorrado este mes";
  const wastedLabel = locale === "fr-FR" ? "perdu ce mois-ci" : "perdido este mes";

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          padding: 80,
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: INK }}>Nada</div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 160 }}>
          <div style={{ display: "flex", fontSize: 140, color: NOPAL, fontWeight: 700 }}>
            {formatCurrency(saved, currency)}
          </div>
          <div style={{ display: "flex", fontSize: 44, color: FADE, marginTop: 16 }}>
            {savedLabel}
          </div>
        </div>

        {wasted > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 100 }}>
            <div style={{ display: "flex", fontSize: 72, color: JAMAICA, fontWeight: 700 }}>
              {formatCurrency(wasted, currency)}
            </div>
            <div style={{ display: "flex", fontSize: 36, color: FADE, marginTop: 12 }}>
              {wastedLabel}
            </div>
          </div>
        ) : null}

        {topWasted.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 100 }}>
            {topWasted.map((product) => (
              <div
                key={product.product_name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 36,
                  color: INK,
                  paddingTop: 20,
                  paddingBottom: 20,
                  borderTop: "2px solid #e9e3d6",
                }}
              >
                <div style={{ display: "flex" }}>{product.product_name}</div>
                <div style={{ display: "flex", color: JAMAICA }}>
                  {formatCurrency(product.value, currency)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Instrument Sans", data: regularFont, weight: 400 },
        { name: "Instrument Sans", data: boldFont, weight: 700 },
      ],
    },
  );
}
