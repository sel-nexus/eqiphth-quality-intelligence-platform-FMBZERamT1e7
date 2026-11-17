/** Exercise the unchanged demo authentication and notice in a real browser. */
import { test, expect } from '@playwright/test';

const NOTICE = '© 2026-27 all rights reserved';
const FOCUSABLES = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

// The automatic fixture attaches error listeners before each test can navigate.
const browserTest = test.extend({
  browserErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
    expect(errors, 'Every journey must finish without console or page errors').toEqual([]);
  }, { auto: true }],
});

/** Read the application's actual browser-local session without seeding or mocking it. */
async function readSession(page) {
  return page.evaluate(() => ({
    persona: JSON.parse(localStorage.getItem('eqip_selected_persona')),
    session: JSON.parse(localStorage.getItem('eqip_auth_token')),
  }));
}

/** Check exact accessible copy and native noninteractive footer semantics. */
async function expectNotice(page) {
  const footer = page.getByRole('contentinfo');
  await expect(footer).toHaveCount(1);
  await expect(footer).toBeVisible();
  await expect(page.getByText(NOTICE, { exact: true })).toHaveCount(1);
  await expect(footer).toHaveText(NOTICE);
  expect(await footer.evaluate((element) => element.tagName)).toBe('FOOTER');
  expect(await footer.evaluate((element, selector) => element.matches(selector), FOCUSABLES)).toBe(false);
  await expect(footer.locator(FOCUSABLES)).toHaveCount(0);
  await expect(footer).not.toHaveAttribute('aria-hidden', 'true');
}

for (const width of [320, 375, 768, 1440]) {
  browserTest(`unauthenticated protected entry preserves the notice on reload at ${width}px without overlap`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
    expect((await readSession(page)).session).toBeNull();
    await expectNotice(page);
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expectNotice(page);
    expect((await readSession(page)).session).toBeNull();
    const geometry = await page.getByRole('contentinfo').evaluate((footer) => {
      const box = footer.getBoundingClientRect();
      const hint = footer.previousElementSibling.getBoundingClientRect();
      const form = footer.parentElement.querySelector('form').getBoundingClientRect();
      const quick = footer.previousElementSibling.previousElementSibling.getBoundingClientRect();
      const style = getComputedStyle(footer);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return {
        left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        hintBottom: hint.bottom, formBottom: form.bottom, quickBottom: quick.bottom,
        position: style.position, marginTop: parseFloat(style.marginTop),
        fontSize: parseFloat(style.fontSize), color: style.color, rem,
        viewport: window.innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        documentHeight: document.documentElement.scrollHeight,
      };
    });
    expect(geometry.position).toBe('static');
    expect(geometry.marginTop).toBeCloseTo(1.5 * geometry.rem);
    expect(geometry.fontSize).toBeCloseTo(0.75 * geometry.rem);
    expect(geometry.color).toBe('rgb(71, 85, 105)');
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.top - geometry.hintBottom).toBeGreaterThanOrEqual(1.5 * geometry.rem - 0.5);
    expect(geometry.top).toBeGreaterThan(geometry.formBottom);
    expect(geometry.top).toBeGreaterThan(geometry.quickBottom);
    expect(geometry.bottom + await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(geometry.documentHeight);
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect(page.getByRole('contentinfo')).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true });
    await testInfo.attach('Login accessibility tree', { body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain' });
  });
}

browserTest('keyboard form submission returns to the protected profile and survives reload with its actual session', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  expect((await readSession(page)).session).toBeNull();
  await expectNotice(page);
  const persona = page.getByRole('combobox', { name: 'Persona' });
  await page.keyboard.press('Tab');
  await expect(persona).toBeFocused();
  await persona.selectOption('segment_leader');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Email (derived from persona)' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Email (derived from persona)' })).toHaveValue('michael.torres@humana.com');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.type('any-demo-password');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Michael Torres', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(NOTICE, { exact: true })).toHaveCount(0);
  const beforeReload = await readSession(page);
  expect(beforeReload).toEqual({ persona: 'segment_leader', session: { token: 'eqip-mock-segment_leader', at: expect.any(Number) } });
  await page.reload();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Michael Torres', { exact: true }).first()).toBeVisible();
  expect(await readSession(page)).toEqual(beforeReload);
  await expect(page.getByText(NOTICE, { exact: true })).toHaveCount(0);
});

browserTest('quick sign-in needs no password and returns to the protected route with a persistent session', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  expect((await readSession(page)).session).toBeNull();
  await expectNotice(page);
  await expect(page.getByLabel('Password')).toHaveValue('');
  await page.getByRole('button', { name: 'Sarah Chen Executive Leadership', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Sarah Chen', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(NOTICE, { exact: true })).toHaveCount(0);
  const beforeReload = await readSession(page);
  expect(beforeReload).toEqual({ persona: 'executive_leadership', session: { token: 'eqip-mock-executive_leadership', at: expect.any(Number) } });
  await page.reload();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Sarah Chen', { exact: true }).first()).toBeVisible();
  expect(await readSession(page)).toEqual(beforeReload);
  await expect(page.getByText(NOTICE, { exact: true })).toHaveCount(0);
});
