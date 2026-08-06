import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./smoke",
  timeout: 20_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    browserName: "chromium",
    trace: "retain-on-failure",
  },
});
