import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const SYNC_JOB_ID = "66666666-6666-4666-8666-666666666666";

export async function authenticate(page: Page, token = "e2e-connected") {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await page.context().addCookies([
    { name: "playlog_at", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "playlog_rt", value: "e2e-refresh", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "playlog_at_exp", value: String(expiresAt), domain: "127.0.0.1", path: "/", sameSite: "Lax" },
  ]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}

export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

function formatViolations(violations: Array<{ id: string; help: string; nodes: Array<{ target: unknown }> }>) {
  return violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => String(node.target)).join(", ")})`)
    .join("\n");
}
