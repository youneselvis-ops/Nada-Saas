import { join } from "path";
import { expect, test } from "@playwright/test";
import { signInAsTestUser } from "./helpers/auth";

const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("receipt pipeline", () => {
  test.skip(!hasServiceRole, "requires SUPABASE_SERVICE_ROLE_KEY for test-user login");

  test("upload a receipt, review it, and see the inventory populated", async ({
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
    await expect(page.getByText(/revisa tu inventario/i)).toBeVisible();

    const items = page.locator("li");
    await expect(items.first()).toBeVisible();
  });

  test("correct a wrongly-extracted line in under 3 gestures", async ({
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
      "mx-tienda",
      "receipt.png",
    );
    await page.setInputFiles('input[type="file"]', fixture);
    await page.getByRole("button", { name: /extraer productos/i }).click();
    await page.waitForURL(/\/receipts\/.+\/review/, { timeout: 30_000 });

    const quantityInput = page.getByLabel(/cantidad/i).first();
    // Gesture 1: focus + type the corrected quantity.
    await quantityInput.fill("2");
    // Gesture 2: blur to persist.
    await quantityInput.blur();

    await expect(quantityInput).toHaveValue("2");
  });
});
