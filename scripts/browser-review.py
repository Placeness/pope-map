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

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.browser, headless=True, args=["--no-sandbox"])
    for name, width, height in [("desktop", 1440, 900), ("mobile", 390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height}, reduced_motion="reduce")
        errors, remote_requests, requests = [], [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.on("request", lambda request: remote_requests.append(request.url) if request.url.startswith("https://") else None)
        page.goto(args.url, wait_until="networkidle")
        page.locator(".pope-map-marker").first.wait_for()
        page.screenshot(path=str(output / f"preview-{name}.png"))
        page.locator('.primary-nav [data-action="list"]').click()
        assert page.locator(".pope-row").count() == 267
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
        if name == "mobile":
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
        print(f"{name}: full roster, repeated periods, tour/jumps/resume, resources; no JavaScript errors or remote requests")
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
