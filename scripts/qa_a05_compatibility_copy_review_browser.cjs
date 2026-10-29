/**
 * Local-only Chromium/Chrome QA for A05 C-05 editorial review dashboard.
 *
 * Terminal A: python3 -m http.server 8765 --bind 127.0.0.1
 * Terminal B: node scripts/qa_a05_compatibility_copy_review_browser.cjs
 *
 * Optional: A05_CHROMIUM_EXECUTABLE=/usr/bin/chromium
 * No GitHub Actions, participant inputs, upload or deployment.
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const origin = "http://127.0.0.1:8765";
const pageUrl = origin + "/projects/kidp/life-design-lab/a05/compatibility-copy-review-preview.html";
const viewports = [
  { width:320,height:760 },{ width:390,height:844 },
  { width:820,height:1180 },{ width:1280,height:800 }
];

(async () => {
  const executablePath = process.env.A05_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(executablePath
    ? { headless:true, executablePath }
    : { headless:true, channel:"chrome" });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const issues = [];
      page.on("pageerror", error => issues.push("JavaScript error: "+error.message));
      page.on("request", request => {
        if (new URL(request.url()).origin !== origin)
          issues.push("External request: " + request.url());
      });
      const response = await page.goto(pageUrl);
      assert.equal(response.status(), 200);
      await page.waitForFunction(() =>
        document.querySelector("#list-count")?.textContent?.includes("136 / 136"));
      assert.equal(await page.locator('#pair-select option').count(), 136);
      assert.equal(await page.locator('#type-filter option').count(), 17);
      assert.equal(await page.locator('#diff-filter option').count(), 6);
      assert.equal(await page.locator('#flag-filter option').count(), 3);
      assert.equal(await page.locator('#literature a').count(), 4);
      assert.match(await page.locator('#review-status').innerText(), /人手レビュー：未実施/);
      assert.match(await page.locator('#review-status').innerText(), /直接科学検証：なし/);

      await page.locator("#type-filter").selectOption("T11");
      assert.equal(await page.locator("#pair-select option").count(),16);
      await page.locator("#diff-filter").selectOption("3");
      assert.equal(await page.locator("#pair-select option").count(),4);
      await page.locator("#flag-filter").selectOption("FLAGGED");
      assert.equal(await page.locator("#pair-select option").count(),0);
      assert.equal(await page.locator("#previous").isDisabled(),true);
      assert.equal(await page.locator("#next").isDisabled(),true);
      await page.locator("#flag-filter").selectOption("CLEAR");
      assert.equal(await page.locator("#pair-select option").count(),4);
      await page.locator("#type-filter").selectOption("ALL");
      await page.locator("#diff-filter").selectOption("ALL");
      assert.equal(await page.locator("#pair-select option").count(),136);
      await page.locator("#pair-select").selectOption("T02-T11");
      assert.equal(await page.locator("#agreements li").count(),1);
      assert.match(await page.locator("#agreements").innerText(), /B軸：自律/);
      assert.equal(await page.locator("#differences li").count(),3);
      assert.match(await page.locator("#differences").innerText(), /T02「安定」／T11「変化」/);
      assert.match(await page.locator("#story").innerText(), /静かな探究者/);
      assert.equal(await page.locator("#literature a").count(),4);
      assert.match(await page.locator("#findings").innerText(), /人手による文章審査は未実施/);

      const before = await page.locator("#pair-select").inputValue();
      await page.locator("#next").click();
      assert.notEqual(await page.locator("#pair-select").inputValue(),before);
      await page.locator("#previous").click();
      assert.equal(await page.locator("#pair-select").inputValue(),before);

      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth),true,
        "horizontal overflow at " + viewport.width);
      const stored = await page.evaluate(async () => ({
        local:Object.keys(localStorage),
        session:Object.keys(sessionStorage),
        databases:typeof indexedDB.databases === "function"
          ? (await indexedDB.databases()).map(db => db.name) : []
      }));
      assert.deepEqual(stored,{local:[],session:[],databases:[]});
      assert.deepEqual(issues,[]);
      await page.close();
    }
    console.log("A05 C05 copy-review local Chromium acceptance PASS (4 viewports)");
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
