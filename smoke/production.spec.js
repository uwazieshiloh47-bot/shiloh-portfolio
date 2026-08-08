import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const portfolioUrl =
  process.env.PORTFOLIO_URL ?? "https://dk7omuhbtlkuj.cloudfront.net";
const socialImageUrl = new URL("/social-preview.png", portfolioUrl).href;
const publicPages = [
  { path: "/", canonical: new URL("/", portfolioUrl).href },
  { path: "/about.html", canonical: new URL("/about.html", portfolioUrl).href },
  { path: "/work.html", canonical: new URL("/work.html", portfolioUrl).href },
  { path: "/skills.html", canonical: new URL("/skills.html", portfolioUrl).href },
  { path: "/resume.html", canonical: new URL("/resume.html", portfolioUrl).href },
  { path: "/contact.html", canonical: new URL("/contact.html", portfolioUrl).href },
];

async function requiredMetaContent(page, selector, pagePath) {
  const locator = page.locator(selector);
  await expect(locator, `${pagePath}: expected one ${selector}`).toHaveCount(1);
  const content = await locator.getAttribute("content");
  expect(content, `${pagePath}: ${selector} must have content`).toBeTruthy();
  return content;
}

function expectCacheControl(response, expectedDirectives) {
  const cacheControl = response.headers()["cache-control"];
  expect(cacheControl, `${response.url()}: Cache-Control`).toBeTruthy();
  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim().toLowerCase());

  expect(directives).toEqual(
    expect.arrayContaining(
      expectedDirectives.map((directive) => directive.toLowerCase()),
    ),
  );
}

function accessibilitySummary(violations) {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");
}

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
  await expect(counter.locator(".visitor-counter-total")).toContainText(
    "Approximate portfolio visits:",
  );
  await expect(counter.locator(".visitor-counter-note")).toHaveText(
    "Usually one visit per browser tab session. This is an approximate total, not a count of unique people.",
  );
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
  const canonicalUrls = publicPages.map((page) => page.canonical);

  expect(sitemap.match(/<loc>/g)).toHaveLength(canonicalUrls.length);
  for (const canonicalUrl of canonicalUrls) {
    expect(sitemap).toContain(`<loc>${canonicalUrl}</loc>`);
  }
  expect(sitemap).not.toContain("404.html");
});

test("deployed pages expose canonical, social, and structured metadata", async ({
  page,
}) => {
  // Keep production verification read-only so it never increments the counter.
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });

  for (const publicPage of publicPages) {
    const response = await page.goto(publicPage.canonical, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status(), `${publicPage.path}: status`).toBe(200);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical, `${publicPage.path}: canonical`).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", publicPage.canonical);

    expect(
      await requiredMetaContent(
        page,
        'meta[property="og:url"]',
        publicPage.path,
      ),
    ).toBe(publicPage.canonical);
    expect(
      await requiredMetaContent(
        page,
        'meta[property="og:image"]',
        publicPage.path,
      ),
    ).toBe(socialImageUrl);
    expect(
      await requiredMetaContent(
        page,
        'meta[property="og:image:type"]',
        publicPage.path,
      ),
    ).toBe("image/png");
    expect(
      await requiredMetaContent(
        page,
        'meta[property="og:image:width"]',
        publicPage.path,
      ),
    ).toBe("1200");
    expect(
      await requiredMetaContent(
        page,
        'meta[property="og:image:height"]',
        publicPage.path,
      ),
    ).toBe("630");

    const openGraphTitle = await requiredMetaContent(
      page,
      'meta[property="og:title"]',
      publicPage.path,
    );
    const openGraphDescription = await requiredMetaContent(
      page,
      'meta[property="og:description"]',
      publicPage.path,
    );
    const openGraphImageAlt = await requiredMetaContent(
      page,
      'meta[property="og:image:alt"]',
      publicPage.path,
    );

    expect(
      await requiredMetaContent(
        page,
        'meta[name="twitter:card"]',
        publicPage.path,
      ),
    ).toBe("summary_large_image");
    expect(
      await requiredMetaContent(
        page,
        'meta[name="twitter:title"]',
        publicPage.path,
      ),
    ).toBe(openGraphTitle);
    expect(
      await requiredMetaContent(
        page,
        'meta[name="twitter:description"]',
        publicPage.path,
      ),
    ).toBe(openGraphDescription);
    expect(
      await requiredMetaContent(
        page,
        'meta[name="twitter:image"]',
        publicPage.path,
      ),
    ).toBe(socialImageUrl);
    expect(
      await requiredMetaContent(
        page,
        'meta[name="twitter:image:alt"]',
        publicPage.path,
      ),
    ).toBe(openGraphImageAlt);

    expect(await page.content()).not.toContain("uwazieshiloh47-bot.github.io");

    const structuredData = page.locator('script[type="application/ld+json"]');
    if (publicPage.path === "/") {
      await expect(structuredData).toHaveCount(1);
      const graph = JSON.parse((await structuredData.textContent()) ?? "")[
        "@graph"
      ];
      expect(graph.map((entity) => entity["@type"]).sort()).toEqual([
        "Person",
        "ProfilePage",
        "WebSite",
      ]);
    } else {
      await expect(structuredData).toHaveCount(0);
    }
  }
});

test("public pages have no automated WCAG accessibility violations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });

  for (const publicPage of publicPages) {
    await page.goto(publicPage.canonical, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations,
      `${publicPage.path}:\n${accessibilitySummary(results.violations)}`,
    ).toEqual([]);
  }
});

test("keyboard users can reveal and use the skip link", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });
  await page.goto(portfolioUrl, { waitUntil: "domcontentloaded" });

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");

  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  expect(
    await skipLink.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).outlineWidth),
    ),
  ).toBeGreaterThan(0);

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});

test("public pages avoid horizontal overflow at production breakpoints", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "One layout engine is sufficient here");
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });

  const viewports = [
    { name: "phone", width: 360, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const publicPage of publicPages) {
      await page.goto(publicPage.canonical, { waitUntil: "domcontentloaded" });

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(
        layout.scrollWidth,
        `${publicPage.path} at ${viewport.name}`,
      ).toBeLessThanOrEqual(layout.clientWidth + 1);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    }
  }
});

test("responses enforce the production browser security policy", async ({
  request,
}) => {
  const response = await request.get(portfolioUrl);
  const headers = response.headers();
  const contentSecurityPolicy = headers["content-security-policy"];

  expect(response.ok()).toBe(true);
  expect(contentSecurityPolicy).toBeTruthy();
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://jhuqchs9nc.execute-api.us-east-2.amazonaws.com",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "upgrade-insecure-requests",
  ]) {
    expect(contentSecurityPolicy).toContain(directive);
  }
  expect(headers["permissions-policy"]).toBe(
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});

test("the homepage loads without Content Security Policy violations", async ({
  page,
}) => {
  const policyViolations = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      policyViolations.push(message.text());
    }
  });
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-visit-counted", "true");
  });

  await page.goto(portfolioUrl, { waitUntil: "networkidle" });

  expect(policyViolations).toEqual([]);
  await expect(page.locator("#visitor-count")).toHaveText(/^\d[\d,]*$/);
});

test("deployed files use production content types and cache policies", async ({
  request,
}) => {
  const htmlCache = [
    "public",
    "max-age=0",
    "s-maxage=300",
    "must-revalidate",
  ];
  const codeCache = [
    "public",
    "max-age=3600",
    "s-maxage=31536000",
    "stale-while-revalidate=86400",
  ];
  const assetCache = [
    "public",
    "max-age=604800",
    "s-maxage=31536000",
    "stale-while-revalidate=2592000",
  ];
  const deployedFiles = [
    {
      path: "/",
      contentType: /^text\/html;\s*charset=utf-8$/i,
      cache: htmlCache,
    },
    {
      path: "/robots.txt",
      contentType: /^text\/plain;\s*charset=utf-8$/i,
      cache: htmlCache,
    },
    {
      path: "/sitemap.xml",
      contentType: /^application\/xml;\s*charset=utf-8$/i,
      cache: htmlCache,
    },
    {
      path: "/styles.css",
      contentType: /^text\/css;\s*charset=utf-8$/i,
      cache: codeCache,
    },
    {
      path: "/visitor-counter.js",
      contentType: /^text\/javascript;\s*charset=utf-8$/i,
      cache: codeCache,
    },
    {
      path: "/social-preview.png",
      contentType: /^image\/png$/i,
      cache: assetCache,
    },
    {
      path: "/documents/Shiloh-Uwazie-Resume.pdf",
      contentType: /^application\/pdf$/i,
      cache: assetCache,
    },
    {
      path: "/fonts/FascinateInline-Regular.ttf",
      contentType: /^font\/ttf$/i,
      cache: assetCache,
    },
  ];

  for (const file of deployedFiles) {
    const response = await request.get(new URL(file.path, portfolioUrl).href);

    expect(response.ok(), `${file.path}: status`).toBe(true);
    expect(
      response.headers()["content-type"],
      `${file.path}: Content-Type`,
    ).toMatch(file.contentType);
    expectCacheControl(response, file.cache);
  }
});

test("the social preview image is ready for sharing", async ({ request }) => {
  const response = await request.get(socialImageUrl);

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^image\/png(?:;|$)/);

  const image = await response.body();
  expect([...image.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(630);
});
