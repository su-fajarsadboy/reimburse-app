import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTripViaApi } from './helpers';

test.describe('peserta share-token pages', () => {
  test('invalid share token returns 404 / not-found UI', async ({ page }) => {
    const r = await page.goto('/trip/totally-not-a-real-token');
    expect(r?.status()).toBe(404);
  });

  test('valid share token shows participant entry screen', async ({ page }) => {
    await loginAsAdmin(page);
    const trip = await createTripViaApi(page, {
      name: 'PesertaTest ' + Date.now(),
      participants: ['Carol', 'Dewa', 'Erin'],
    });

    // Open peserta page in clean context (no admin cookie)
    const fresh = await page.context().browser()!.newContext();
    const newPage = await fresh.newPage();
    await newPage.goto(`/trip/${trip.shareToken}`);
    await expect(newPage.getByText('Carol')).toBeVisible({ timeout: 10_000 });
    await expect(newPage.getByText('Dewa')).toBeVisible();
    await expect(newPage.getByText('Erin')).toBeVisible();
    await fresh.close();
  });
});
