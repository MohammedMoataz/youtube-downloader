import { test, expect } from '@playwright/test';

// US4: navigation across all 4 pages, and no-JS rendering of informational pages.
test('navigation reaches all four pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();

  await page.getByRole('link', { name: 'Download' }).first().click();
  await expect(page).toHaveURL(/\/download/);

  await page.getByRole('link', { name: 'FAQ' }).first().click();
  await expect(page).toHaveURL(/\/faq/);
  await expect(page.getByRole('heading', { name: /frequently asked questions/i })).toBeVisible();

  await page.getByRole('link', { name: 'About' }).first().click();
  await expect(page).toHaveURL(/\/about/);
});

test('FAQ and About render with JavaScript disabled (progressive enhancement)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/faq');
  await expect(page.getByRole('heading', { name: /frequently asked questions/i })).toBeVisible();

  await page.goto('/about');
  await expect(page.getByRole('heading', { name: /about grabtube/i })).toBeVisible();

  await page.goto('/download');
  // The no-JS notice is visible; the interactive app stays hidden.
  await expect(page.locator('#needs-js')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();

  await context.close();
});
