import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it.each([
    "/login",
    "/auth/callback",
    "/api/cron/expiry-alerts",
    "/api/cron/monthly-summary",
  ])("treats %s as public (no session required)", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/inventory",
    "/settings",
    "/receipts/new",
    "/api/receipts/abc/extract",
    "/api/recipes/generate",
    "/api/summary/image",
    "/api/account/delete",
  ])("treats %s as requiring a session", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
