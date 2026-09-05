import { test, expect } from '@playwright/test';

test.describe('Citizen Incident Reporting E2E Flow', () => {
  test('submits a hazard report with a real location and receives a tracking ID', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('header')).toContainText(/SENTINEL/i);

    await page.fill('textarea[placeholder*="Describe what happened"]', 'E2E Test: Heavy water leakage near sub-station.');
    await page.fill('input[placeholder*="98765"]', '+919876543210');

    // The category button must exist - a silent no-op here used to let a broken
    // selector pass the test.
    const electricalBtn = page.getByRole('button', { name: /Electrical Hazard/i });
    await expect(electricalBtn).toBeVisible();
    await electricalBtn.click();

    // Location is no longer pre-filled, so the reporter has to supply it. This
    // is the behaviour under test: a report must carry a location someone
    // actually entered.
    const latInput = page.locator('input[type="number"]').first();
    const lngInput = page.locator('input[type="number"]').nth(1);
    await latInput.fill('19.0760');
    await lngInput.fill('72.8777');

    // Capture what the client actually sends, not just what the server replies.
    let postBody = null;
    await page.route('**/api/v1/incidents/', async (route) => {
      if (route.request().method() === 'POST') {
        postBody = route.request().postData();
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
            media_attachments: [],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const submitBtn = page.getByRole('button', { name: /Submit Emergency Report/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await expect(page.locator('body')).toContainText(/INC-E2ETEST99/i);

    // Without these, dropping any field from the FormData would still pass.
    expect(postBody).toBeTruthy();
    expect(postBody).toContain('E2E Test: Heavy water leakage near sub-station.');
    expect(postBody).toContain('electrical_hazard');
    expect(postBody).toContain('19.076');
    expect(postBody).toContain('72.8777');
    expect(postBody).toContain('+919876543210');
  });

  test('blocks submission when no location has been provided', async ({ page }) => {
    await page.goto('/');
    await page.fill('textarea[placeholder*="Describe what happened"]', 'Report with no location set.');

    let posted = false;
    await page.route('**/api/v1/incidents/', async (route) => {
      posted = true;
      await route.abort();
    });

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Submit Emergency Report/i }).click();

    await page.waitForTimeout(500);
    expect(posted).toBe(false);
  });
});
