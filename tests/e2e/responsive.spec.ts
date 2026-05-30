import { test, expect } from '@playwright/test';

// T049 (analysis C1): the core experience is usable on mobile and desktop widths (FR-018/SC-009).
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const vp of viewports) {
  test(`landing input and nav are usable at ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    const input = page.locator('#yt-url');
    await expect(input).toBeVisible();
    await input.fill('https://youtu.be/abc12345');
    await expect(page.getByRole('button', { name: /get it/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'FAQ' }).first()).toBeVisible();
  });
}
