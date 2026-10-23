"""MONO BASE 3D/browser release gate. Requires playwright and Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
OUT = Path("mono-base-qa-artifacts")
OUT.mkdir(exist_ok=True)

def verify(page, name):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    assert page.locator("h1").count() == 1, f"{name}: home H1"
    page.screenshot(path=str(OUT / f"home-{name}.png"), full_page=True)
    page.goto(f"{BASE}/design-lab.html", wait_until="domcontentloaded")
    page.wait_for_function(
        """() => document.querySelector('#status')?.textContent !== '3Dエンジンを読み込み中…'""",
        timeout=30000,
    )
    status = page.locator("#status").inner_text()
    assert "DRAG TO ROTATE" in status, f"{name}: 3D not ready: {status}"
    canvas = page.locator("#viewport canvas")
    assert canvas.count() == 1 and canvas.is_visible(), f"{name}: no visible WebGL canvas"
    assert canvas.evaluate("(el) => el.width > 0 && el.height > 0"), f"{name}: empty canvas"
    assert canvas.get_attribute("tabindex") == "0", f"{name}: viewer not keyboard accessible"
    assert not page.locator("#fallback").is_visible(), f"{name}: fallback shown unexpectedly"

    page.locator("#sweep").evaluate(
        "(el) => {el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}))}"
    )
    assert page.locator("#sweepValue").inner_text() == "35°", f"{name}: sweep input"
    page.locator("#explode").evaluate(
        "(el) => {el.value='65';el.dispatchEvent(new Event('input',{bubbles:true}))}"
    )
    assert page.locator("#explodeValue").inner_text() == "65%", f"{name}: explode input"
    page.locator("#wire").click()
    assert page.locator("#wire").get_attribute("aria-pressed") == "true", f"{name}: wire mode"
    page.locator("#solid").click()
    assert page.locator("#solid").get_attribute("aria-pressed") == "true", f"{name}: solid mode"
    page.locator('[data-view="top"]').click()
    page.locator('[data-view="side"]').click()
    canvas.focus()
    page.keyboard.press("ArrowRight")
    page.keyboard.press("Equal")
    page.keyboard.press("Home")
    assert page.locator("#sweepValue").inner_text() == "20°", f"{name}: reset sweep"
    assert page.locator("#explodeValue").inner_text() == "0%", f"{name}: reset explode"
    assert page.locator("#wire").get_attribute("aria-pressed") == "false", f"{name}: reset wire"
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (
        f"{name}: horizontal overflow"
    )
    page.screenshot(path=str(OUT / f"design-lab-{name}.png"), full_page=True)
    assert not errors, f"{name}: uncaught browser errors: {errors}"
    print(f"PASS {name}: WebGL canvas, viewer controls, keyboard, responsive layout")

def verify_fallback(browser):
    page = browser.new_page(viewport={"width": 1024, "height": 768})
    page.route("**/three.module.js", lambda route: route.abort())
    page.goto(f"{BASE}/design-lab.html", wait_until="domcontentloaded")
    page.wait_for_function(
        """() => document.querySelector('#status')?.textContent === '3D読み込みエラー'""",
        timeout=15000,
    )
    assert page.locator("#fallback").is_visible(), "failure fallback not visible"
    assert page.locator("#sweep").is_disabled(), "viewer controls remain active on failure"
    assert page.locator("#reset").is_disabled(), "reset remains active on failure"
    print("PASS dependency failure: alert fallback and disabled controls")
    page.close()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for name, viewport in [
        ("desktop", {"width": 1440, "height": 900}),
        ("mobile", {"width": 390, "height": 844}),
    ]:
        page = browser.new_page(viewport=viewport, device_scale_factor=1)
        verify(page, name)
        page.close()
    verify_fallback(browser)
    browser.close()
