import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
  test(`login footer and sign-in remain usable at ${viewport.width}px`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/login');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveText('© 2026-27. All rights reserved.');
    const signIn = page.getByRole('button', { name: /^sign in as/i });
    await expect(signIn).toBeVisible();
    const select = page.getByLabel('Persona');
    const option = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(option);
    await page.getByLabel('Password').fill('demo');
    await footer.scrollIntoViewIfNeeded();
    const bounds = await footer.boundingBox();
    const buttonBounds = await signIn.boundingBox();
    expect(bounds.y).toBeGreaterThan(buttonBounds.y + buttonBounds.height);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath(`login-${viewport.width}.png`), fullPage: true });
    await signIn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
