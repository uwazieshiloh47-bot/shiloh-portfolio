/*
  Catches horizontal overflow before a deploy rather than after one.

    npm run test:layout

  The smoke suite already checks this, but it runs against production - which
  means the first time anyone learns a page scrolls sideways on a phone, it is
  already scrolling sideways for visitors. That happened: moving the visitor
  count out of the footer put an uppercase monospace line with wide tracking
  into a 360px column, and the homepage shipped broken.

  Two details this script exists to get right, both of which hid that bug:

  - The counter cannot render against a local server. Its API only allows the
    CloudFront origin, so a local page always has it hidden, and any check that
    just loads the page is measuring markup that is not on screen. This forces
    it visible and stubs in a number wider than the real one will be for years.

  - Overflow is measured with documentElement.scrollWidth, not by looking for
    an element whose bounding rect exceeds the viewport. Text that cannot wrap
    overflows inside its own box: no rect moves, so an element scan reports a
    clean page while the document scrolls.
*/
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "http://127.0.0.1:5500";

const PAGES = [
  "index.html",
  "work.html",
  "skills.html",
  "about.html",
  "contact.html",
  "resume.html",
  "404.html",
];

/*
  320 is narrower than the smoke suite's 360 on purpose: this gate is free and
  runs before anything ships, so it may as well be the stricter of the two.
*/
const WIDTHS = [320, 360, 768, 1024, 1440];

async function waitForServer(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ORIGIN}/index.html`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Local server never came up on ${ORIGIN}`);
}

const server = spawn(process.execPath, [join(root, "scripts", "serve.mjs")], {
  cwd: root,
  stdio: "ignore",
});

let browser;
const failures = [];

try {
  await waitForServer();
  browser = await chromium.launch();

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });

    for (const page of PAGES) {
      const tab = await context.newPage();
      await tab.goto(`${ORIGIN}/${page}`, { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);

      const shown = await tab.evaluate(() => {
        const counter = document.querySelector(".visitor-counter");
        if (!counter) return false;
        counter.hidden = false;
        // Wider than the real count will be for a very long time.
        document.querySelector("#visitor-count").textContent = "8,888,888";
        return true;
      });

      const { scrollWidth, clientWidth } = await tab.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (scrollWidth > clientWidth + 1) {
        failures.push(
          `${page} at ${width}px: document scrolls to ${scrollWidth}` +
            ` in a ${clientWidth} viewport` +
            (shown ? " (visitor count shown)" : ""),
        );
      }

      await tab.close();
    }

    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length) {
  console.error("Horizontal overflow:\n  " + failures.join("\n  "));
  process.exit(1);
}

console.log(
  `No horizontal overflow: ${PAGES.length} pages x ${WIDTHS.length} widths ` +
    `(${WIDTHS.join(", ")}px).`,
);
