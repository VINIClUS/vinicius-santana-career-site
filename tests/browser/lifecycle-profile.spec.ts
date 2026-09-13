import {test,expect} from '@playwright/test';
test('local storage profile changes service art and labels while preserving the domain',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/explore/cnesdata/#simulation');
  const root=page.locator('[data-lifecycle]');
  await expect(root.locator('[data-life-replay]')).toBeEnabled();
  await root.locator('[data-life-chapter="2"]').click();
  await root.locator('[data-life-next]').click();
  const before=await root.locator('[data-life-technical]').textContent();
  await root.locator('[data-life-profile]').selectOption('local');
  await expect(root.locator('[data-life-technical]')).toHaveText(before!);
  const images=root.locator('[data-primary-actor] img');
  for(const img of await images.all()){
    expect(await img.getAttribute('src')).not.toMatch(/aws-s3|aws-dynamodb/);
    expect(await img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await expect(root.locator('[data-life-stage]')).toHaveAttribute('data-playing','false');
});
test('Home and Atlas request no lifecycle detail resources; service icons stay same-origin',async({page})=>{
  const requests:string[]=[];
  page.on('request',request=>requests.push(request.url()));
  for(const route of ['/','/explore/']){
    requests.length=0;await page.goto(route);await page.waitForLoadState('networkidle');
    expect(requests.filter(url=>/assets\/services|Lifecycle\./.test(url))).toEqual([]);
  }
  requests.length=0;await page.goto('/explore/limnopulse/#simulation');
  await expect(page.locator('[data-life-replay]')).toBeEnabled();
  const origin=new URL(page.url()).origin;
  for(const url of requests.filter(url=>url.includes('/assets/services/')))expect(new URL(url).origin).toBe(origin);
});
