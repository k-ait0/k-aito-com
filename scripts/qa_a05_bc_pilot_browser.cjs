/** A05 D88 Chrome QA: start static server on 127.0.0.1:8765 first. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const viewport of [
      { width: 320, height: 760 },
      { width: 390, height: 844 },
      { width: 1280, height: 800 }
    ]) {
      const page = await browser.newPage({viewport});
      const problems = [];
      page.on("pageerror", error => problems.push(error.message));
      page.on("request", request => {
        const url = new URL(request.url());
        if (url.origin !== "http://127.0.0.1:8765")
          problems.push("Unexpected external request: " + url.href);
        if (request.method() !== "GET")
          problems.push("Unexpected write request: " + request.method());
      });
      await page.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/bc-pilot-preview.html");
      await page.waitForFunction(() => document.querySelectorAll("#questions fieldset").length === 12);
      assert.equal(await page.locator('input[type="radio"]').count(), 96);
      assert.equal(await page.locator("#preset option").count(), 4);
      assert.match(await page.locator("#load-state").innerText(), /12問/);
      assert.match(await page.locator("#progress").innerText(), /0 \/ 12/);
      assert.equal(await page.locator("[data-facet]").count(), 4);
      assert.match(await page.locator("#classification").innerText(), /発行しない/);
      await page.locator("#preset").selectOption("both_high");
      await page.locator("#load-preset").click();
      for (const facet of ["self", "related", "future", "present"])
        assert.equal(await page.locator('[data-facet="' + facet + '"]').getAttribute("data-mean"), "7");
      await page.locator("#preset").selectOption("both_low");
      await page.locator("#load-preset").click();
      for (const facet of ["self", "related", "future", "present"])
        assert.equal(await page.locator('[data-facet="' + facet + '"]').getAttribute("data-mean"), "1");
      await page.locator("#preset").selectOption("opposed");
      await page.locator("#load-preset").click();
      assert.equal(await page.locator('[data-facet="self"]').getAttribute("data-mean"), "7");
      assert.equal(await page.locator('[data-facet="related"]').getAttribute("data-mean"), "1");
      assert.equal(await page.locator('[data-facet="future"]').getAttribute("data-mean"), "1");
      assert.equal(await page.locator('[data-facet="present"]').getAttribute("data-mean"), "7");
      await page.locator("#preset").selectOption("incomplete");
      await page.locator("#load-preset").click();
      assert.equal(await page.locator('[data-facet="self"]').getAttribute("data-mean"), "");
      assert.match(await page.locator('[data-facet="self"]').innerText(), /判断不能 1問/);
      assert.equal(await page.locator('[data-facet="related"]').getAttribute("data-mean"), "4");
      await page.locator("#reset").click();
      assert.match(await page.locator("#progress").innerText(), /0 \/ 12/);
      assert.equal(await page.locator('input[type="radio"]:checked').count(), 0);
      await page.locator('input#answer-B-S01-7').check();
      assert.match(await page.locator("#progress").innerText(), /1 \/ 12/);
      assert.equal(await page.locator('[data-facet="self"]').getAttribute("data-mean"), "");
      await page.reload();
      await page.waitForFunction(() => document.querySelectorAll("#questions fieldset").length === 12);
      assert.match(await page.locator("#progress").innerText(), /0 \/ 12/);
      assert.equal(await page.locator('input[type="radio"]:checked').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "horizontal overflow: " + viewport.width);
      const stored = await page.evaluate(async () => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
        databases: typeof indexedDB.databases === "function" ?
          (await indexedDB.databases()).map(x => x.name) : []
      }));
      assert.deepEqual(stored, {local: [], session: [], databases: []});
      assert.deepEqual(problems, []);
      await page.close();
    }
    console.log("A05 D88 isolated B/C pilot Chrome preview PASS");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
