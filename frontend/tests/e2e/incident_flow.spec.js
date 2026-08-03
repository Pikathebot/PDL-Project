import { test, expect } from '@playwright/test';

test.describe('Citizen Incident Reporting E2E Flow', () => {
  test('navigates to citizen portal, submits a hazard report, and receives tracking ID', async ({ page }) => {
    // 1. Open the homepage
    await page.goto('/');

    // 2. Verify header title exists
    await expect(page.locator('header')).toContainText(/SENTINEL/i);

    // 3. Fill out the citizen incident report form using exact placeholder text
    await page.fill('textarea[placeholder*="Describe what happened"]', 'E2E Test: Heavy water leakage near sub-station.');
    await page.fill('input[placeholder*="98765"]', '+919876543210');

    // Select category button
    const electricalBtn = page.getByRole('button', { name: /Electrical Hazard/i });
    if (await electricalBtn.count() > 0) {
      await electricalBtn.click();
    }

    // 4. Mock API route for report submission
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

    // 5. Click Submit Emergency Report button
    const submitBtn = page.getByRole('button', { name: /Submit Emergency Report/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 6. Verify confirmation displays tracking ID
    await expect(page.locator('body')).toContainText(/INC-E2ETEST99/i);
  });
});
