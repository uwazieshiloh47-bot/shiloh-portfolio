import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const siteUrl = "https://dk7omuhbtlkuj.cloudfront.net";
const socialImageUrl = `${siteUrl}/social-preview.png`;
const publicPages = [
  { file: "index.html", canonical: `${siteUrl}/` },
  { file: "about.html", canonical: `${siteUrl}/about.html` },
  { file: "work.html", canonical: `${siteUrl}/work.html` },
  { file: "skills.html", canonical: `${siteUrl}/skills.html` },
  { file: "resume.html", canonical: `${siteUrl}/resume.html` },
  { file: "contact.html", canonical: `${siteUrl}/contact.html` },
];

const readText = (file) => readFile(file, "utf8");

function parseAttributes(tag) {
  const attributes = {};

  for (const match of tag.matchAll(
    /([:@A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3];
  }

  return attributes;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    ([tag]) => parseAttributes(tag),
  );
}

function requiredMeta(html, attribute, value, file) {
  const matches = tags(html, "meta").filter(
    (meta) => meta[attribute] === value,
  );

  assert.equal(matches.length, 1, `${file}: expected one ${attribute}="${value}"`);
  assert.ok(matches[0].content?.trim(), `${file}: ${value} must have content`);
  return matches[0].content;
}

function canonicalLinks(html) {
  return tags(html, "link").filter((link) =>
    link.rel?.split(/\s+/).includes("canonical"),
  );
}

test("public pages expose unique canonical and social metadata", async () => {
  const pageTitles = new Set();
  const pageDescriptions = new Set();
  const canonicalUrls = new Set();

  for (const page of publicPages) {
    const html = await readText(page.file);
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim();
    const description = requiredMeta(html, "name", "description", page.file);
    const canonical = canonicalLinks(html);

    assert.ok(title, `${page.file}: missing title`);
    assert.equal(canonical.length, 1, `${page.file}: expected one canonical link`);
    assert.equal(canonical[0].href, page.canonical, `${page.file}: wrong canonical`);

    assert.equal(requiredMeta(html, "property", "og:type", page.file), "website");
    assert.equal(
      requiredMeta(html, "property", "og:site_name", page.file),
      "Shiloh Uwazie",
    );
    assert.equal(requiredMeta(html, "property", "og:locale", page.file), "en_US");
    assert.equal(
      requiredMeta(html, "property", "og:url", page.file),
      page.canonical,
    );
    assert.equal(
      requiredMeta(html, "property", "og:image", page.file),
      socialImageUrl,
    );
    assert.equal(
      requiredMeta(html, "property", "og:image:type", page.file),
      "image/png",
    );
    assert.equal(
      requiredMeta(html, "property", "og:image:width", page.file),
      "1200",
    );
    assert.equal(
      requiredMeta(html, "property", "og:image:height", page.file),
      "630",
    );

    const openGraphTitle = requiredMeta(html, "property", "og:title", page.file);
    const openGraphDescription = requiredMeta(
      html,
      "property",
      "og:description",
      page.file,
    );
    const openGraphImageAlt = requiredMeta(
      html,
      "property",
      "og:image:alt",
      page.file,
    );

    assert.equal(
      requiredMeta(html, "name", "twitter:card", page.file),
      "summary_large_image",
    );
    assert.equal(
      requiredMeta(html, "name", "twitter:title", page.file),
      openGraphTitle,
    );
    assert.equal(
      requiredMeta(html, "name", "twitter:description", page.file),
      openGraphDescription,
    );
    assert.equal(
      requiredMeta(html, "name", "twitter:image", page.file),
      socialImageUrl,
    );
    assert.equal(
      requiredMeta(html, "name", "twitter:image:alt", page.file),
      openGraphImageAlt,
    );

    assert.doesNotMatch(html, /uwazieshiloh47-bot\.github\.io/i);
    assert.doesNotMatch(html, /\/shiloh-portfolio\//i);
    assert.ok(!pageTitles.has(title), `${page.file}: duplicate title`);
    assert.ok(
      !pageDescriptions.has(description),
      `${page.file}: duplicate description`,
    );
    assert.ok(!canonicalUrls.has(page.canonical), `${page.file}: duplicate canonical`);

    pageTitles.add(title);
    pageDescriptions.add(description);
    canonicalUrls.add(page.canonical);
  }
});

test("sitemap and robots files advertise the canonical pages", async () => {
  const [sitemap, robots] = await Promise.all([
    readText("sitemap.xml"),
    readText("robots.txt"),
  ]);
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, url]) => url,
  );

  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.deepEqual(
    sitemapUrls,
    publicPages.map((page) => page.canonical),
  );
  assert.doesNotMatch(sitemap, /404\.html/i);

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${siteUrl}/sitemap\\.xml$`, "m"));
  assert.doesNotMatch(robots, /^Disallow:/im);
});

test("the 404 page stays recoverable and out of search results", async () => {
  const html = await readText("404.html");
  const robots = requiredMeta(html, "name", "robots", "404.html")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  const socialMetadata = tags(html, "meta").filter(
    (meta) => meta.property?.startsWith("og:") || meta.name?.startsWith("twitter:"),
  );

  assert.ok(robots.includes("noindex"));
  assert.equal(canonicalLinks(html).length, 0);
  assert.equal(socialMetadata.length, 0);
  assert.doesNotMatch(html, /visitor-counter\.js/);
  assert.doesNotMatch(html, /class="visitor-counter"/);
  assert.doesNotMatch(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /\/shiloh-portfolio\//);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/work\.html"/);
});

test("the social preview asset is a 1200 by 630 PNG", async () => {
  const image = await readFile("social-preview.png");

  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test("homepage JSON-LD connects the website, profile, and person", async () => {
  const html = await readText("index.html");
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  assert.equal(scripts.length, 1, "index.html: expected one JSON-LD block");

  const structuredData = JSON.parse(scripts[0][1]);
  const graph = structuredData["@graph"];

  assert.equal(structuredData["@context"], "https://schema.org");
  assert.ok(Array.isArray(graph));

  const entities = new Map(graph.map((entity) => [entity["@type"], entity]));
  assert.deepEqual([...entities.keys()].sort(), ["Person", "ProfilePage", "WebSite"]);

  const website = entities.get("WebSite");
  const profile = entities.get("ProfilePage");
  const person = entities.get("Person");

  assert.equal(website.url, `${siteUrl}/`);
  assert.equal(profile.url, `${siteUrl}/`);
  assert.equal(person.url, `${siteUrl}/`);
  assert.equal(website.publisher["@id"], person["@id"]);
  assert.equal(profile.mainEntity["@id"], person["@id"]);
  assert.equal(profile.isPartOf["@id"], website["@id"]);
  assert.equal(person.name, "Shiloh Uwazie");
  assert.ok(person.sameAs.includes("https://github.com/uwazieshiloh47-bot"));
  assert.ok(person.sameAs.includes("https://www.linkedin.com/in/shiloh-uwazie"));

  for (const topic of ["Cloud Engineering", "DevOps", "Terraform", "Python", "Go"]) {
    assert.ok(person.knowsAbout.includes(topic), `Person is missing topic: ${topic}`);
  }
});
