import { join } from "path";
import { expect, test } from "@playwright/test";
import { signInAsTestUser } from "./helpers/auth";

const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("living inventory", () => {
  test.skip(!hasServiceRole, "requires SUPABASE_SERVICE_ROLE_KEY for test-user login");

  test("marking an item eaten takes a single tap and removes it from the list", async ({
    page,
    context,
  }) => {
    await signInAsTestUser(context);
    await page.goto("/receipts/new");

    const fixture = join(
      __dirname,
      "..",
      "fixtures",
      "receipts",
      "mx-supermercado",
      "receipt.png",
    );
    await page.setInputFiles('input[type="file"]', fixture);
    await page.getByRole("button", { name: /extraer productos/i }).click();
    await page.waitForURL(/\/receipts\/.+\/review/, { timeout: 30_000 });

    await page.goto("/inventory");
    const firstRow = page.locator("li").first();
    await expect(firstRow).toBeVisible();
    const initialCount = await page.locator("li").count();

    // Single tap, no confirmation dialog.
    await page.getByRole("button", { name: /com[íi]|mangé/i }).first().click();

    await expect(page.locator("li")).toHaveCount(initialCount - 1);
  });
});
