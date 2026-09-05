"use client";

import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ReceiptStatus = "pending" | "processing" | "done" | "needs_review" | "failed";

export default function ProcessingPage() {
  const t = useTranslations("processing");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [status, setStatus] = useState<ReceiptStatus>("processing");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const { data } = await supabase
        .from("receipts")
        .select("status")
        .eq("id", params.id)
        .single();

      if (cancelled || !data) return;

      const nextStatus = data.status as ReceiptStatus;
      setStatus(nextStatus);

      if (nextStatus === "done" || nextStatus === "needs_review") {
        router.push(`/receipts/${params.id}/review`);
      } else if (nextStatus === "failed") {
        // stop polling, show retry
      } else {
        setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  async function handleRetry() {
    setStatus("processing");
    await createClient()
      .from("receipts")
      .update({ status: "pending" })
      .eq("id", params.id);
    await fetch(`/api/receipts/${params.id}/extract`, { method: "POST" });
    setStatus("processing");
    setTimeout(() => window.location.reload(), 500);
  }

  if (status === "failed") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-medium text-ink">{t("failedTitle")}</h1>
        <p className="text-fade">{t("failedSubtitle")}</p>
        <Button onClick={handleRetry}>{t("retry")}</Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-medium text-ink">{t("title")}</h1>
      <p className="text-fade">{t("subtitle")}</p>
    </main>
  );
}
