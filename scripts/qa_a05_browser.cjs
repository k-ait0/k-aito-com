"use strict";
/**
 * A05 browser acceptance on a local static-site checkout.
 *
 * Requires the existing QA Playwright installation and Chromium:
 *   NODE_PATH=/tmp/kaito-qa/node_modules node scripts/qa_a05_browser.cjs
 *
 * Does not contact production or create user records. No GitHub Actions added.
 */
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const A05 = "/projects/kidp/life-design-lab/a05/";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function startServer() {
  const server = http.createServer((request, response) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch (_) { response.writeHead(400); response.end("Bad request"); return; }
    const filepath = path.resolve(ROOT, "." + (urlPath.endsWith("/") ? urlPath + "index.html" : urlPath));
    if (!filepath.startsWith(ROOT + path.sep) || !fs.existsSync(filepath) ||
        !fs.statSync(filepath).isFile()) {
      response.writeHead(404);
      response.end("Missing file");
      return;
    }
    response.writeHead(200, { "Content-Type": MIME[path.extname(filepath)] || "application/octet-stream" });
    fs.createReadStream(filepath).pipe(response);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const check = async (name, fn) => {
  await fn();
  console.log("PASS A05 browser: " + name);
};

async function main() {
  const { QUESTIONS } = await import(pathToFileURL(path.join(ROOT,
    "projects/kidp/life-design-lab/a05/questions.mjs")).href);
  assert.equal(QUESTIONS.length, 30);

  const server = await startServer();
  let browser;
  const address = "http://127.0.0.1:" + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      acceptDownloads: true
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", e => consoleErrors.push(e.message));
    page.on("response", response => {
      if (response.url().startsWith(address) && response.status() >= 400) {
        consoleErrors.push(response.status() + " " + response.url());
      }
    });
    page.on("request", request => {
      if (!request.url().startsWith(address)) {
        consoleErrors.push("Unexpected remote network request: " + request.url());
      }
    });
    page.on("dialog", dialog => dialog.accept());

    await check("no consent: answer is not persisted after reload", async () => {
      await page.goto(address + A05);
      await page.locator('[data-action="start"]').click();
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.reload();
      await page.locator('[data-action="start"]').click();
      assert.match(await page.locator("#a05-progress-count").innerText(), /0問回答済み/);
      assert.match(await page.locator("#a05-answer-status").innerText(), /まだ回答/);
    });

    await check("opt-in: consent and draft survive reload", async () => {
      await page.locator('[data-view="home"]').first().click();
      await page.locator("#a05-retain-raw").check();
      await page.locator('[data-action="enable"]').click();
      await page.locator('[data-view="quiz"]').first().click();
      // A01, direction=1, answer 7 -> positive A.
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.locator('[data-action="next"]').click();
      await page.reload();
      await page.locator('[data-action="start"]').click();
      assert.match(await page.locator("#a05-progress-count").innerText(), /1問回答済み/);
      assert.match(await page.locator("#a05-question-heading").innerText(), /理想に近いのは/);
    });

    await check("complete 30 and classify T16 / time", async () => {
      for (let i = 1; i < QUESTIONS.length; i++) {
        const value = QUESTIONS[i].direction === 1 ? 7 : 1;
        await page.locator('[data-action="answer"][data-value="' + value + '"]').click();
        await page.locator('[data-action="next"]').click();
      }
      await page.locator('[data-action="finish"]').click();
      const content = await page.locator("#a05-content").innerText();
      assert.match(content, /T16/);
      assert.match(content, /時間的自由寄り/);
    });

    await check("history restores after reload and retains opted-in raw answers", async () => {
      await page.reload();
      await page.locator('[data-view="history"]').first().click();
      const content = await page.locator("#a05-content").innerText();
      assert.match(content, /検証済み 1件/);
      assert.match(content, /生回答あり/);
    });

    await check("user export includes history but does not transmit responses", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator('[data-action="export"]').click()
      ]);
      assert.equal(download.suggestedFilename(), "a05-data-export.json");
      const text = fs.readFileSync(await download.path(), "utf8");
      const data = JSON.parse(text);
      assert.equal(data.schema, "A05-EXPORT-1");
      assert.equal(data.stores.history.length, 1);
      assert.ok(Object.hasOwn(data.stores.history[0], "rawAnswers"));
    });

    await check("raw-answer deletion leaves result intact", async () => {
      await page.locator('[data-action="scrub"]').click();
      assert.match(await page.locator("#a05-content").innerText(), /生回答なし/);
      await page.reload();
      await page.locator('[data-view="history"]').first().click();
      assert.match(await page.locator("#a05-content").innerText(), /検証済み 1件/);
      assert.match(await page.locator("#a05-content").innerText(), /生回答なし/);
    });

    await check("restore keeps valid history while surfacing legacy and quarantined entries", async () => {
      await page.evaluate(async () => {
        const database = await new Promise((resolve, reject) => {
          const open = indexedDB.open("kaito-a05-values-v1", 1);
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        try {
          const saved = await new Promise((resolve, reject) => {
            const tx = database.transaction(["history"], "readonly");
            const request = tx.objectStore("history").getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          if (saved.length !== 1) throw Error("Expected one valid history before injecting test records");
          const old = structuredClone(saved[0]);
          old.id = "qa-a05-legacy";
          old.versions.scoring = "S-LEGACY";
          old.presentation.name = "<img src=x onerror=alert(1)>旧版";
          const bad = structuredClone(saved[0]);
          bad.id = "qa-a05-quarantined";
          bad.result.axes[0].n = -1;
          await new Promise((resolve, reject) => {
            const tx = database.transaction(["history"], "readwrite");
            tx.objectStore("history").add(old);
            tx.objectStore("history").add(bad);
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error ?? Error("Injection rolled back"));
          });
        } finally {
          database.close();
        }
      });
      await page.reload();
      await page.locator('[data-view="history"]').first().click();
      const content = await page.locator("#a05-content").innerText();
      assert.match(content, /検証済み 1件/);
      assert.match(content, /旧版 1件/);
      assert.match(content, /隔離 1件/);
      assert.match(content, /読み取り専用・未検証/);
      assert.equal(await page.locator('#a05-content img').count(), 0,
        "Untrusted legacy text must be HTML-escaped");
      assert.equal(await page.locator('[data-action="delete-protected"]').count(), 2);
    });

    await check("targeted recovery deletion preserves verified history", async () => {
      await page.locator('[data-action="delete-protected"][data-kind="legacy"]').click();
      assert.match(await page.locator("#a05-content").innerText(), /旧版 0件/);
      await page.locator('[data-action="delete-protected"][data-kind="quarantined"]').click();
      assert.match(await page.locator("#a05-content").innerText(), /隔離 0件/);
      await page.reload();
      await page.locator('[data-view="history"]').first().click();
      assert.match(await page.locator("#a05-content").innerText(), /検証済み 1件/);
      assert.match(await page.locator("#a05-content").innerText(), /旧版 0件/);
      assert.match(await page.locator("#a05-content").innerText(), /隔離 0件/);
    });

    await check("second tab cannot overwrite a different active assessment", async () => {
      // After finalize(), storage has consent/history but no active draft.
      const other = await context.newPage();
      await other.goto(address + A05);
      await page.locator('[data-view="quiz"]').first().click();
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await other.locator('[data-view="quiz"]').first().click();
      await other.locator('[data-action="answer"][data-value="7"]').click();
      assert.match(await other.locator("#a05-notice").innerText(), /別タブ|自動上書き/);
      await other.close();
    });

    await check("explicit full deletion clears this A05 database", async () => {
      await page.locator('[data-view="history"]').first().click();
      await page.locator('[data-action="erase"]').click();
      await page.reload();
      assert.match(await page.locator("#a05-content").innerText(), /端末保存：無効/);
      await page.locator('[data-view="history"]').first().click();
      assert.match(await page.locator("#a05-content").innerText(), /検証済み 0件/);
    });

    await check("320 / 390 / 1440 responsive widths do not overflow main content", async () => {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 860 });
        await page.locator('[data-view="catalog"]').first().click();
        const layout = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth
        }));
        assert.ok(layout.scroll <= layout.client + 2,
          width + "px overflow: " + JSON.stringify(layout));
      }
    });

    assert.deepEqual(consoleErrors, []);
    console.log("PASS A05 browser: no unexpected network or page errors");
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error("FAIL A05 browser:", error.stack ?? error);
  process.exitCode = 1;
});
