const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e', testMatch: '**/*.spec.js', workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4180', browserName: 'chromium', viewport: { width: 1440, height: 1000 } },
});
