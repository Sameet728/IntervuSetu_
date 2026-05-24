# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication Flows >> Candidate Registration and Login
- Location: e2e\auth.spec.js:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="John Doe"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "InterviewAI" [ref=e5] [cursor=pointer]:
      - /url: /
      - img [ref=e7]
      - generic [ref=e10]: InterviewAI
    - generic [ref=e11]:
      - paragraph [ref=e12]: Start for free
      - heading "Your first AI interview is waiting." [level=2] [ref=e13]
      - paragraph [ref=e14]: Set up in seconds. No credit card required for your first 5 interviews.
    - list [ref=e15]:
      - listitem [ref=e16]:
        - img [ref=e17]
        - text: Voice-based AI interview
      - listitem [ref=e20]:
        - img [ref=e21]
        - text: Real-time transcription
      - listitem [ref=e24]:
        - img [ref=e25]
        - text: Instant performance report
      - listitem [ref=e28]:
        - img [ref=e29]
        - text: Resume-aware questions
  - generic [ref=e33]:
    - heading "Create your account" [level=1] [ref=e34]
    - paragraph [ref=e35]:
      - text: Already have an account?
      - link "Sign in" [ref=e36] [cursor=pointer]:
        - /url: /login
    - generic [ref=e37]:
      - generic [ref=e38]:
        - generic [ref=e39]: Full name
        - generic [ref=e40]:
          - generic:
            - img
          - textbox "Arjun Sharma" [ref=e41]
      - generic [ref=e42]:
        - generic [ref=e43]: Email address
        - generic [ref=e44]:
          - generic:
            - img
          - textbox "you@example.com" [ref=e45]
      - generic [ref=e46]:
        - generic [ref=e47]: Password
        - generic [ref=e48]:
          - generic:
            - img
          - textbox "Min. 6 characters" [ref=e49]
          - button [ref=e50] [cursor=pointer]:
            - img [ref=e51]
      - generic [ref=e54]:
        - button [ref=e55] [cursor=pointer]
        - generic [ref=e56] [cursor=pointer]: I understand that interview sessions are recorded and analyzed by AI.
      - button "Create account" [ref=e57] [cursor=pointer]:
        - text: Create account
        - img [ref=e58]
    - paragraph [ref=e60]:
      - text: Are you an organization?
      - link "Register here →" [ref=e61] [cursor=pointer]:
        - /url: /org/register
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
> 19 |     await page.fill('input[placeholder="John Doe"]', 'Playwright Tester');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
  51 |     await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  52 |   });
  53 | });
  54 | 
```