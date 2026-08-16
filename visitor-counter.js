// Base URL of the visitor analytics API, from the portfolio-visitor-analytics
// repo: `terraform -chdir=infra output -raw api_url`.
//
// API Gateway generates this ID, so destroying & recreating the API produces
// a different one and this value must be updated manually. Failure is quiet
// by design, the fetch fails, the counter stays hidden, the page looks normal
// so nothing here will tell you it has gone stale.
export const API_BASE_URL =
  "https://jhuqchs9nc.execute-api.us-east-2.amazonaws.com";

const VISIT_MARKER = "portfolio-visit-counted";

function hasBeenCounted(storage) {
  try {
    return storage?.getItem(VISIT_MARKER) === "true";
  } catch {
    return false;
  }
}

function markAsCounted(storage) {
  try {
    storage?.setItem(VISIT_MARKER, "true");
  } catch {
    // The counter still works when browser privacy settings block storage.
  }
}

export async function fetchVisitorCount({
  fetchImplementation = globalThis.fetch,
  storage = globalThis.sessionStorage,
} = {}) {
  const alreadyCounted = hasBeenCounted(storage);
  const path = alreadyCounted ? "/count" : "/visit";
  const method = alreadyCounted ? "GET" : "POST";
  // Without a deadline a hung API leaves this promise pending forever, so the
  // counter stays hidden and the connection stays open. Aborting rejects,
  // which the caller already treats as "just don't show the counter".
  const response = await fetchImplementation(`${API_BASE_URL}${path}`, {
    method,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Visitor API returned ${response.status}`);
  }

  const data = await response.json();

  if (!Number.isSafeInteger(data.count) || data.count < 0) {
    throw new Error("Visitor API returned an invalid count");
  }

  if (!alreadyCounted) {
    markAsCounted(storage);
  }

  return data.count;
}

/*
  Recording the visit and showing the number are separate concerns.

  The count is only displayed next to the project that produces it, which is on
  two pages, but a visit is a visit wherever someone lands - so this returns
  early for nothing. It used to bail before the fetch when there was no element
  to write into, which would have quietly stopped counting anyone who arrived
  on About, Contact, Skills or the resume.
*/
async function renderVisitorCount() {
  const countElement = document.querySelector("#visitor-count");
  const counterElement = countElement?.closest(".visitor-counter");
  const method = hasBeenCounted(globalThis.sessionStorage) ? "GET" : "POST";
  const startedAt = performance.now();

  try {
    const count = await fetchVisitorCount();

    if (countElement && counterElement) {
      countElement.textContent = count.toLocaleString();
      counterElement.hidden = false;
    }

    /*
      An event rather than a direct call: this file's job is recording and
      showing the count, not knowing that work.html also replays this request
      as a diagram. Pages that care can listen; pages that don't pay nothing.
    */
    document.dispatchEvent(
      new CustomEvent("portfolio:visit-recorded", {
        detail: { method, durationMs: performance.now() - startedAt },
      }),
    );
  } catch (error) {
    console.warn("Visitor count is currently unavailable.", error);
  }
}

if (typeof document !== "undefined") {
  void renderVisitorCount();
}
