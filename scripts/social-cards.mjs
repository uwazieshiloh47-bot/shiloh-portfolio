/*
  Generates the Open Graph cards.

    node scripts/social-cards.mjs

  The cards are rendered from the same tokens the site uses - the real Playfair
  files out of fonts/, the same gold ramp, the same two-scale starfield - so the
  card and the page it links to cannot drift apart. That drift is exactly what
  went wrong with the previous card: it was drawn by hand, the site was
  redesigned around it, and it spent a while advertising a look that no longer
  existed.

  Output is committed to the repository. Nothing runs at deploy time, which
  keeps the no-build-step promise on the work page intact - but it does mean
  re-running this by hand after changing a card, and naming any new file in
  .github/workflows/deploy.yml or it will silently never ship.
*/
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { statSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fontsUrl = `file:///${join(root, "fonts").replace(/\\/g, "/")}`;

/*
  1200x630 is the Open Graph aspect ratio every platform documents; rendering it
  at deviceScaleFactor 2 gives a 2400x1260 file that stays sharp on high-density
  screens. The meta tags report the real pixel size, so they say 2400x1260.
*/
const WIDTH = 1200;
const HEIGHT = 630;
const SCALE = 2;

/*
  `wordmark` is the site-wide default; `page` is the per-page template. Alt text
  lives here too so the card and its description are edited in one place.
*/
const CARDS = [
  {
    out: "social-preview.png",
    layout: "wordmark",
    alt: "Shiloh Uwazie, cloud engineering and DevOps. Deep purple card with a gold starfield, the name set in a serif with a metallic gold surname, and an SU monogram.",
  },
  {
    out: "social-work.png",
    layout: "page",
    eyebrow: "Selected Work",
    title: "Projects",
    sub: "Serverless analytics on AWS, defined end to end in Terraform.",
    alt: "Projects — Shiloh Uwazie. Deep purple card with a gold starfield and the word Projects in metallic gold.",
  },
  {
    out: "social-skills.png",
    layout: "page",
    eyebrow: "Technical Growth",
    title: "Skills",
    sub: "The technologies at the centre of my work, and the certifications behind them.",
    alt: "Skills — Shiloh Uwazie. Deep purple card with a gold starfield and the word Skills in metallic gold.",
  },
  {
    out: "social-resume.png",
    layout: "page",
    eyebrow: "Professional Background",
    title: "Résumé",
    sub: "Education, experience, and the road toward Cloud Solutions Architect.",
    alt: "Résumé — Shiloh Uwazie. Deep purple card with a gold starfield and the word Résumé in metallic gold.",
  },
  {
    out: "social-about.png",
    layout: "page",
    eyebrow: "Behind the Portfolio",
    title: "About",
    sub: "Why cloud engineering fits the way I think and solve problems.",
    alt: "About — Shiloh Uwazie. Deep purple card with a gold starfield and the word About in metallic gold.",
  },
  {
    out: "social-contact.png",
    layout: "page",
    eyebrow: "Start a Conversation",
    title: "Contact",
    sub: "Technology, a project, or an opportunity — I would be glad to hear from you.",
    alt: "Contact — Shiloh Uwazie. Deep purple card with a gold starfield and the word Contact in metallic gold.",
  },
];

const byline = `Shiloh Uwazie — Cloud Engineering <span class="sep">·</span> <span class="devops">DevOps</span>`;

const body = (card) =>
  card.layout === "wordmark"
    ? `<div class="card wordmark">
         <div class="top">
           <p class="eyebrow">Cloud Engineering <span class="sep">—</span> <span class="devops">DevOps</span></p>
           <span class="su metal">SU</span>
         </div>
         <div class="mid">
           <h1>Shiloh <span class="metal">Uwazie</span></h1>
           <div class="rule"></div>
         </div>
         <div class="foot">
           <p class="stack">AWS · Terraform · Python · Go</p>
           <p class="tag">Portfolio</p>
         </div>
       </div>`
    : `<div class="card page">
         <div class="top">
           <p class="eyebrow">${card.eyebrow}</p>
           <span class="su metal">SU</span>
         </div>
         <div class="mid">
           <h1 class="metal">${card.title}</h1>
           <p class="sub">${card.sub}</p>
         </div>
         <div class="foot">
           <p class="stack">${byline}</p>
           <p class="tag">Portfolio</p>
         </div>
       </div>`;

const document = (card) => `<!doctype html>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Playfair Display";
    src: url("${fontsUrl}/PlayfairDisplay-Regular.woff2") format("woff2");
    font-weight: 400; font-style: normal; font-display: block;
  }
  @font-face {
    font-family: "Playfair Display";
    src: url("${fontsUrl}/PlayfairDisplay-Italic.woff2") format("woff2");
    font-weight: 400; font-style: italic; font-display: block;
  }
  :root {
    --gold: #f2c14e; --green: #2dd881; --blue: #38bdf8;
    --text: #f7f4fc; --dim: rgba(247,244,252,.66); --bg: #0d0818;
    --rule: rgba(242,193,78,.3);
    --serif: "Playfair Display", Georgia, serif;
    --mono: ui-monospace, SFMono-Regular, Consolas, Menlo, monospace;
    --ramp: linear-gradient(96deg, #c9962f 0%, #f2c14e 34%, #ffe9a8 52%, #f2c14e 68%, #b8862a 100%);
  }
  * { box-sizing: border-box; margin: 0; }
  .card {
    width: ${WIDTH}px; height: ${HEIGHT}px; padding: 76px 90px;
    position: relative; overflow: hidden;
    background-color: var(--bg); color: var(--text);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  /* Two tile scales, so the repeat never resolves into a visible grid. */
  .card::before {
    content: ""; position: absolute; inset: 0;
    background-image:
      radial-gradient(circle, rgba(242,193,78,.8) 1.1px, transparent 1.4px),
      radial-gradient(circle, rgba(247,244,252,.62) .9px, transparent 1.2px),
      radial-gradient(circle, rgba(242,193,78,.45) .8px, transparent 1.1px),
      radial-gradient(circle, rgba(247,244,252,.33) .7px, transparent 1px),
      radial-gradient(circle, rgba(139,92,246,.5) .8px, transparent 1.1px);
    background-size: 196px 196px, 196px 196px, 98px 98px, 98px 98px, 131px 131px;
    background-position: 0 0, 63px 121px, 22px 66px, 80px 12px, 45px 90px;
  }
  .card::after {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 90% 62% at 50% -14%, rgba(49,30,95,.72) 0%, transparent 62%),
      radial-gradient(ellipse 70% 55% at 88% 112%, rgba(139,92,246,.3) 0%, transparent 60%);
  }
  .card > * { position: relative; z-index: 1; }

  .metal {
    background-image: var(--ramp);
    -webkit-background-clip: text; background-clip: text;
    color: transparent; -webkit-text-fill-color: transparent;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .eyebrow {
    font-family: var(--mono); font-size: 20px; letter-spacing: .32em;
    text-transform: uppercase; color: var(--gold); white-space: nowrap;
  }
  /* The two accents the pre-rebrand card used, each carrying one word. */
  .devops { color: var(--green); }
  .sep { color: rgba(247,244,252,.34); }
  .su { font-family: var(--serif); font-style: italic; font-size: 76px; line-height: .9; }
  .stack {
    font-family: var(--mono); font-size: 19px; letter-spacing: .24em;
    text-transform: uppercase; color: var(--dim); white-space: nowrap;
  }
  .tag {
    font-family: var(--mono); font-size: 19px; letter-spacing: .3em;
    text-transform: uppercase; color: var(--blue);
  }
  .rule { height: 1px; background: var(--rule); width: 100%; }
  .foot { display: flex; justify-content: space-between; align-items: baseline; }

  .wordmark .mid { display: flex; flex-direction: column; gap: 34px; }
  .wordmark h1 {
    font-family: var(--serif); font-weight: 400; font-size: 124px;
    line-height: .94; letter-spacing: -.026em;
  }
  .page h1 {
    font-family: var(--serif); font-weight: 400; font-size: 128px;
    line-height: .94; letter-spacing: -.03em;
  }
  .page .sub {
    font-family: var(--serif); font-size: 31px; color: var(--dim);
    margin-top: 18px; max-width: 26ch; line-height: 1.3;
  }
  .page .foot { padding-top: 26px; border-top: 1px solid var(--rule); }
</style>
${body(card)}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: SCALE,
});

for (const card of CARDS) {
  await page.setContent(document(card), { waitUntil: "load" });
  // Without this the screenshot can land while Playfair is still swapping in.
  await page.evaluate(() => window.document.fonts.ready);
  const out = join(root, card.out);
  await page.locator(".card").screenshot({ path: out });
  const kb = (statSync(out).size / 1024).toFixed(1);
  console.log(`${card.out.padEnd(22)} ${WIDTH * SCALE}x${HEIGHT * SCALE}  ${kb}KB`);
}

await browser.close();

/*
  Alt text is exported so the pages and the tests can read it from here rather
  than keeping their own copy in sync by hand.
*/
export const CARD_ALT = Object.fromEntries(CARDS.map((c) => [c.out, c.alt]));
