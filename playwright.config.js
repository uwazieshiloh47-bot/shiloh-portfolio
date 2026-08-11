import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./smoke",
  /*
    90s rather than 45s. Several of these tests walk all six public pages in a
    single test, so the budget covers six sequential loads against CloudFront
    rather than one. That fits comfortably on the CI runner and did not on a
    Windows laptop under headless WebKit, which failed on the page load itself
    and read as an accessibility failure. Nothing about what is asserted changed.
  */
  timeout: 90_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
