import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Candidate Registration and Login', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/IntervuSetu/i);

    // Go to registration page
    await page.click('text=Get Started'); // Or navigate directly if the button is different
    
    // We navigate directly to /register to be safe
    await page.goto('/register');
    await expect(page.locator('text=Create Account')).toBeVisible();

    // Fill registration form with a unique email
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    
    await page.fill('input[placeholder="John Doe"]', 'Playwright Tester');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'password123');

    // Click register
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to login or dashboard
    await expect(page).toHaveURL(/\/login|\/dashboard/);

    // If redirected to login, login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Sign In")');
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // Verify dashboard loaded
    await expect(page.locator('text=Playwright Tester').first()).toBeVisible({ timeout: 10000 });
  });

  test('Organization Login Validation', async ({ page }) => {
    await page.goto('/org/login');
    await expect(page.locator('text=Sign in to your organization')).toBeVisible();

    // Attempt invalid login
    await page.fill('input[type="email"]', 'invalidorg@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Expect an error toast or message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });
});
