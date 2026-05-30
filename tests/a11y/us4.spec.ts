import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// US4 a11y: FAQ + About meet WCAG 2.1 A/AA.
for (const path of ['/faq', '/about']) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
