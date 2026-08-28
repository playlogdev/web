import { expect, test } from "@playwright/test";
import { authenticate, expectAccessible, expectNoHorizontalOverflow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await authenticate(page);
});

test("responsive shell exposes the appropriate navigation", async ({ page }, testInfo) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1, name: "Your game journal" })).toBeVisible();

  const compact = testInfo.project.name !== "desktop-chromium";
  const sidebar = page.locator("aside");
  const mobileHeader = page.locator("header").filter({
    has: page.getByRole("link", { name: "Playlog" }),
  });
  const bottomNavigation = page.locator('nav[aria-label="Primary"]').last();
  if (compact) {
    await expect(sidebar).toBeHidden();
    await expect(mobileHeader).toBeVisible();
    await expect(bottomNavigation).toBeVisible();
  } else {
    await expect(sidebar).toBeVisible();
    await expect(mobileHeader).toBeHidden();
    await expect(bottomNavigation).toBeHidden();
  }

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  const outlineWidth = await skipLink.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).outlineWidth),
  );
  expect(outlineWidth).toBeGreaterThan(0);
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});

test("game search opens a public game detail", async ({ page }) => {
  await page.goto("/discover");
  await page.getByRole("searchbox", { name: "Search games by name" }).fill("hades");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/discover\?q=hades$/);
  await expect(page.getByRole("heading", { level: 2, name: /2 results for/i })).toBeVisible();
  await page.getByRole("link", { name: /Hades/ }).first().click();
  await expect(page).toHaveURL(/\/games\/1000$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hades" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("library filtering and edit disclosure are keyboard reachable", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("link", { name: /Playing/ }).click();

  await expect(page).toHaveURL(/\/library\?status=playing$/);
  await expect(page.getByRole("link", { name: "View Hades" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Celeste" })).toHaveCount(0);

  const edit = page.getByRole("button", { name: "Edit journal entry" });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Status", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Review/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});

test("activity feed appends a second page without duplicate content", async ({ page }) => {
  await page.goto("/activity");
  const firstEvent = page.getByRole("article").first();
  await expect(firstEvent.getByText("Rated", { exact: true })).toBeVisible();
  await expect(firstEvent.getByRole("link", { name: "Hades", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load more activity" }).click();

  const secondEvent = page.getByRole("article").last();
  await expect(secondEvent.getByText("Reviewed", { exact: true })).toBeVisible();
  await expect(secondEvent.getByRole("link", { name: "Celeste", exact: true })).toBeVisible();
  await expect(page.getByText("You are all caught up.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
});

test("public profile exposes relationships and follow state", async ({ page }) => {
  await page.goto("/users/fixture_player");
  await expect(page.getByRole("heading", { level: 1, name: "@fixture_player" })).toBeVisible();
  await expect(page.getByRole("link", { name: /8 followers/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow" })).toHaveAttribute("aria-pressed", "false");
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});
