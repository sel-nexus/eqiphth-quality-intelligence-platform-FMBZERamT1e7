/** Capture representative login accessibility, styles and HTML for human review. */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '4173'}`;
const browser = await chromium.launch();
const evidence = [];
try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${baseURL}/login`);
    await page.getByRole('contentinfo').waitFor();
    if (width === 375) {
      await page.getByRole('combobox', { name: 'Persona' }).selectOption('segment_leader');
      await page.getByLabel('Password').fill('demo-review');
    }
    const accessibility = await page.accessibility.snapshot({ interestingOnly: false });
    const styles = await page.getByRole('contentinfo').evaluate((footer) => {
      const style = getComputedStyle(footer);
      return { text: footer.textContent.trim(), fontFamily: style.fontFamily, fontSize: style.fontSize,
        color: style.color, marginTop: style.marginTop, position: style.position,
        bodyFont: getComputedStyle(document.body).fontFamily,
        documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
    });
    evidence.push(`VIEW ${width}px\nACCESSIBILITY\n${JSON.stringify(accessibility, null, 2)}\nSTYLES\n${JSON.stringify(styles, null, 2)}\nERRORS\n${JSON.stringify(errors)}\nHTML\n${await page.content()}`);
    await page.screenshot({ path: `login-${width}.png`, fullPage: true });
    if (errors.length) throw new Error(`Browser errors at ${width}px: ${errors.join('; ')}`);
    await context.close();
  }
  await writeFile('login-preflight.txt', evidence.join('\n\n'), 'utf8');
  console.log('Captured desktop/mobile accessibility, styles, HTML and screenshots.');
} finally {
  await browser.close();
}
