# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication Flows >> Organization Login Validation
- Location: e2e\auth.spec.js:41:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Invalid credentials')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Invalid credentials')

```

```yaml
- link "InterviewAI For Organizations":
  - /url: /
  - img
  - text: InterviewAI For Organizations
- heading "Hire smarter, interview better." [level=2]
- paragraph: Automate your hiring pipeline with AI-driven technical and behavioral interviews.
- paragraph: 100+
- paragraph: Companies hiring
- paragraph: 50k+
- paragraph: Interviews conducted
- paragraph: 24/7
- paragraph: Proctoring
- heading "Sign in to your organization" [level=1]
- paragraph:
  - text: New organization?
  - link "Register here":
    - /url: /org/register
- text: Organization email
- img
- textbox "hr@company.com"
- text: Password
- img
- textbox "••••••••"
- link "Forgot password?":
  - /url: /org/forgot-password
- button "Sign in":
  - text: Sign in
  - img
- paragraph:
  - text: Are you a candidate?
  - link "Sign in here →":
    - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flows', () => {
  4  |   test('Candidate Registration and Login', async ({ page }) => {
  5  |     // Navigate to homepage
  6  |     await page.goto('/');
  7  |     await expect(page).toHaveTitle(/InterviewAI/i);
  8  | 
  9  |     // Go to registration page
  10 |     await page.click('text=Get Started'); // Or navigate directly if the button is different
  11 |     
  12 |     // We navigate directly to /register to be safe
  13 |     await page.goto('/register');
  14 |     await expect(page.locator('text=Create Account')).toBeVisible();
  15 | 
  16 |     // Fill registration form with a unique email
  17 |     const uniqueEmail = `testuser_${Date.now()}@example.com`;
  18 |     
  19 |     await page.fill('input[placeholder="John Doe"]', 'Playwright Tester');
  20 |     await page.fill('input[type="email"]', uniqueEmail);
  21 |     await page.fill('input[type="password"]', 'password123');
  22 | 
  23 |     // Click register
  24 |     await page.click('button:has-text("Create Account")');
  25 | 
  26 |     // Wait for redirect to login or dashboard
  27 |     await expect(page).toHaveURL(/\/login|\/dashboard/);
  28 | 
  29 |     // If redirected to login, login
  30 |     if (page.url().includes('/login')) {
  31 |       await page.fill('input[type="email"]', uniqueEmail);
  32 |       await page.fill('input[type="password"]', 'password123');
  33 |       await page.click('button:has-text("Sign In")');
  34 |       await expect(page).toHaveURL(/\/dashboard/);
  35 |     }
  36 | 
  37 |     // Verify dashboard loaded
  38 |     await expect(page.locator('text=Playwright Tester').first()).toBeVisible({ timeout: 10000 });
  39 |   });
  40 | 
  41 |   test('Organization Login Validation', async ({ page }) => {
  42 |     await page.goto('/org/login');
  43 |     await expect(page.locator('text=Sign in to your organization')).toBeVisible();
  44 | 
  45 |     // Attempt invalid login
  46 |     await page.fill('input[type="email"]', 'invalidorg@example.com');
  47 |     await page.fill('input[type="password"]', 'wrongpassword');
  48 |     await page.click('button:has-text("Sign In")');
  49 | 
  50 |     // Expect an error toast or message
> 51 |     await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  52 |   });
  53 | });
  54 | 
```