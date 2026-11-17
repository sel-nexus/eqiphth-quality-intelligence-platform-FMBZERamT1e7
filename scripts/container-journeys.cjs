// Execute the existing journey assertions directly when CLI discovery is unavailable.
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const journeys = [];
function test(name, fn) { journeys.push({ name, fn }); }
test.extend = (fixtures) => {
  return (name, fn) => journeys.push({ name, fn, fixture: fixtures.browserErrors[0] });
};
const source = fs.readFileSync(path.join(__dirname, '../e2e/login-copyright.spec.js'), 'utf8')
  .replace("import { test, expect } from '@playwright/test';", '');
new Function('test', 'expect', source)(test, expect);
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (let i = 0; i < journeys.length; i++) {
      const journey = journeys[i];
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4180', viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const dir = path.join(__dirname, '../test-results/container-' + i);
      fs.mkdirSync(dir, { recursive: true });
      const info = { outputPath: (name) => path.join(dir, name), attach: async (name, data) => fs.writeFileSync(path.join(dir, 'accessibility.txt'), data.body) };
      try {
        await journey.fixture({ page }, async () => journey.fn({ page }, info));
        console.log('PASS ' + journey.name);
      } finally { await context.close(); }
    }
    console.log(journeys.length + ' existing browser journeys passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
