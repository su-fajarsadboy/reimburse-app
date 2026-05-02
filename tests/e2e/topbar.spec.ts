import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

test.describe('Topbar / UserMenu / breadcrumb', () => {
  test('UserMenu visible on /dashboard with email + role + logout', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');

    // Avatar button shows the user's initial; click to open menu.
    const userBtn = page.getByRole('button', { name: /admin@example\.com/i }).first();
    await userBtn.click();

    await expect(page.getByText(/login sebagai/i)).toBeVisible();
    await expect(page.getByText('admin@example.com').first()).toBeVisible();
    await expect(page.getByText(/role:/i)).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
  });

  test('logout returns to /login and clears session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /admin@example\.com/i }).first().click();
    await page.getByRole('menuitem', { name: /logout/i }).click();
    await page.waitForURL('**/login');

    // Hitting /dashboard again should bounce to /login (no session)
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
  });

  test('trip subpage shows breadcrumb back to trip detail', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'BackLinkTrip ' + Date.now() });

    await page.goto(`/dashboard/trip/${trip.tripId}/settlement`);
    const backLink = page.getByRole('link', { name: /trip ·/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL(/\/dashboard\/trip\/trip_/);
    await expect(page).not.toHaveURL(/settlement/);
  });

  test('trip detail page breadcrumb returns to /dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, { name: 'BackToDash ' + Date.now() });

    await page.goto(`/dashboard/trip/${trip.tripId}`);
    const backLink = page.getByRole('link', { name: /trip saya/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL(/\/dashboard$/);
  });
});
