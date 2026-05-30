import { test, expect } from '@playwright/test';

// US2: choose MP3 and see the metadata that will be embedded (FR-007/FR-008).
test('MP3 selection reveals metadata confirmation and downloads', async ({ page }) => {
  await page.goto('/download?url=' + encodeURIComponent('https://youtu.be/abc12345'));
  await expect(page.locator('#formats')).toBeVisible();

  await page.locator('input[name="format"][value="mp3"]').check();

  // Metadata panel appears; quality row hidden.
  await expect(page.locator('#mp3-meta')).toBeVisible();
  await expect(page.locator('#quality-row')).toBeHidden();
  await expect(page.locator('#meta-title')).not.toHaveText('—');
  await expect(page.locator('#meta-author')).not.toHaveText('—');

  await page.locator('#start-btn').click();
  await expect(page.locator('#progress-label')).toHaveText('Ready!', { timeout: 15_000 });
});
