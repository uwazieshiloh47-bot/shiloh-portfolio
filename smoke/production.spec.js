import { expect, test } from "@playwright/test";

const portfolioUrl =
  process.env.PORTFOLIO_URL ?? "https://dk7omuhbtlkuj.cloudfront.net";

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

test("a missing URL returns a usable 404 without recording a visit", async ({
  page,
}) => {
  const counterRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("execute-api")) {
      counterRequests.push(request.url());
    }
  });

  const stylesheetUrl = new URL("/styles.css", portfolioUrl).href;
  const stylesheetResponse = page.waitForResponse(
    (response) => response.url() === stylesheetUrl,
  );
  const response = await page.goto(
    new URL("/this-page-does-not-exist-smoke-test", portfolioUrl).href,
    { waitUntil: "networkidle" },
  );

  expect(response?.status()).toBe(404);
  expect((await stylesheetResponse).ok()).toBe(true);
  await expect(page).toHaveTitle("Page Not Found | Shiloh Uwazie");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(page.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("link", { name: "View My Work" })).toHaveAttribute(
    "href",
    "/work.html",
  );
  await expect(
    page.locator(
      '[href^="/shiloh-portfolio/"], [src^="/shiloh-portfolio/"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator('script[src*="visitor-counter.js"]')).toHaveCount(0);
  expect(counterRequests).toEqual([]);
});

test("search crawlers can discover the canonical portfolio pages", async ({
  request,
}) => {
  const robotsUrl = new URL("/robots.txt", portfolioUrl).href;
  const sitemapUrl = new URL("/sitemap.xml", portfolioUrl).href;
  const [robotsResponse, sitemapResponse] = await Promise.all([
    request.get(robotsUrl),
    request.get(sitemapUrl),
  ]);

  expect(robotsResponse.ok()).toBe(true);
  expect(sitemapResponse.ok()).toBe(true);

  const robots = await robotsResponse.text();
  expect(robots).toContain("User-agent: *");
  expect(robots).toContain("Allow: /");
  expect(robots).toContain(`Sitemap: ${sitemapUrl}`);

  const sitemap = await sitemapResponse.text();
  const canonicalUrls = [
    new URL("/", portfolioUrl).href,
    new URL("/about.html", portfolioUrl).href,
    new URL("/work.html", portfolioUrl).href,
    new URL("/skills.html", portfolioUrl).href,
    new URL("/resume.html", portfolioUrl).href,
    new URL("/contact.html", portfolioUrl).href,
  ];

  expect(sitemap.match(/<loc>/g)).toHaveLength(canonicalUrls.length);
  for (const canonicalUrl of canonicalUrls) {
    expect(sitemap).toContain(`<loc>${canonicalUrl}</loc>`);
  }
  expect(sitemap).not.toContain("404.html");
});
