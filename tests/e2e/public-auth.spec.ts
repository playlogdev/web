import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow } from "./helpers";

test("landing page is responsive and accessible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /track\. rate\. remember\./i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create your journal/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});

test("login creates a protected session", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("tester@playlog.local");
  await page.getByLabel("Password").fill("PlaylogTest2026!");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your game journal" })).toBeVisible();
  await expectAccessible(page);
});

test("login failure is announced without leaving the page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("wrong@playlog.local");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "invalid email or password" }),
  ).toHaveText("invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("reduced-motion preference collapses interface transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const cta = page.getByRole("link", { name: /create your journal/i });
  const motion = await cta.evaluate((element) => ({
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    transitionDuration: getComputedStyle(element).transitionDuration,
  }));
  const milliseconds = motion.transitionDuration.endsWith("ms")
    ? Number.parseFloat(motion.transitionDuration)
    : Number.parseFloat(motion.transitionDuration) * 1000;

  expect(motion.reduced).toBe(true);
  expect(milliseconds).toBeLessThanOrEqual(0.1);
});
