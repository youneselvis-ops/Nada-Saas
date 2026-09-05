"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isPushSupported, subscribeToPush } from "@/lib/push-client";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/config";

const MARKETS: Record<Locale, { currency: string }> = {
  "es-MX": { currency: "MXN" },
  "fr-FR": { currency: "EUR" },
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "enabled" | "denied">(
    "idle",
  );
  const [locale, setLocale] = useState<Locale | null>(null);
  const [changingLocale, setChangingLocale] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", user.id)
        .single();
      setLocale((profile?.locale as Locale) ?? "es-MX");
    }
    loadProfile();
  }, []);

  async function handleLocaleChange(next: Locale) {
    if (next === locale || changingLocale) return;
    setChangingLocale(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ locale: next, currency: MARKETS[next].currency })
        .eq("id", user.id);
    }
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    window.location.reload();
  }

  async function handleEnableNotifications() {
    const enabled = await subscribeToPush();
    setNotifStatus(enabled ? "enabled" : "denied");
  }

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

      {locale ? (
        <div className="flex flex-col items-start gap-3 border-t border-sand pt-6">
          <p className="text-fade">{t("languageTitle")}</p>
          <div className="flex flex-col gap-2">
            <Button
              variant={locale === "es-MX" ? "primary" : "outline"}
              disabled={changingLocale}
              onClick={() => handleLocaleChange("es-MX")}
            >
              {changingLocale && locale !== "es-MX"
                ? t("languageUpdating")
                : t("languageMx")}
            </Button>
            <Button
              variant={locale === "fr-FR" ? "primary" : "outline"}
              disabled={changingLocale}
              onClick={() => handleLocaleChange("fr-FR")}
            >
              {changingLocale && locale !== "fr-FR"
                ? t("languageUpdating")
                : t("languageFr")}
            </Button>
          </div>
        </div>
      ) : null}

      {isPushSupported() ? (
        <div className="flex flex-col items-start gap-3 border-t border-sand pt-6">
          {notifStatus === "enabled" ? (
            <p className="text-nopal">{t("notificationsEnabled")}</p>
          ) : notifStatus === "denied" ? (
            <p className="text-fade">{t("notificationsDenied")}</p>
          ) : (
            <Button variant="outline" onClick={handleEnableNotifications}>
              {t("enableNotifications")}
            </Button>
          )}
        </div>
      ) : null}

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
