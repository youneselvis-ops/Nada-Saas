"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      window.location.href = "/login";
    }
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-medium text-ink">{t("title")}</h1>
      <div className="flex flex-col items-start gap-3 border-t border-sand pt-6">
        <p className="text-fade">{t("deleteAccountDescription")}</p>
        {confirming ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              className="bg-jamaica text-paper hover:bg-jamaica/90"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? t("deleting") : t("confirmDelete")}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>
            {t("deleteAccount")}
          </Button>
        )}
      </div>
    </main>
  );
}
