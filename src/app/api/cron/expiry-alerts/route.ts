import { NextResponse } from "next/server";
import { computeExpiresAt } from "@/lib/inventory";
import { sendExpiryAlertEmail } from "@/lib/email";
import { isAlertHour, localDateKey } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPIRY_WINDOW_DAYS = 2;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, locale, timezone");

  if (profilesError || !profiles) {
    return NextResponse.json({ error: "profiles_query_failed" }, { status: 500 });
  }

  let alerted = 0;

  for (const profile of profiles) {
    if (!isAlertHour(profile.timezone, now)) continue;

    const today = localDateKey(profile.timezone, now);
    const threshold = computeExpiresAt(today, EXPIRY_WINDOW_DAYS);

    const { data: items } = await admin
      .from("inventory_items")
      .select("product_name, expires_at")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .lte("expires_at", threshold)
      .order("expires_at", { ascending: true });

    if (!items || items.length === 0) continue;

    // Insert the log entry first: the unique index on
    // (user_id, kind, dedupe_key) is what actually prevents a second alert
    // the same local day, even under concurrent cron runs.
    const { error: logError } = await admin.from("notifications_log").insert({
      user_id: profile.id,
      kind: "expiry_alert",
      payload: { dedupe_key: today, item_count: items.length },
    });
    if (logError) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;

    if (email) {
      await sendExpiryAlertEmail({ to: email, locale: profile.locale, items });
    }

    await sendPushToUser(admin, profile.id, {
      title: profile.locale === "fr-FR" ? "Nada" : "Nada",
      body:
        profile.locale === "fr-FR"
          ? `${items.length} produit(s) périment bientôt`
          : `${items.length} producto(s) van a caducar pronto`,
      url: "/inventory",
    });

    alerted++;
  }

  return NextResponse.json({ alerted });
}
