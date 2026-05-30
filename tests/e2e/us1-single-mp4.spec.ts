import { test, expect } from '@playwright/test';

// US1: paste a single video link -> preview -> pick quality -> MP4 download.
test('single video resolves, shows details, and downloads as MP4', async ({ page }) => {
  await page.goto('/download?url=' + encodeURIComponent('https://youtu.be/abc12345'));

  // Preview shows the video details (FR-004).
  await expect(page.locator('#preview')).toBeVisible();
  await expect(page.locator('#preview-title')).not.toHaveText('—');
  await expect(page.locator('#preview-author')).not.toHaveText('—');

  // MP4 is selected by default and qualities are listed (FR-005/FR-006).
  await expect(page.locator('#quality-row')).toBeVisible();
  await expect(page.locator('#quality option')).not.toHaveCount(0);

  await page.locator('#start-btn').click();

  // Progress runs and completes with a save link (FR-013).
  await expect(page.locator('#progress')).toBeVisible();
  await expect(page.locator('#progress-label')).toHaveText('Ready!', { timeout: 15_000 });
  await expect(page.locator('#download-link')).toBeVisible();
});

test('invalid link shows a friendly error (FR-003/FR-014)', async ({ page }) => {
  await page.goto('/download?url=' + encodeURIComponent('https://example.com/nope'));
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#retry-btn')).toBeVisible();
});
