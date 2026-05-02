import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin } from './helpers';

test.describe('auth / login', () => {
  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nope@example.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type=submit]');
    await expect(
      page.getByText(/email atau password salah/i),
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('valid credentials redirect to /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    const pw = page.locator('#password');
    await pw.fill('hello');
    await expect(pw).toHaveAttribute('type', 'password');
    // Click the eye icon next to the password input
    await page.locator('#password').locator('..').locator('button').click();
    await expect(pw).toHaveAttribute('type', 'text');
  });

  test('protected route redirects unauthenticated user to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login|api\/auth)/, { timeout: 8000 });
  });
});

test.describe('auth / session', () => {
  test('reusing session lets dashboard load directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /trip saya/i })).toBeVisible();
  });
});
