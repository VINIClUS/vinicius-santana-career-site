import { test,expect } from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const captures=fileURLToPath(new URL('../../docs/design/lifecycle-reports/captures/',import.meta.url));
for(const size of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]){
  test(`all five stages remain readable at ${size.width}px`,async({page})=>{
    await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});
    await mkdir(captures,{recursive:true});
    for(const [project,cycle,chapter] of [
      ['infrastructure','infra-exhaustion-recovery',3],['infrastructure','infra-quorum-recovery',4],
      ['infrastructure','infra-provision-scale',2],['limnopulse','limnopulse-end-to-end',2],['cnesdata','cnesdata-end-to-end',4],
    ] as const){
      await page.goto(`/explore/${project}/#technical`);await expect(page.locator('[data-life-replay]')).toBeEnabled();
      await page.locator('[data-life-scenario]').selectOption(cycle);
      await expect(page.locator('[data-life-progress]')).toContainText('operation 1 /');
      await page.locator(`[data-life-chapter="${chapter}"]`).click();await page.locator('[data-life-next]').click();
      await page.locator('[data-lifecycle]').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-90,behavior:'instant'}));
      const labels=await page.locator('[data-primary-actor] strong').evaluateAll(elements=>elements.map(el=>{
        const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,font:parseFloat(getComputedStyle(el).fontSize)};
      }));
      for(let i=0;i<labels.length;i++){
        const a=labels[i];expect(a.font).toBeGreaterThanOrEqual(size.width>600?16:14);
        expect(a.left).toBeGreaterThanOrEqual(0);expect(a.right).toBeLessThanOrEqual(size.width);
        for(const b of labels.slice(i+1))expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`${captures}/${cycle}-${size.width}.png`});
    }
  });
}
