import { expect, test } from "@playwright/test";
import {
  authenticate,
  expectAccessible,
  expectNoHorizontalOverflow,
  SYNC_JOB_ID,
} from "./helpers";

test("disconnected Steam state explains library-only connection", async ({ page }) => {
  await authenticate(page, "e2e-disconnected");
  await page.goto("/connections/steam");

  await expect(page.getByRole("heading", { level: 2, name: "Connect your Steam library" })).toBeVisible();
  await expect(page.getByText(/continue signing in to Playlog with your Playlog email and password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Steam" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});

test("connected Steam state shows sync outcome and match boundaries", async ({ page }) => {
  await authenticate(page);
  await page.goto(`/connections/steam?job=${SYNC_JOB_ID}`);

  await expect(page.getByText("Steam connected")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("3 games", { exact: true })).toBeVisible();
  await expect(page.getByText("Matched", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Unmatched", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/cannot be added to a Playlog journal yet/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page);
});
