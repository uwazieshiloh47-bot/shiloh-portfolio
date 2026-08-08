import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPages = [
  "index.html",
  "about.html",
  "work.html",
  "skills.html",
  "resume.html",
  "contact.html",
];
const allPages = [...publicPages, "404.html"];

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

test("pages provide keyboard and screen-reader navigation essentials", async () => {
  for (const file of allPages) {
    const html = await readText(file);
    const skipLinkPosition = html.indexOf('class="skip-link"');
    const headerPosition = html.indexOf("<header");

    assert.match(html, /<html\b[^>]*\blang="en"/i, `${file}: page language`);
    assert.match(
      html,
      /<meta\b[^>]*name="viewport"[^>]*content="width=device-width,\s*initial-scale=1\.0"/i,
      `${file}: responsive viewport`,
    );
    assert.ok(skipLinkPosition >= 0, `${file}: missing skip link`);
    assert.ok(
      skipLinkPosition < headerPosition,
      `${file}: skip link must precede the header`,
    );
    assert.match(
      html,
      /<a\b[^>]*class="skip-link"[^>]*href="#main-content"/i,
      `${file}: skip link target`,
    );
    assert.equal(
      (html.match(/<main\b[^>]*id="main-content"/gi) ?? []).length,
      1,
      `${file}: expected one main landmark target`,
    );
    assert.equal(
      (html.match(/<h1\b/gi) ?? []).length,
      1,
      `${file}: expected one primary heading`,
    );
    assert.doesNotMatch(
      html,
      /tabindex="[1-9][0-9]*"/i,
      `${file}: positive tabindex disrupts keyboard order`,
    );
  }
});

test("external new-tab links disclose their behavior", async () => {
  for (const file of allPages) {
    const html = await readText(file);
    const links = [...html.matchAll(/<a\b[^>]*>/gi)].map(([tag]) => ({
      tag,
      attributes: parseAttributes(tag),
    }));

    for (const link of links.filter(
      ({ attributes }) => attributes.target === "_blank",
    )) {
      const relationship = link.attributes.rel?.split(/\s+/) ?? [];

      assert.ok(relationship.includes("noopener"), `${file}: ${link.tag}`);
      assert.ok(relationship.includes("noreferrer"), `${file}: ${link.tag}`);
      assert.match(
        link.attributes["aria-label"] ?? "",
        /opens in a new tab/i,
        `${file}: ${link.tag}`,
      );
    }
  }
});

test("public navigation identifies the current page", async () => {
  for (const file of publicPages) {
    const html = await readText(file);

    assert.equal(
      (html.match(/aria-current="page"/gi) ?? []).length,
      1,
      `${file}: expected one current-page navigation item`,
    );
  }
});
