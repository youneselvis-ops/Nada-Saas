import type { Tables } from "@/lib/database.types";

type ReceiptTicketProps = {
  storeName: string | null;
  purchasedAt: string | null;
  currency: string;
  totalAmount: number | null;
  items: Pick<
    Tables<"receipt_items">,
    "id" | "raw_label" | "quantity" | "unit" | "total_price" | "is_food"
  >[];
  nonFoodLabel: string;
};

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return "--";
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * The one place Martian Mono is allowed to appear (section 10): a literal
 * rendering of the ticket as extracted, in the vernacular of a thermal
 * receipt printout. Everything else in the app stays in Instrument Sans.
 */
export function ReceiptTicket({
  storeName,
  purchasedAt,
  currency,
  totalAmount,
  items,
  nonFoodLabel,
}: ReceiptTicketProps) {
  return (
    <div className="border border-dashed border-ink/30 bg-paper px-4 py-5 font-receipt text-sm text-ink">
      <div className="text-center">
        <p>{storeName ?? "----------"}</p>
        {purchasedAt ? <p className="text-fade">{purchasedAt}</p> : null}
      </div>

      <div className="my-3 border-t border-dashed border-ink/30" />

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate">
              {item.raw_label}
              {!item.is_food ? " *" : ""}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatAmount(item.total_price, currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="my-3 border-t border-dashed border-ink/30" />

      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">{formatAmount(totalAmount, currency)}</span>
      </div>

      {items.some((item) => !item.is_food) ? (
        <p className="mt-3 text-xs text-fade">* {nonFoodLabel}</p>
      ) : null}
    </div>
  );
}
