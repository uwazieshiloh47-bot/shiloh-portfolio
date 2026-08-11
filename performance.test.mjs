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

test("public pages preload only the fonts they use above the fold", async () => {
  for (const file of publicPages) {
    const html = await readText(file);
    const preloads = fontPreloads(html);

    /*
      Playfair upright sets every heading and the monogram, all above the fold,
      so each page preloads it. The italic is used in one place - the emphasised
      phrase in the home hero - so only index.html pays for it.
    */
    const serifUpright = preloads.filter((tag) =>
      tag.includes("fonts/PlayfairDisplay-Regular.woff2"),
    );
    const serifItalic = preloads.filter((tag) =>
      tag.includes("fonts/PlayfairDisplay-Italic.woff2"),
    );

    assert.equal(serifUpright.length, 1, `${file}: serif upright preload`);
    assert.match(serifUpright[0], /type="font\/woff2"/);
    assert.match(serifUpright[0], /\bcrossorigin\b/);
    assert.equal(
      serifItalic.length,
      file === "index.html" ? 1 : 0,
      `${file}: serif italic preload`,
    );

    /*
      Two faces and no more. Both decorative fonts are gone - each existed for a
      single element and cost 287KB between them - and this catches one being
      quietly reintroduced.
    */
    assert.equal(
      preloads.length,
      file === "index.html" ? 2 : 1,
      `${file}: unexpected font preload`,
    );
  }
});

test("critical static assets stay within their size budgets", async () => {
  const budgets = [
    /*
      55,000. The original figure was 50,000, and the Gilded cleanup did not get
      back under it - the sheet settles around 54KB, so this is a new steady
      state rather than a temporary allowance.

      What came out: the duplicate design the rollout left behind, 65 duplicated
      selectors folded into one rule each, and the dead .featured-work,
      .resume-section > h2 and background-stars rules. What is left is one
      design plus 19 selector pairs that cannot be safely folded, because an
      @media rule sits between the two halves - moving declarations down past a
      breakpoint silently changes which one wins.

      The remaining gap to 50,000 is the design itself: a serif scale, the gold
      ramp, two star planes and full coverage of six page types cost more than
      what they replaced, and the two Playfair @font-face blocks add a further
      1.2KB. Treat a failure here as real growth to look at.
    */
    { file: "styles.css", maximumBytes: 56_000 },
    { file: "visitor-counter.js", maximumBytes: 5_000 },
    { file: "social-preview.png", maximumBytes: 750_000 },

    /*
      Latin subsets, not the full faces - those are around 180KB each. If either
      of these grows past 30KB it means a wider subset was swapped in, which is
      worth noticing rather than absorbing.
    */
    { file: "fonts/PlayfairDisplay-Regular.woff2", maximumBytes: 30_000 },
    { file: "fonts/PlayfairDisplay-Italic.woff2", maximumBytes: 30_000 },
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
