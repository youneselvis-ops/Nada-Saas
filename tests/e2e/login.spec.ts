import { expect, test } from "@playwright/test";

test("unauthenticated user is redirected to login and can request a code", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/correo|email/i).fill("test@example.com");
  await page.getByRole("button", { name: /enviar código|envoyer le code/i }).click();

  await expect(
    page.getByText(/revisa tu correo|regarde tes emails/i),
  ).toBeVisible();
});
