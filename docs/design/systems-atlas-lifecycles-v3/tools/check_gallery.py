#!/usr/bin/env python3
"""Validate only the offline briefing gallery; requires Playwright and Chromium."""
from pathlib import Path
import argparse
import json
import shutil
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--chromium', default=shutil.which('chromium'))
args = parser.parse_args()
report = {'scope': 'Briefing gallery only, not the portfolio simulation', 'viewports': []}
html = (ROOT / 'references/index.html').read_text()
report['loadMethod'] = 'inline HTML; file URL navigation is disabled by the test browser policy'
with sync_playwright() as p:
    options = {'headless': True, 'args': ['--no-sandbox']}
    if args.chromium:
        options['executable_path'] = args.chromium
    browser = p.chromium.launch(**options)
    report['browser'] = 'Chromium ' + browser.version
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors, external = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: external.append(request.url) if request.url.startswith(('http:', 'https:')) else None)
        page.set_content(html, wait_until="load")
        page.wait_for_function('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)')
        for project in ['limnopulse', 'infrastructure', 'cnesdata']:
            page.locator(f'button[data-select="{project}"]').click()
            assert page.locator('section[data-project]:visible').count() == 1
            assert page.locator(f'section[data-project="{project}"]').is_visible()
            assert page.locator(f'button[data-select="{project}"]').get_attribute('aria-pressed') == 'true'
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), (width, project)
        button = page.locator('button[data-select="limnopulse"]')
        button.focus()
        page.keyboard.press('Enter')
        assert page.locator('section[data-project="limnopulse"]').is_visible()
        for href in page.locator('a').evaluate_all('(els) => els.map(a => a.getAttribute("href"))'):
            parsed = urlparse(href)
            if not parsed.scheme and parsed.path:
                assert (ROOT / 'references' / unquote(parsed.path)).resolve().exists(), href
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(ROOT / f'checks/gallery-{width}.png'), full_page=True)
        assert not errors, errors
        assert not external, external
        report['viewports'].append({'width': width, 'height': height, 'projectSwitching': 'PASS',
          'keyboardEnter': 'PASS', 'horizontalOverflow': False, 'jsErrors': errors, 'externalRequests': external})
        page.close()
    context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
    page = context.new_page()
    page.set_content(html, wait_until="load")
    assert page.locator('section[data-project]:visible').count() == 3
    assert page.locator('img').evaluate_all('(images) => images.every(i => i.complete && i.naturalWidth > 0)')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    report['noJavaScript'] = {'allThreeReferencesVisible': True, 'allEmbeddedImagesLoaded': True}
    context.close()
    context = browser.new_context(reduced_motion='reduce', viewport={'width': 390, 'height': 844})
    page = context.new_page()
    page.set_content(html, wait_until="load")
    page.locator('button[data-select="infrastructure"]').click()
    assert page.locator('section[data-project="infrastructure"]').is_visible()
    assert page.evaluate('document.getAnimations().length') == 0
    report['reducedMotion'] = {'selectionFunctional': True, 'activeAnimations': 0}
    context.close()
    browser.close()
report['result'] = 'PASS'
(ROOT / 'checks/browser-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
