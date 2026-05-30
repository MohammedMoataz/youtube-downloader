import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// US1 a11y: landing + download pages meet WCAG 2.1 A/AA (constitution Principle II, SC-008).
test('landing page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('download page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/download?url=' + encodeURIComponent('https://youtu.be/abc12345'));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
