#!/usr/bin/env python3
"""v0.33 research-only REAL Chromium file:// acceptance for v0.32's single HTML."""
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "research/analytics/K_Aito_Analytics_Offline_Preview_v032.html"
REPORT = ROOT / "docs/qa/analytics-v033-chromium-results.json"
SHOTS = ROOT / "docs/qa/analytics-v033-screenshots"
records = []
errors = []
http_requests = []
CONSTRAINTS = {
    "initial_yen": "30000000",
    "monthly_contribution_yen": "0",
    "monthly_living_yen": "100000",
    "annual_return_pct": "0",
    "annual_cpi_pct": "0",
}

def money(text):
    # UI uses exact yen for scenarios below 100m.
    assert "億" not in text, "Scenario must use exact-yen labels"
    return int(re.sub(r"[^\d]", "", text))

def check(case_id, fn):
    try:
        details = fn()
        records.append({"case": case_id, "status": "PASS", "details": str(details or "")[:500]})
        print("PASS", case_id, details, flush=True)
    except Exception as exc:
        records.append({"case": case_id, "status": "FAIL", "details": f"{type(exc).__name__}: {exc}"[:500]})
        print("FAIL", case_id, type(exc).__name__, str(exc), flush=True)

def expect(condition, message):
    if not condition:
        raise AssertionError(message)

def fill(page, values):
    for name, value in values.items():
        if name in ("cashflow_timing", "stress_profile", "horizon_years"):
            page.locator("#" + name).select_option(str(value))
        else:
            page.locator("#" + name).fill(str(value))
    page.locator("#run-button").click()
    expect(page.locator("body").get_attribute("data-preview-status") == "READY",
           "Preview not READY: " + page.locator("#error-msg").inner_text())
    return page.locator("#fixed-final").inner_text(), page.locator("#cpi-final").inner_text()

def reset(page):
    return fill(page, dict(CONSTRAINTS,
                           cashflow_timing="MONTH_START",
                           stress_profile="FLAT_RATE",
                           horizon_years="10"))

def case01(page):
    expect(page.locator("body").get_attribute("data-preview-status") == "READY", "initial state")
    expect(page.locator("#balance-chart polyline").count() == 2, "two SVG plots")
    expect(page.locator("#details .detail").count() == 6, "six metrics")
    expect("PASS" in page.locator("#audit-state").inner_text(), "audit")
    expect(not errors, f"JS errors: {errors}")
    return "file:// loaded offline; chart, audit and metrics visible"

def case02(page):
    a, b = fill(page, dict(CONSTRAINTS, horizon_years="10", annual_return_pct="4", annual_cpi_pct="2"))
    expect(a != "—" and b != "—", "numeric result")
    expect("10年" in page.locator("#result-state").inner_text(), "horizon label")
    expect(page.locator("#details .detail").count() == 6, "metric count")
    return f"fixed {a}; CPI {b}"

def case03(page):
    a, b = reset(page)
    expect(a == b, f"zero CPI discrepancy: {a} != {b}")
    return f"both={a}"

def case04(page):
    reset(page)
    fixed, positive = fill(page, {"annual_cpi_pct": "10"})
    _, negative = fill(page, {"annual_cpi_pct": "-10"})
    expect(money(positive) < money(fixed) < money(negative),
           f"positive={positive}, fixed={fixed}, negative={negative}")
    return "CPI +10% lowers remaining balance; -10% raises it"

def case05(page):
    reset(page)
    a, _ = fill(page, {"annual_return_pct": "40", "annual_cpi_pct": "2"})
    b, _ = fill(page, {"cashflow_timing": "MONTH_END"})
    expect(a != b, f"timing did not change result ({a})")
    expect("月末" in page.locator("#result-state").inner_text(), "phase label")
    return f"start={a}; end={b}"

def case06(page):
    reset(page)
    baseline, _ = fill(page, {"annual_return_pct": "5"})
    shock, _ = fill(page, {"stress_profile": "YEAR1_SHOCK"})
    expect(baseline != shock, "shock has no visible effect")
    return f"baseline={baseline}; year-one -30%={shock}"

def case07(page):
    reset(page)
    seen = []
    for n in (10, 20, 30):
        a, b = fill(page, {"horizon_years": str(n)})
        texts = page.locator("#balance-chart text").all_text_contents()
        expect(f"{n}年" in texts, f"missing year axis: {n}")
        expect(f"{n}年" in page.locator("#result-state").inner_text(), "label")
        seen.append((n, a, b))
    expect(len({v[1] for v in seen}) > 1, "ending balances do not vary by horizon")
    return "; ".join(f"{n}y={a}" for n,a,_ in seen)

def case08(page):
    reset(page)
    a, b = fill(page, {"initial_yen": "1000000",
                       "monthly_living_yen": "100000"})
    rows = page.locator("#details .detail").all_inner_texts()
    expect(a == "0 円" and b == "0 円", "depletion not zero")
    expect(any("資金不足月数" in x and re.search(r"\d+か月", x) for x in rows), "months")
    expect(any("未払総額" in x and "円" in x for x in rows), "unfunded")
    expect("NaN" not in page.locator("body").inner_text(), "NaN in UI")
    return "depletion=0; shortfall months and unfunded totals shown"

def case09(page):
    reset(page)
    for value in ("-100", "100000000001", ""):
        page.locator("#initial_yen").fill(value)
        page.locator("#run-button").click()
        expect(page.locator("body").get_attribute("data-preview-status") == "ERROR",
               "invalid input accepted: " + repr(value))
        expect(page.locator("#fixed-final").inner_text() == "—", "stale fixed")
        expect(page.locator("#cpi-final").inner_text() == "—", "stale CPI")
        expect(page.locator("#balance-chart polyline").count() == 0, "stale chart")
        expect("未実施" in page.locator("#audit-state").inner_text(), "stale audit")
        expect(bool(page.locator("#error-msg").inner_text()), "empty error text")
    return "negative, max-overflow, blank all reject and clear old results"

def case10(page):
    a, b = reset(page)
    expect(page.locator("#error-msg").inner_text() == "", "error not cleared")
    expect("PASS" in page.locator("#audit-state").inner_text(), "audit not restored")
    expect(page.locator("#balance-chart polyline").count() == 2, "chart not restored")
    return f"recovered fixed={a}, CPI={b}"

def case11(page):
    expect(not errors, "pageerror: " + str(errors))
    expect(not http_requests, "unexpected HTTP(S) requests: " + str(http_requests))
    return "no pageerror or HTTP(S) requests while context is offline"

def case12(page, context):
    status = []
    for width in (375, 390, 1280):
        page.set_viewport_size({"width": width, "height": 900})
        m = page.evaluate("""() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          chart: document.querySelector('#balance-chart').getBoundingClientRect().width,
          inputs: document.querySelector('#scenario-form').getBoundingClientRect().width
        })""")
        expect(m["scroll"] <= m["client"] + 1, f"horizontal overflow: {width}, {m}")
        expect(m["chart"] > 0 and m["inputs"] > 0, "invisible controls")
        expect(page.locator("#run-button").is_visible(), "run button not visible")
        if width in (390, 1280):
            SHOTS.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(SHOTS / f"v033-{width}.png"), full_page=True)
        status.append(f"{width}px: content={m['scroll']}px")
    return "; ".join(status)

def case13(page):
    reset(page)
    page.locator("#initial_yen").focus()
    page.keyboard.press("Tab")
    focus = page.evaluate("document.activeElement.id")
    expect(focus == "monthly_contribution_yen", f"focus order={focus}")
    page.locator("#annual_cpi_pct").focus()
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type("3")
    page.keyboard.press("Enter")
    expect(page.locator("body").get_attribute("data-preview-status") == "READY",
           "keyboard Enter submit")
    expect("PASS" in page.locator("#audit-state").inner_text(), "audit after Enter")
    return "Tab order and keyboard Enter submission work"

def case14(page):
    page.reload(wait_until="load")
    expect(page.locator("body").get_attribute("data-preview-status") == "READY",
           "reload not READY")
    body = page.locator("body").inner_text()
    expect("合成データ専用" in body, "synthetic warning missing")
    expect("実際の市場データ" in body, "no real-market warning")
    expect(page.locator('input[type="file"]').count() == 0, "private input exposed")
    expect(not http_requests, "external requests on reload")
    return "reload restores synthetic default and no external source input"

def main():
    if not HTML.is_file():
        print("MISSING HTML", HTML, file=sys.stderr)
        return 2
    with sync_playwright() as p:
        system_chrome = shutil.which("google-chrome") or shutil.which("chromium")
        options = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
        if system_chrome:
            options["executable_path"] = system_chrome
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        context.set_offline(True)
        page = context.new_page()
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("request", lambda req: http_requests.append(req.url)
                if req.url.startswith(("http:", "https:")) else None)
        try:
            page.goto(HTML.resolve().as_uri(), wait_until="load")
            checks = [
                ("UI-01", lambda: case01(page)),
                ("UI-02", lambda: case02(page)),
                ("UI-03", lambda: case03(page)),
                ("UI-04", lambda: case04(page)),
                ("UI-05", lambda: case05(page)),
                ("UI-06", lambda: case06(page)),
                ("UI-07", lambda: case07(page)),
                ("UI-08", lambda: case08(page)),
                ("UI-09", lambda: case09(page)),
                ("UI-10", lambda: case10(page)),
                ("UI-11", lambda: case11(page)),
                ("UI-12", lambda: case12(page, context)),
                ("UI-13", lambda: case13(page)),
                ("UI-14", lambda: case14(page)),
            ]
            for test_id, fn in checks:
                check(test_id, fn)
            version = browser.version
        finally:
            context.close()
            browser.close()
    result = {
        "schema": "KAITO_ANALYTICS_V033_REAL_CHROMIUM_E2E",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "browser": "Chromium " + version,
        "origin": "file://",
        "network_offline": True,
        "data_source": "SYNTHETIC_ONLY",
        "total": len(records),
        "passed": sum(x["status"] == "PASS" for x in records),
        "failed": sum(x["status"] == "FAIL" for x in records),
        "actual_browser_acceptance": "PASS" if all(x["status"] == "PASS" for x in records) else "FAIL",
        "http_requests": http_requests,
        "page_errors": errors,
        "cases": records,
        "note": "Automated Chromium file:// acceptance; this is not owner manual Windows/Safari acceptance and does not authorize production."
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("RESULT", result["passed"], "/", result["total"],
          "actual Chromium E2E; failures", result["failed"], flush=True)
    return 1 if result["failed"] else 0

if __name__ == "__main__":
    sys.exit(main())
