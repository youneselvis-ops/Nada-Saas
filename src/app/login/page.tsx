"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function LoginPage() {
  const t = useTranslations("login");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError(t("errorGeneric"));
      return;
    }
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (verifyError) {
      setError(t("errorInvalidCode"));
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-svh flex-col justify-center px-6 py-12 sm:mx-auto sm:w-full sm:max-w-sm">
      {step === "email" ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-medium text-ink">{t("title")}</h1>
            <p className="mt-2 text-fade">{t("subtitle")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-jamaica">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? t("sending") : t("sendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-medium text-ink">
              {t("codeSentTitle")}
            </h1>
            <p className="mt-2 text-fade">
              {t("codeSentSubtitle", { email })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">{t("codeLabel")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-jamaica">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? t("verifying") : t("verify")}
          </Button>
          <button
            type="button"
            className="flex min-h-11 items-center text-sm text-fade underline underline-offset-2"
            onClick={() => setStep("email")}
          >
            {t("backToEmail")}
          </button>
        </form>
      )}
    </main>
  );
}
