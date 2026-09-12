import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import yaml from 'js-yaml';
import { chromium } from '@playwright/test';

const run = promisify(execFile);
const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const astroBin = path.join(rootPath, 'node_modules', 'astro', 'bin', 'astro.mjs');
const caseStudies = yaml.load(await readFile(new URL('../src/content/case-studies.yaml', import.meta.url), 'utf8'));
const cnesData = caseStudies.find(caseStudy => caseStudy.id === 'cnesdata');

async function startStaticServer(directory) {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const relativePath = pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '')}${pathname.endsWith('/') ? 'index.html' : ''}`;
    try {
      response.end(await readFile(path.join(directory, relativePath)));
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

const fixturePage = path.join(rootPath, 'src', 'pages', 'system-view-test-fixture.astro');
const outputDirectory = await mkdtemp(path.join(rootPath, '.system-view-renderer-'));
const fixtureRoute = '/system-view-test-fixture/';

try {
  await writeFile(fixturePage, `---
import SystemView from '../features/explorer/SystemView.astro';
import { projectDefinitions } from '../features/explorer/projects.ts';
const caseStudy = ${JSON.stringify(cnesData)};
---
<SystemView {caseStudy} definition={projectDefinitions.cnesdata} />
`);
  await run(process.execPath, [astroBin, 'build', '--root', rootPath, '--outDir', outputDirectory], { cwd: rootPath });

  const html = await readFile(path.join(outputDirectory, fixtureRoute, 'index.html'), 'utf8');
  const connectorCount = (html.match(/data-graph-connector/g) || []).length;
  assert.equal(connectorCount, 7, 'every CnesData relation renders one directional connector');
  assert.equal((html.match(/data-graph-edge-label/g) || []).length, connectorCount, 'every connector has a short text label');

  const { server, origin } = await startStaticServer(outputDirectory);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${origin}${fixtureRoute}`);
    await page.waitForSelector('[data-system-view][data-enhanced="true"]');
    assert.equal(await page.url(), `${origin}${fixtureRoute}`, 'initial selection does not add a fragment');
    assert.equal(await page.locator('[data-component-link="central-api"]').first().getAttribute('aria-current'), 'true', 'primary component is initially current');
    assert.equal(await page.locator('[data-component-detail="central-api"]').getAttribute('data-selected'), 'true', 'primary detail is selected');

    await page.goto(`${origin}${fixtureRoute}#component-edge-agent`);
    await page.waitForSelector('[data-component-link="edge-agent"][aria-current="true"]');
    assert.equal(await page.locator('[data-component-detail="edge-agent"]').getAttribute('data-selected'), 'true', 'valid fragment selects its detail');

    await page.goto(`${origin}${fixtureRoute}`);
    await page.waitForSelector('[data-component-link="central-api"][aria-current="true"]');
    await page.locator('[data-system-graph] [data-component-link="canonical-contracts"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForURL(/#component-edge-agent$/);
    assert.equal(await page.locator('[data-component-link="edge-agent"]').first().getAttribute('aria-current'), 'true', 'keyboard selection updates aria-current');
    await page.goBack();
    await page.waitForURL(new RegExp(`${fixtureRoute}$`));
    assert.equal(await page.locator('[data-component-detail="central-api"]').getAttribute('data-selected'), 'true', 'Back synchronizes selected detail');
    await page.goForward();
    await page.waitForURL(/#component-edge-agent$/);
    assert.equal(await page.locator('[data-component-link="edge-agent"]').first().getAttribute('aria-current'), 'true', 'Forward synchronizes aria-current');

    const noJavaScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const noJavaScriptPage = await noJavaScriptContext.newPage();
    await noJavaScriptPage.goto(`${origin}${fixtureRoute}`);
    assert.equal(await noJavaScriptPage.locator('[data-component-detail]').count(), cnesData.architecture.length, 'no-JavaScript document includes every detail');
    for (const component of cnesData.architecture) {
      assert.equal(await noJavaScriptPage.locator(`#component-${component.id}`).isVisible(), true, `${component.id} remains readable without JavaScript`);
      const detailText = await noJavaScriptPage.locator(`#component-${component.id}`).textContent();
      assert.doesNotMatch(detailText, new RegExp(component.status, 'i'), `${component.id} does not repeat status without JavaScript`);
      assert.ok(detailText.includes(component.title), `${component.id} retains its title without JavaScript`);
      assert.ok(detailText.includes(component.description), `${component.id} retains its description without JavaScript`);
      assert.equal(await noJavaScriptPage.locator(`#component-${component.id} a`).count(), 0, `${component.id} card contains no links`);
    }
    await noJavaScriptContext.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
} finally {
  await rm(fixturePage, { force: true });
  await rm(outputDirectory, { recursive: true, force: true });
}
