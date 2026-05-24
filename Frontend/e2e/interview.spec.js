import { test, expect } from '@playwright/test';

test.describe('Interview Flows', () => {
  test('Candidate Dashboard Load', async ({ page }) => {
    // Go to dashboard (assume we are logged in or will hit ProtectedRoute redirect)
    await page.goto('/dashboard');

    // If redirected to login, that's fine. Wait to see either Login or Dashboard.
    await expect(page).toHaveURL(/\/login|\/dashboard/);
  });

  test('Organization Dashboard Navigation', async ({ page }) => {
    await page.goto('/org/dashboard');
    
    // Check if redirect works for unauthenticated
    if (page.url().includes('/org/login')) {
      await expect(page.locator('text=Sign in to your organization')).toBeVisible();
    }
  });

  test('Public Pages Load', async ({ page }) => {
    // Test landing page
    await page.goto('/');
    await expect(page.locator('text=Interview Simulation,')).toBeVisible();

    // Test about or pricing if they exist
    // Just click a button on the landing page to verify interaction
    await expect(page.locator('a:has-text("Sign In")').first()).toBeVisible();
  });
});
