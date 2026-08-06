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

async function renderVisitorCount() {
  const countElement = document.querySelector("#visitor-count");
  const counterElement = countElement?.closest(".visitor-counter");

  if (!countElement || !counterElement) return;

  try {
    const count = await fetchVisitorCount();
    countElement.textContent = count.toLocaleString();
    counterElement.hidden = false;
  } catch (error) {
    console.warn("Visitor count is currently unavailable.", error);
  }
}

if (typeof document !== "undefined") {
  void renderVisitorCount();
}
