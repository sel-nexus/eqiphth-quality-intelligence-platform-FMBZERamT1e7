/** Launch the existing Vite demo and discover only browser journey specs.
 * Notes:
 *   PLAYWRIGHT_BASE_URL selects the local origin; PLAYWRIGHT_PORT may override
 *   its port only when they agree. Defaults launch and test 127.0.0.1:4173.
 */
import { defineConfig } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const serverURL = new URL(baseURL);
const serverPort = serverURL.port || (serverURL.protocol === 'https:' ? '443' : '80');
if (serverURL.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(serverURL.hostname) || serverURL.pathname !== '/') {
  throw new Error('PLAYWRIGHT_BASE_URL must be a local HTTP origin for the Vite webServer.');
}
if (process.env.PLAYWRIGHT_PORT && process.env.PLAYWRIGHT_PORT !== serverPort) {
  throw new Error('PLAYWRIGHT_PORT must match the port in PLAYWRIGHT_BASE_URL.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host ${serverURL.hostname} --port ${serverPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
