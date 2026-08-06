import { expect, test } from "@playwright/test";

const portfolioUrl =
  "https://uwazieshiloh47-bot.github.io/shiloh-portfolio/";

test("the deployed portfolio displays a numeric visitor count", async ({
  page,
}) => {
  // Force the read-only route so routine smoke tests do not inflate the count.
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });

  await page.goto(portfolioUrl, { waitUntil: "domcontentloaded" });

  const counter = page.locator(".visitor-counter");
  const count = page.locator("#visitor-count");

  await expect(counter).toBeVisible();
  await expect(count).toHaveText(/^\d[\d,]*$/);
});
