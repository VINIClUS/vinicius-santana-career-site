import type { Page } from '@playwright/test';

/** Enter the native disclosures before exercising the retained technical views. */
export async function openTechnicalDetails(page: Page) {
  for (const details of await page.locator('[data-component-disclosure]').all()) {
    if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
  }
}
