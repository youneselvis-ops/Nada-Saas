import { NextResponse } from "next/server";
import { sendMonthlySummaryEmail } from "@/lib/email";
import {
  computeMonthlyTotals,
  previousMonthBounds,
  topWastedProducts,
} from "@/lib/monthly-summary";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const { start, end } = previousMonthBounds(now);
  const dedupeKey = start.slice(0, 7); // YYYY-MM of the summarized month

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, locale, currency");

  if (profilesError || !profiles) {
    return NextResponse.json({ error: "profiles_query_failed" }, { status: 500 });
  }

  let sent = 0;

  // Isolated per profile, same reasoning as the expiry-alerts cron: one
  // delivery failure must never abort the loop and starve every profile
  // queued after it.
  for (const profile of profiles) {
    try {
      const { error: logError } = await admin.from("notifications_log").insert({
        user_id: profile.id,
        kind: "monthly_summary",
        payload: { dedupe_key: dedupeKey },
      });
      if (logError) continue;

      const { data: resolvedItems } = await admin
        .from("inventory_items")
        .select("product_name, value_amount, status")
        .eq("user_id", profile.id)
        .in("status", ["consumed", "wasted"])
        .gte("resolved_at", start)
        .lt("resolved_at", end);

      if (!resolvedItems || resolvedItems.length === 0) continue;

      const { saved, wasted } = computeMonthlyTotals(resolvedItems);
      const topWasted = topWastedProducts(resolvedItems);

      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      await sendMonthlySummaryEmail({
        to: email,
        locale: profile.locale,
        saved,
        wasted,
        currency: profile.currency,
        topWasted,
      });
      sent++;
    } catch {
      console.log("monthly summary delivery failed for one profile, continuing");
    }
  }

  return NextResponse.json({ sent });
}
