import { Resend } from "resend";

export type ExpiryAlertItem = { product_name: string; expires_at: string };

function subjectFor(locale: string, count: number): string {
  if (locale === "fr-FR") {
    return count === 1
      ? "1 produit va périmer"
      : `${count} produits vont périmer`;
  }
  return count === 1
    ? "1 producto va a caducar"
    : `${count} productos van a caducar`;
}

function bodyHtml(locale: string, items: ExpiryAlertItem[]): string {
  const intro =
    locale === "fr-FR"
      ? "Ces articles périment bientôt :"
      : "Estos productos van a caducar pronto:";
  const rows = items
    .map((item) => `<li>${item.product_name} — ${item.expires_at}</li>`)
    .join("");
  return `<p>${intro}</p><ul>${rows}</ul>`;
}

/** Sends the daily expiry alert email. No-ops (logging only, no ticket
 * content) when RESEND_API_KEY is absent, so the pipeline keeps working in
 * MOCK_MODE. */
export async function sendExpiryAlertEmail(params: {
  to: string;
  locale: string;
  items: ExpiryAlertItem[];
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("expiry alert email skipped: RESEND_API_KEY not configured");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nada <notificaciones@nada.app>",
    to: params.to,
    subject: subjectFor(params.locale, params.items.length),
    html: bodyHtml(params.locale, params.items),
  });
}

function monthlySummarySubject(locale: string): string {
  return locale === "fr-FR" ? "Ton bilan du mois" : "Tu resumen del mes";
}

function monthlySummaryHtml(params: {
  locale: string;
  saved: number;
  wasted: number;
  currency: string;
  topWasted: { product_name: string; value: number }[];
}): string {
  const symbol = params.currency === "EUR" ? "€" : "$";
  const format = (amount: number) => `${symbol}${amount.toFixed(2)}`;
  const isFr = params.locale === "fr-FR";

  const topWastedHtml = params.topWasted
    .map((p) => `<li>${p.product_name} — ${format(p.value)}</li>`)
    .join("");

  return `
    <p>${isFr ? "Économisé ce mois-ci" : "Ahorrado este mes"}: <strong>${format(params.saved)}</strong></p>
    <p>${isFr ? "Perdu ce mois-ci" : "Perdido este mes"}: <strong>${format(params.wasted)}</strong></p>
    ${topWastedHtml ? `<p>${isFr ? "Ce qui s'est le plus perdu" : "Lo que más se echó a perder"}:</p><ul>${topWastedHtml}</ul>` : ""}
  `;
}

/** Sends the 1st-of-month recap email. No-ops without RESEND_API_KEY, same
 * as the expiry alert. */
export async function sendMonthlySummaryEmail(params: {
  to: string;
  locale: string;
  saved: number;
  wasted: number;
  currency: string;
  topWasted: { product_name: string; value: number }[];
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("monthly summary email skipped: RESEND_API_KEY not configured");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nada <notificaciones@nada.app>",
    to: params.to,
    subject: monthlySummarySubject(params.locale),
    html: monthlySummaryHtml(params),
  });
}
