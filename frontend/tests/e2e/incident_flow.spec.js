import { test, expect } from '@playwright/test';

test.describe('Citizen Incident Reporting E2E Flow', () => {
  test('navigates to citizen portal, submits a hazard report, and receives tracking ID', async ({ page }) => {
    // 1. Open the homepage
    await page.goto('/');

    // 2. Verify navigation branding header is visible
    await expect(page.locator('header')).toContainText(/SENTINEL/i);

    // 3. Fill out the citizen incident report form
    await page.fill('textarea[placeholder*="Describe what you see"]', 'E2E Test: Heavy water leakage near sub-station.');
    await page.fill('input[placeholder*="phone"]', '+919876543210');

    // Select category dropdown if present
    const categorySelect = page.locator('select');
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption('electrical_hazard');
    }

    // 4. Click Submit Incident Report button
    const submitBtn = page.getByRole('button', { name: /Submit Incident Report/i });
    await expect(submitBtn).toBeVisible();

    // Mock API response if backend is offline, or allow mock fallback
    await page.route('**/api/v1/incidents/', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            tracking_id: 'INC-E2ETEST99',
            category: 'electrical_hazard',
            description: 'E2E Test: Heavy water leakage near sub-station.',
            phone_number: '+919876543210',
            latitude: 19.076,
            longitude: 72.8777,
            status: 'reported',
            severity: 3,
            priority_score: 50,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await submitBtn.click();

    // 5. Verify success modal/confirmation displays tracking ID
    await expect(page.locator('body')).toContainText(/INC-E2ETEST99/i);
  });
});
