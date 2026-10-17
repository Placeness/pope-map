#!/usr/bin/env python3
"""Exercise every researched profile through the tour, plus rendered examples."""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173/')
parser.add_argument('--browser', default='/usr/bin/chromium')
parser.add_argument('--screenshots', default=str(ROOT / 'docs/qa'))
args = parser.parse_args()
data = json.loads((ROOT / 'data/popes.json').read_text())
output = Path(args.screenshots)
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':390, 'height':844}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.url, wait_until='networkidle')
    page.locator('.header-tour').click()
    for person in data['people']:
        page.locator('#tour-jump').select_option(str(person['firstOrder'] - 1))
        assert page.locator('.profile-heading h2').inner_text() == person['name']
        summary = page.locator('.profile-summary').inner_text()
        assert 'appears at position' not in summary and len(summary) > 80, person['name']
        for heading in ['His life and papacy', 'Actions and teachings', 'The world around his papacy']:
            section = page.locator('details.expandable').filter(has=page.locator('summary', has_text=heading))
            assert section.count() == 1, f'{person["name"]}: missing {heading}'
            section.locator('summary').click()
            assert len(section.inner_text()) > len(heading) + 40, person['name']
        period = next(period for period in data['pontificates'] if period['order'] == person['firstOrder'])
        if period['antipopeIds']:
            section = page.locator('details.expandable').filter(has=page.locator('summary', has_text='Rival claims and divisions'))
            section.locator('summary').click()
            for claimant_id in period['antipopeIds']:
                claimant = next(claimant for claimant in data['antipopes'] if claimant['id'] == claimant_id)
                assert section.locator('h4', has_text=claimant['name']).count() == 1, person['name']
                assert claimant['classification'] in section.inner_text(), person['name']
        recognition = person['saintStatus']
        if recognition['status'] in ['saint','blessed','venerable','servant-of-god']:
            assert page.locator('.saint-badge').inner_text() == recognition['label'], person['name']
            section = page.locator('details.expandable').filter(has=page.locator('summary', has_text='Recognition in the Church'))
            section.locator('summary').click()
            assert recognition['recognition'] in section.inner_text(), person['name']
            if recognition['status'] in ['venerable','servant-of-god']:
                assert 'Canonized:' not in section.inner_text(), person['name']
        text = page.locator('#content-panel').inner_text()
        assert not re.search(r'\[\d+\]|placeholder biography|fuller biography will|root should', text, re.I), person['name']
    assert not errors, errors
    print(f'All {len(data["people"])} unique profiles expose an introduction, biography, actions and context through the mobile tour.')
    page.close()

    examples = [('early','Alexander I'),('ancient','Honorius I'),('medieval','John XII'),('schism','Gregory XII'),('early-modern','Clement XIV'),('modern','Pius XII'),('current','Leo XIV')]
    for layout, width, height in [('desktop',1440,900),('mobile',390,844)]:
        page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce')
        page.goto(args.url, wait_until='networkidle')
        for label, name in examples:
            person = next(person for person in data['people'] if person['name'] == name)
            page.locator('.primary-nav [data-action="list"]').click()
            page.locator(f'[data-action="select-period"][data-index="{person["firstOrder"]-1}"]').click()
            page.locator('details.expandable').filter(has=page.locator('summary', has_text='His life and papacy')).locator('summary').click()
            page.screenshot(path=str(output / f'research-{label}-{layout}.png'))
            context = page.locator('details.expandable').filter(has=page.locator('summary', has_text='The world around his papacy'))
            context.locator('summary').click()
            context.scroll_into_view_if_needed()
            page.screenshot(path=str(output / f'research-{label}-context-{layout}.png'))
        eusebius = next(person for person in data['people'] if person['name'] == 'Eusebius')
        page.locator('.primary-nav [data-action="list"]').click()
        page.locator(f'[data-action="select-period"][data-index="{eusebius["firstOrder"]-1}"]').click()
        rival = page.locator('details.expandable').filter(has=page.locator('summary', has_text='Rival claims and divisions'))
        rival.locator('summary').click()
        rival.locator('.antipope-record').scroll_into_view_if_needed()
        page.screenshot(path=str(output / f'research-rival-{layout}.png'))
        page.close()
    browser.close()
