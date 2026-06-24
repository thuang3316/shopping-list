import { test, expect } from '@playwright/test';

// Regression guard for the bug where the nav's Browse/Requests links were
// `hidden sm:flex` with no mobile fallback, leaving the Requests page
// unreachable on phones. Only the E2E layer (real viewport) can catch this.
test('mobile users can reach the Requests page via the hamburger menu', async ({ page }) => {
  await page.goto('/');

  // The inline links are display:none at mobile width, so they're not in the
  // accessibility tree; the menu button is the only way in.
  const menuButton = page.getByRole('button', { name: 'Menu' });
  await expect(menuButton).toBeVisible();

  await menuButton.click();
  await page.getByRole('link', { name: 'Requests' }).click();

  await expect(page).toHaveURL(/\/requests$/);
});
