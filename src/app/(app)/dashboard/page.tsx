import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <main className="flex flex-col gap-10 px-4 py-8">
      <section>
        <p className="text-sm text-fade">{t("title")}</p>
        <p className="mt-1 text-6xl font-medium tabular-nums text-nopal">
          $0
        </p>
        <p className="text-fade">{t("savedLabel")}</p>
      </section>

      <section className="flex flex-col items-start gap-4 border-t border-sand pt-8">
        <div>
          <p className="text-ink">{t("emptyTitle")}</p>
          <p className="text-fade">{t("emptySubtitle")}</p>
        </div>
        <Button asChild variant="positive">
          <Link href="/receipts/new">{t("addReceipt")}</Link>
        </Button>
      </section>
    </main>
  );
}
