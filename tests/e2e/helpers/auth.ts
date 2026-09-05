import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** Logs a fresh test user in via a real Supabase magic link (no OTP typing
 * required), by generating the link with the service-role admin API and
 * having Playwright navigate straight to it. Requires
 * SUPABASE_SERVICE_ROLE_KEY — call sites should skip when it's absent. */
export async function signInAsTestUser(context: BrowserContext) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = `e2e-${crypto.randomUUID()}@example.com`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  if (error || !data.properties?.action_link) {
    throw new Error(`Failed to generate magic link: ${error?.message}`);
  }

  const page = await context.newPage();
  await page.goto(data.properties.action_link);
  await page.waitForURL(/\/dashboard/);
  await page.close();

  return { email, userId: data.user.id, admin };
}
