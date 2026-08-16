// Replays the trueCount request-flow diagram on work.html using the real
// method and duration of this page's own visitor-count request, dispatched
// as "portfolio:visit-recorded" by visitor-counter.js. Reduced motion is not
// handled here - the global rule in styles.css already collapses every
// animation on the page to 0.01ms, so gating twice would be redundant.
const figure = document.querySelector(".architecture");

if (figure) {
  const readout = figure.querySelector(".arc-readout");
  const readoutValue = readout?.querySelector("strong");
  const writeLabel = figure.querySelector(".arc-write");
  const readLabel = figure.querySelector(".arc-read");

  let dataReady = false;
  let isVisible = false;

  // The animation itself loops forever once started; what starts and stops
  // it is visibility. Pausing off-screen isn't optional the way the loop
  // count is - nothing is served by animating a diagram nobody is looking at.
  function sync() {
    figure.classList.toggle("is-running", dataReady && isVisible);
  }

  document.addEventListener("portfolio:visit-recorded", (event) => {
    const { method, durationMs } = event.detail;

    (method === "POST" ? readLabel : writeLabel)?.classList.add("is-dim");
    figure.classList.add(method === "POST" ? "is-write" : "is-read");

    if (readoutValue) {
      readoutValue.textContent = `${Math.round(durationMs)}ms`;
      readout.hidden = false;
    }

    dataReady = true;
    sync();
  });

  new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.4 },
  ).observe(figure);
}
