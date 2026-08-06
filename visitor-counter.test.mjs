import assert from "node:assert/strict";
import test from "node:test";

import { API_BASE_URL, fetchVisitorCount } from "./visitor-counter.js";

function storageWith(value = null) {
  let storedValue = value;

  return {
    getItem() {
      return storedValue;
    },
    setItem(_key, nextValue) {
      storedValue = nextValue;
    },
  };
}

test("the first page load increments the visitor count", async () => {
  const storage = storageWith();
  let request;
  const count = await fetchVisitorCount({
    storage,
    async fetchImplementation(url, options) {
      request = { url, options };
      return { ok: true, async json() { return { count: 42 }; } };
    },
  });

  assert.equal(count, 42);
  assert.equal(request.url, `${API_BASE_URL}/visit`);
  assert.equal(request.options.method, "POST");
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.equal(storage.getItem(), "true");
});

test("later page loads in the same tab only read the count", async () => {
  let request;
  const count = await fetchVisitorCount({
    storage: storageWith("true"),
    async fetchImplementation(url, options) {
      request = { url, options };
      return { ok: true, async json() { return { count: 42 }; } };
    },
  });

  assert.equal(count, 42);
  assert.equal(request.url, `${API_BASE_URL}/count`);
  assert.equal(request.options.method, "GET");
  assert.ok(request.options.signal instanceof AbortSignal);
});

test("an unsuccessful API response is rejected", async () => {
  await assert.rejects(
    fetchVisitorCount({
      storage: storageWith(),
      async fetchImplementation() {
        return { ok: false, status: 500 };
      },
    }),
    /Visitor API returned 500/,
  );
});

test("an invalid count is rejected", async () => {
  await assert.rejects(
    fetchVisitorCount({
      storage: storageWith(),
      async fetchImplementation() {
        return { ok: true, async json() { return { count: "42" }; } };
      },
    }),
    /invalid count/,
  );
});
