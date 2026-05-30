import { test, expect } from '@playwright/test';

// US3: playlist link -> list + count -> download all -> per-item progress -> ZIP.
test('playlist resolves with a list and downloads as a batch', async ({ page }) => {
  await page.goto('/download?url=' + encodeURIComponent('https://www.youtube.com/playlist?list=PLmock12345'));

  await expect(page.locator('#playlist')).toBeVisible();
  await expect(page.locator('#playlist-count')).not.toHaveText('0');
  await expect(page.locator('#playlist-items li')).not.toHaveCount(0);

  await page.locator('#start-btn').click();

  // Per-item rows render for a batch (FR-011/FR-012) and the batch completes.
  await expect(page.locator('#job-items .job-item')).not.toHaveCount(0);
  await expect(page.locator('#progress-label')).toHaveText('Ready!', { timeout: 20_000 });
});
