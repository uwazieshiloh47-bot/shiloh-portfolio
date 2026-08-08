import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const publicPages = [
  "index.html",
  "about.html",
  "work.html",
  "skills.html",
  "resume.html",
  "contact.html",
];

const readText = (file) => readFile(file, "utf8");

function fontPreloads(html) {
  return [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*as="font"[^>]*>/gi)].map(
    ([tag]) => tag,
  );
}

test("public pages preload only the decorative fonts they use above the fold", async () => {
  for (const file of publicPages) {
    const html = await readText(file);
    const preloads = fontPreloads(html);
    const logoFont = preloads.filter((tag) =>
      tag.includes("fonts/FleurDeLeah-Regular.ttf"),
    );
    const displayFont = preloads.filter((tag) =>
      tag.includes("fonts/FascinateInline-Regular.ttf"),
    );

    assert.equal(logoFont.length, 1, `${file}: expected one logo font preload`);
    assert.match(logoFont[0], /type="font\/ttf"/);
    assert.match(logoFont[0], /\bcrossorigin\b/);
    assert.equal(
      displayFont.length,
      file === "index.html" ? 1 : 0,
      `${file}: display font preload`,
    );
  }
});

test("critical static assets stay within their size budgets", async () => {
  const budgets = [
    { file: "styles.css", maximumBytes: 50_000 },
    { file: "visitor-counter.js", maximumBytes: 5_000 },
    { file: "social-preview.png", maximumBytes: 750_000 },
    { file: "fonts/FascinateInline-Regular.ttf", maximumBytes: 75_000 },
    { file: "fonts/FleurDeLeah-Regular.ttf", maximumBytes: 250_000 },
  ];

  for (const budget of budgets) {
    const file = await stat(budget.file);

    assert.ok(
      file.size <= budget.maximumBytes,
      `${budget.file} is ${file.size} bytes; budget is ${budget.maximumBytes}`,
    );
  }
});

test("CloudFront compression remains enabled", async () => {
  const terraform = await readText("infra/cloudfront.tf");

  assert.match(
    terraform,
    /default_cache_behavior\s*\{[\s\S]*?compress\s*=\s*true[\s\S]*?\}/,
  );
});
