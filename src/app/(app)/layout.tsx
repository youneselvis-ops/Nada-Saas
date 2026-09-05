import { useTranslations } from "next-intl";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Header() {
  const t = useTranslations("common");
  return (
    <header className="flex items-center justify-between border-b border-sand px-4 py-3">
      <span className="text-lg font-medium text-ink">{t("appName")}</span>
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="min-h-11 px-2 py-2 text-sm text-fade underline underline-offset-2"
        >
          {t("settings")}
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
