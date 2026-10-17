#!/usr/bin/env python3
"""Optional browser regression check (requires Python Playwright and Chromium)."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4173/")
parser.add_argument("--browser", default="/usr/bin/chromium")
parser.add_argument("--screenshots", default=str(ROOT / "docs/qa"))
args = parser.parse_args()
output = Path(args.screenshots)
output.mkdir(parents=True, exist_ok=True)


def review_landing(page, width):
    markers = page.locator('.pope-map-marker:visible')
    assert markers.count() >= 4, 'The opening map must expose several distinct local groups'
    details = markers.evaluate_all('''buttons => buttons.map(button => {
        const box = button.getBoundingClientRect(), group = button.mapGroup;
        return {label: button.getAttribute('aria-label'), kind: group.kind,
            longitudes: group.members.map(place => place.point[0]),
            topmost: button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
            width: box.width, height: box.height, x: box.x, y: box.y,
            sharedRome: group.kind === 'shared' && group.label === 'Rome',
            captionVisible: !button.querySelector('.pope-map-place-caption').hidden};
    })''')
    assert all(item['topmost'] for item in details), 'Every exposed marker must be selectable at its center'
    assert all(item['width'] >= 44 and item['height'] >= 44 for item in details)
    assert any(item['sharedRome'] and item['captionVisible'] for item in details), 'Rome needs a visible, named birthplace marker in the opening view'
    for index, first in enumerate(details):
        for second in details[index + 1:]:
            overlap_x = min(first['x'] + first['width'], second['x'] + second['width']) - max(first['x'], second['x'])
            overlap_y = min(first['y'] + first['height'], second['y'] + second['height']) - max(first['y'], second['y'])
            assert overlap_x < .1 or overlap_y < .1, f"Overlapping touch targets: {first['label']} / {second['label']}"
    assert all(max(item['longitudes']) - min(item['longitudes']) <= 4.001 for item in details), 'A local group must not swallow a whole country'
    assert page.locator('.pope-map-era-art:visible').count() >= 4, 'Birthplaces must use the illustrated pins'
    if width <= 760:
        assert page.locator('#welcome-card').bounding_box()['height'] <= 112
        north = page.locator('.pope-map-geography').evaluate('''svg => {
            const y = Number(svg.getAttribute('viewBox').split(/\\s+/)[1]);
            return (2 * Math.atan(Math.exp(-y * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;
        }''')
        assert north <= 58.1, f'The portrait opening view extends too far north: {north}'
    for person, name in [('pope-francis', 'Francis'), ('pope-leo-xiv', 'Leo XIV')]:
        action = page.locator(f'.americas-card [data-person="{person}"]')
        assert action.is_visible(), f'{name} needs direct access from the opening map'
        assert action.bounding_box()['height'] >= 44
        action.click()
        assert page.locator('.profile-heading h2').inner_text() == name
        page.locator('[data-action="close-panel"]').click()
        page.locator('[data-action="reset-map"]').click()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.browser, headless=True, args=["--no-sandbox"])
    for name, width, height in [("desktop", 1440, 900), ("mobile", 390, 844), ("small-mobile", 320, 568)]:
        page = browser.new_page(viewport={"width": width, "height": height}, reduced_motion="reduce")
        errors, remote_requests, requests = [], [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.on("request", lambda request: remote_requests.append(request.url) if request.url.startswith("https://") else None)
        page.goto(args.url, wait_until="networkidle")
        page.locator(".pope-map-marker").first.wait_for(state="attached")
        page.screenshot(path=str(output / f"preview-{name}.png"))
        review_landing(page, width)
        page.locator('[data-action="world-map"]').click()
        page.locator('.pope-map-inset').wait_for(state="visible")
        page.screenshot(path=str(output / f"preview-world-{name}.png"))
        page.locator('.pope-map-inset-place[aria-label^="Leo XIV,"]').click()
        assert page.locator('.profile-heading h2').inner_text() == 'Leo XIV'
        page.locator('[data-action="close-panel"]').click()
        page.locator('[data-action="world-map"]').click()
        page.locator('.pope-map-inset-place[aria-label^="Francis,"]').click()
        assert page.locator('.profile-heading h2').inner_text() == 'Francis'
        page.locator('[data-action="close-panel"]').click()
        page.locator('[data-action="reset-map"]').click()
        page.locator('.primary-nav [data-action="list"]').click()
        assert page.locator(".pope-row").count() == 267
        assert not any('approximate' in label or 'broad origin' in label for label in page.locator('.pope-row-place').all_inner_texts())
        # A closer Mediterranean opening must retain access to northern birthplaces.
        page.locator('[data-action="select-period"][data-index="168"]').click()
        assert page.locator('.profile-heading h2').inner_text() == 'Adrian IV'
        page.locator('[data-action="close-panel"]').click()
        assert page.locator('.pope-map-marker.is-selected:visible').count() == 1
        page.locator('.primary-nav [data-action="list"]').click()
        page.locator('[data-action="select-period"][data-index="144"]').click()
        assert page.locator(".profile-heading h2").inner_text() == "Benedict IX"
        assert page.locator(".period-button").count() == 3
        page.locator('[data-action="select-period"][data-index="149"]').click()
        assert "150" in page.locator(".period-button.is-active").inner_text()
        page.locator(".header-tour").click()
        assert page.locator("#tour-counter").inner_text().startswith("1 of 267")
        assert page.locator(".timeline-stop").count() == 267
        page.locator('[data-action="tour-next"]').click()
        assert page.locator(".profile-heading h2").inner_text() == "Linus"
        page.locator('[data-action="exit-tour"]').click()
        page.locator(".header-tour").click()
        assert page.locator("#tour-counter").inner_text().startswith("2 of 267")
        page.locator('[data-action="exit-tour"]').click()
        page.locator('#selection-card [data-action="restart-tour"]').click()
        assert page.locator(".profile-heading h2").inner_text() == "Peter"
        page.screenshot(path=str(output / f"preview-tour-{name}.png"))
        if width <= 760:
            page.locator("#tour-jump").select_option("266")
        else:
            page.locator('.timeline-stop[data-index="266"]').click()
        assert page.locator(".profile-heading h2").inner_text() == "Leo XIV"
        assert page.locator('[data-action="tour-next"]').is_disabled()
        assert "Present" in page.locator(".profile-dates").inner_text()
        page.locator('[data-action="resources"]').click()
        assert page.locator("#resources-dialog").is_visible()
        assert page.locator("#resource-links a").count() == 3
        page.keyboard.press("Escape")
        assert not page.locator("#resources-dialog").is_visible()
        assert not errors, errors
        assert not remote_requests, remote_requests
        print(f"{name}: local illustrated groups, Mediterranean framing, both Americas, northern birthplace, roster/tour/resources; no JavaScript errors or remote requests")
        page.close()
    if any(url.endswith("/src/map.js") for url in requests):
        page = browser.new_page()
        page.route("**/src/map.js", lambda route: route.abort())
        page.goto(args.url, wait_until="networkidle")
        assert page.locator(".map-fallback").is_visible()
        page.locator('.map-fallback [data-action="list"]').click()
        assert page.locator(".pope-row").count() == 267
        page.locator(".header-tour").click()
        assert page.locator("#tour-counter").inner_text().startswith("1 of 267")
        print("Map-load failure: list, profiles and tour remain usable")
        page.close()
    browser.close()
