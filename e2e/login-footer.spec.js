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
    await expect(footer).toBeVisible();
    const signIn = page.getByRole('button', { name: /^sign in as/i });
    await expect(signIn).toBeVisible();
    const select = page.getByRole('combobox');
    await select.selectOption('qe_manager');
    await expect(page.getByLabel('Email (derived from persona)')).toHaveValue('robert.kim@humana.com');
    await page.getByLabel('Password').fill('demo');
    await footer.scrollIntoViewIfNeeded();
    const bounds = await footer.boundingBox();
    const buttonBounds = await signIn.boundingBox();
    expect(bounds.y).toBeGreaterThan(buttonBounds.y + buttonBounds.height);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    const controls = page.locator('form select, form input, form button, button[type="button"]');
    for (const control of await controls.all()) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      const overlap = bounds.x < box.x + box.width && bounds.x + bounds.width > box.x &&
        bounds.y < box.y + box.height && bounds.y + bounds.height > box.y;
      expect(overlap).toBe(false);
    }
    const readability = await footer.evaluate(element => {
      const style = getComputedStyle(element);
      let ancestor = element;
      let background;
      while (ancestor) {
        background = getComputedStyle(ancestor).backgroundColor;
        if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
        ancestor = ancestor.parentElement;
      }
      const luminance = color => {
        const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const foreground = luminance(style.color);
      const behind = luminance(background || 'rgb(255, 255, 255)');
      const range = document.createRange();
      range.selectNodeContents(element);
      const textRects = [...range.getClientRects()];
      return {
        fontSize: parseFloat(style.fontSize),
        contrast: (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05),
        unclipped: element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
        textUncovered: textRects.length > 0 && textRects.every(rect => {
          const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return top && (top === element || element.contains(top));
        }),
      };
    });
    expect(readability.fontSize).toBeGreaterThanOrEqual(12);
    expect(readability.contrast).toBeGreaterThanOrEqual(4.5);
    expect(readability.unclipped).toBe(true);
    expect(readability.textUncovered).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`login-${viewport.width}.png`), fullPage: true });
    await signIn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/hth$/);
    await expect(page.getByRole('button', { name: /Current persona: Robert Kim, QE Manager/i })).toBeVisible();
    const session = await page.evaluate(() => ({
      persona: JSON.parse(localStorage.getItem('eqip_selected_persona')),
      token: JSON.parse(localStorage.getItem('eqip_auth_token')),
    }));
    expect(session.persona).toBe('qe_manager');
    expect(session.token).toEqual({ token: 'eqip-mock-qe_manager', at: expect.any(Number) });
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/\/hth$/);
    await expect(page.getByRole('button', { name: /Current persona: Robert Kim, QE Manager/i })).toBeVisible();
    expect(await page.evaluate(() => ({
      persona: JSON.parse(localStorage.getItem('eqip_selected_persona')),
      token: JSON.parse(localStorage.getItem('eqip_auth_token')),
    }))).toEqual(session);
    expect(errors).toEqual([]);
  });

  test(`quick sign-in selects the clicked persona at ${viewport.width}px`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await page.getByRole('combobox').selectOption('executive_leadership');
    await page.getByRole('button', { name: /QE Manager/i }).click();
    await expect(page).toHaveURL(/\/hth$/);
    await expect(page.getByRole('button', { name: /Current persona: Robert Kim, QE Manager/i })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eqip_selected_persona')))).toBe('qe_manager');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eqip_auth_token')))).toEqual({
      token: 'eqip-mock-qe_manager', at: expect.any(Number),
    });
    expect(errors).toEqual([]);
  });
}
