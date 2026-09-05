import { join } from "path";
import { expect, test } from "@playwright/test";
import { signInAsTestUser } from "./helpers/auth";

const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("monthly summary", () => {
  test.skip(!hasServiceRole, "requires SUPABASE_SERVICE_ROLE_KEY for test-user login");

  test("consulting the monthly summary shows the amount saved this month", async ({
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
    await page.getByRole("button", { name: /com[íi]|mangé/i }).first().click();

    await page.goto("/dashboard");
    await expect(page.getByText(/este mes|ce mois-ci/i)).toBeVisible();
    await expect(page.getByText(/ahorrado este mes|économisé ce mois-ci/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /descargar imagen|télécharger l'image/i }),
    ).toBeVisible();
  });
});
