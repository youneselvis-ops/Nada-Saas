"use client";

import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const t = useTranslations("dashboard");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className="min-h-11 px-2 text-sm text-fade underline underline-offset-2"
    >
      {t("signOut")}
    </button>
  );
}
