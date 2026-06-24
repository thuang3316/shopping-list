import { test, expect } from '@playwright/test';

// Sanity check that the desktop nav is unchanged: links are inline (no menu
// button) and navigate.
test('desktop shows Browse/Requests inline and navigates', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  await page.getByRole('link', { name: 'Requests' }).click();

  await expect(page).toHaveURL(/\/requests$/);
});
