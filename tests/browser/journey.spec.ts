import { test, expect, type Page } from '@playwright/test';

type JourneyCall = [string, string, Record<string, string>];

async function journeyEvents(page: Page, name: string) {
  const calls = await page.evaluate(() => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map(entry => Array.from(entry)));
  return (calls as JourneyCall[]).filter(([command, event]) => command === 'event' && event === name).map(([, , params]) => params);
}

test('opening the Atlas and choosing a project records the journey once per choice', async ({ page }) => {
  await page.goto('/explore/');
  await expect(page.locator('[data-observatory]')).toHaveAttribute('data-controller-ready', 'true');
  expect(await journeyEvents(page, 'atlas_open')).toEqual([{}]);

  const link = page.locator('[data-district-link="cnesdata"]');
  await link.click();
  await expect(link).toHaveAttribute('aria-expanded', 'true');
  const [selection] = await journeyEvents(page, 'project_select');
  expect(selection).toMatchObject({ project_id: 'cnesdata', source: 'label' });
  expect(['2d', '3d']).toContain(selection?.atlas_mode);

  await link.click();
  await expect(link).toHaveAttribute('aria-expanded', 'false');
  expect(await journeyEvents(page, 'project_select')).toHaveLength(1);
});

test('landing on a project fragment records it as the initial project', async ({ page }) => {
  await page.goto('/explore/#district-limnopulse');
  await expect(page.locator('[data-observatory]')).toHaveAttribute('data-controller-ready', 'true');
  expect(await journeyEvents(page, 'atlas_open')).toEqual([{ initial_project: 'limnopulse' }]);
  expect(await journeyEvents(page, 'project_select')).toEqual([]);
});

test('case study pages record the open and evidence clicks', async ({ page }) => {
  await page.goto('/explore/cnesdata/');
  await expect.poll(() => journeyEvents(page, 'case_study_open')).toEqual([{ project_id: 'cnesdata' }]);

  // Keep the external evidence tab closed after the capture-phase analytics listener has run.
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
  const evidence = page.locator('.evidence-link').first();
  const label = await evidence.getAttribute('data-journey-evidence');
  await evidence.click();
  expect(await journeyEvents(page, 'evidence_click')).toEqual([{ link_location: 'case_study_evidence', project_id: 'cnesdata', evidence_label: label! }]);
});

test('home contact links record email and resume clicks', async ({ page }) => {
  await page.goto('/');
  // Stop the mail client and download after the capture-phase analytics listener has run.
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));

  await page.locator('#contact a[data-journey="email_click"]').click();
  await page.locator('#contact a[data-journey="resume_click"]').click();
  await page.locator('footer a[data-journey="resume_click"]').click({ button: 'middle' });
  await page.locator('footer a[data-journey="email_click"]').click({ button: 'right' });

  expect(await journeyEvents(page, 'email_click')).toEqual([{ link_location: 'home_contact' }]);
  expect(await journeyEvents(page, 'resume_click')).toEqual([{ link_location: 'home_contact' }, { link_location: 'footer' }]);
});
