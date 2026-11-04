#!/usr/bin/env python3
"""A05 Phase-1 offline virtual QA. No GitHub Actions, deployment or respondent data.
Run from repository root:
  python3 scripts/qa-a05-phase1-virtual-browser-20261104.py
  python3 scripts/qa-a05-phase1-virtual-browser-20261104.py --html PATH --out PATH
Requires Python Playwright and a locally installed Chromium executable.
The app under test is read from disk and injected with page.set_content()
because some restricted runners prohibit file:// and localhost. This checks
Chromium rendering but is NOT Safari / VoiceOver / iPhone physical QA.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from playwright.sync_api import sync_playwright

DEFAULT_HTML = "projects/kidp/life-design-lab/a05/phase1-short-report-preview-20261104.html"
DEFAULT_OUT = ".a05-qa/phase1-virtual-20261104"
CASES = [
    ("desktop", 1366, 900, False, True),
    ("mobile", 390, 844, True, True),
    ("compact", 320, 640, True, False),
    ("tablet", 768, 1024, True, False),
]

def load_expected(html: str):
    # The preview is self-contained. Compare data in rendered app with source.
    pattern = re.compile(r"const SELF=(.*?);\s*const PAIRS=(.*?);\s*const ids=", re.S)
    match = pattern.search(html)
    if match is None:
        raise AssertionError("embedded JSON markers not found")
    types = json.loads(match.group(1))
    pairs = json.loads(match.group(2))
    if len(types) != 16 or len(pairs) != 136:
        raise AssertionError("unexpected counts for source files")
    by_id = {x["typeId"]: x for x in types}
    by_pair = {x["pairId"]: x for x in pairs}
    if len(by_id) != 16 or len(by_pair) != 136:
        raise AssertionError("duplicate report ID")
    return by_id, by_pair

def check(cond: bool, message: str):
    if not cond:
        raise AssertionError(message)

def perform(page, by_id, by_pair, full, viewport_name, out_dir):
    passed = 0
    failures = []
    runtime_errors = []
    requests = []
    page.on("pageerror", lambda error: runtime_errors.append("pageerror: " + str(error)))
    page.on("console", lambda msg: runtime_errors.append("console: " + msg.text) if msg.type == "error" else None)
    page.on("request", lambda req: requests.append(req.url))
    def attempt(label, fn):
        nonlocal passed
        try:
            fn()
            passed += 1
        except Exception as exc:
            failures.append(f"{label}: {type(exc).__name__}: {exc}")
    def no_overflow():
        return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")

    attempt("preview title", lambda: check("152件" in page.title(), "unexpected title"))
    attempt("self selector options", lambda: check(page.locator("#first option").count() == 16, "not 16 options"))
    attempt("pair selector options", lambda: check(page.locator("#second option").count() == 16, "not 16 options"))
    attempt("self displayed by default", lambda: check(page.locator("#second-field").is_hidden(), "pair select visible in self mode"))
    page.locator("#tab-self").click()
    sample_types = list(by_id) if full else ["T01", "T05", "T11", "T16"]
    for t in sample_types:
        def test_type(t=t):
            page.locator("#first").select_option(t)
            result = page.locator("#result")
            check(t in result.locator("h2").first.inner_text(), "wrong self report")
            check(result.locator("section.section").count() == 6, "self chapters != 6")
            check(len(by_id[t]["sections"]) == 6, "source chapters mismatch")
            check(no_overflow(), "horizontal overflow")
        attempt("self " + t, test_type)
    if viewport_name in ("desktop", "mobile"):
        page.locator("#first").select_option("T01")
        attempt("self screenshot", lambda: page.screenshot(path=str(out_dir / f"{viewport_name}-self-T01.png"), full_page=True))
    page.locator("#tab-pair").click()
    attempt("pair selector displayed", lambda: check(not page.locator("#second-field").is_hidden(), "pair selector hidden"))
    ids = list(by_id)
    selections = [(a,b) for a in ids for b in ids] if full else [
        ("T01","T01"),("T01","T05"),("T01","T16"),("T16","T01"),
        ("T05","T05"),("T07","T11"),("T11","T16"),("T16","T16")]
    for a,b in selections:
        def test_pair(a=a,b=b):
            page.locator("#first").select_option(a)
            page.locator("#second").select_option(b)
            key = "-".join(sorted([a,b]))
            expected = by_pair[key]
            result = page.locator("#result")
            name_a = by_id[a]["name"]
            name_b = by_id[b]["name"]
            actual_title = result.locator("h2").first.inner_text()
            check(actual_title == f"{name_a} × {name_b}", "pair title ignores selected order")
            check(result.locator("section.section").count() == 6, "pair chapters != 6")
            table = result.locator("table.axis-table")
            check(table.locator("thead th").all_inner_texts() == ["観点", name_a, name_b],
                  "table headers ignore selected order")
            rows = table.locator("tbody tr")
            check(rows.count() == 4, "axis rows != 4")
            reverse = a != expected["typeIds"][0]
            for i, axis in enumerate(expected["axisComparison"]):
                actual = rows.nth(i).locator("td").all_inner_texts()
                status = "共通" if axis["relation"] == "shared" else "相違"
                left = axis["second"] if reverse else axis["first"]
                right = axis["first"] if reverse else axis["second"]
                wanted = [axis["label"] + "（" + status + "）", left, right]
                check(actual == wanted, f"axis {axis['axis']} swapped or mislabeled")
            check(result.locator("ol.prompts li").count() == 3, "prompts != 3")
            check(no_overflow(), "horizontal overflow")
        attempt(f"pair {a}×{b}", test_pair)
    if viewport_name in ("desktop","mobile"):
        page.locator("#first").select_option("T01")
        page.locator("#second").select_option("T05")
        attempt("pair screenshot", lambda: page.screenshot(path=str(out_dir / f"{viewport_name}-pair-T01-T05.png"), full_page=True))
    attempt("no JS errors", lambda: check(not runtime_errors, "; ".join(runtime_errors[:5])))
    attempt("no network requests", lambda: check(not requests, "; ".join(requests[:5])))
    return {"viewport":viewport_name, "passed":passed,"failed":len(failures),
            "failureDetails":failures[:40],"jsErrors":runtime_errors[:10],
            "externalRequests":requests[:10],"checkedSelf":len(sample_types),
            "checkedOrderedPairs":len(selections)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", default=DEFAULT_HTML)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--chromium", default="/usr/bin/chromium")
    args=ap.parse_args()
    source=Path(args.html)
    if not source.is_file():
        print(f"BLOCKED: source HTML not mounted: {source}", file=sys.stderr)
        return 2
    html=source.read_text(encoding="utf-8")
    by_id,by_pair=load_expected(html)
    out_dir=Path(args.out);out_dir.mkdir(parents=True, exist_ok=True)
    started=time.time()
    results=[]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium,headless=True,args=["--no-sandbox"])
        chromium_version=browser.version
        for name,width,height,is_mobile,full in CASES:
            context=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1,
                 is_mobile=is_mobile,has_touch=is_mobile,locale="ja-JP")
            page=context.new_page()
            try:
                # The project HTML embeds its styles, script and all 152 reports.
                page.set_content(html, wait_until="load", timeout=30000)
                results.append(perform(page,by_id,by_pair,full,name,out_dir))
            except Exception as exc:
                results.append({"viewport":name,"passed":0,"failed":1,"failureDetails":[str(exc)]})
            finally:
                context.close()
        browser.close()
    summary={
      "mode":"CHROMIUM_VIRTUAL_NOT_PHYSICAL_DEVICE",
      "source":str(source),
      "sha256":hashlib.sha256(html.encode()).hexdigest(),
      "chromiumVersion":chromium_version,
      "viewportResults":results,
      "totalChecksPassed":sum(r["passed"] for r in results),
      "totalChecksFailed":sum(r["failed"] for r in results),
      "seconds":round(time.time()-started,2),
      "acceptance":"PASS" if all(r["failed"]==0 for r in results) else "FAIL",
      "limits":["No iOS Safari or VoiceOver", "No respondent-data/storage scenarios",
                "No independent editorial or psychometric validation",
                "file:// prohibited on some runners; page.set_content may not reproduce URL-origin behavior"]
    }
    (out_dir/"report.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:summary[k] for k in ("mode","chromiumVersion","totalChecksPassed","totalChecksFailed","seconds","acceptance")},ensure_ascii=False))
    print("Evidence:",out_dir/"report.json")
    return 0 if summary["acceptance"]=="PASS" else 1
if __name__ == "__main__":
    raise SystemExit(main())
