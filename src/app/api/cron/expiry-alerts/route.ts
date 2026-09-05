import { NextResponse } from "next/server";
import { computeExpiresAt } from "@/lib/inventory";
import { sendExpiryAlertEmail } from "@/lib/email";
import { localDateKey } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPIRY_WINDOW_DAYS = 2;

// Vercel's Hobby plan only allows daily (not hourly) cron jobs, so this runs
// once a day at 23:00 UTC — 17:00 in America/Mexico_City, the priority
// market (CLAUDE.md section 1). Every profile is processed on this single
// run regardless of its own timezone: gating on each user's exact local
// hour (as the spec literally asks for) would silently skip every
// non-Mexico timezone on a once-a-day schedule, since their local 17:00
// never coincides with this fixed UTC instant. fr-FR users get one alert
// daily too, just not at their own 17:00 — revisit with a per-timezone
// hourly cron (see `isAlertHour` in lib/notifications.ts, still exported
// and tested) if the project moves to a Vercel plan that allows it.
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

  // Each profile is isolated in its own try/catch: a single delivery
  // failure (an unverified sender domain, a transient Resend/webpush error)
  // must never abort the loop, or every profile queued after the failing
  // one would silently get no alert for the rest of the run.
  for (const profile of profiles) {
    try {
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
    } catch {
      console.log("expiry alert delivery failed for one profile, continuing");
    }
  }

  return NextResponse.json({ alerted });
}
