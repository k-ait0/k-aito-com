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

// Let IndexedDB transactions and UI rendering settle before inspecting
// results or reloading the page. A Playwright click is not an async save ACK.
async function waitForUICommit(page, view) {
  await page.waitForFunction(expected => {
    const root = document.querySelector("#a05-content");
    const tab = document.querySelector('[data-view="' + expected + '"]');
    return root?.getAttribute("aria-busy") === "false" &&
      (!expected || tab?.getAttribute("aria-current") === "page");
  }, view || "", { timeout: 10000 });
}

async function main() {
  const { QUESTIONS } = await import(pathToFileURL(path.join(ROOT,
    "projects/kidp/life-design-lab/a05/questions.mjs")).href);
  assert.equal(QUESTIONS.length, 30);

  const server = await startServer();
  let browser;
  const address = "http://127.0.0.1:" + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
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

    await check("keyboard and accessible answer controls", async () => {
      await page.goto(address + A05);
      await page.locator('[data-action="start"]').focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.activeElement?.id),
        "a05-question-heading", "Focus must move to the question heading");
      const fieldset = page.locator("#a05-scale").locator("xpath=..");
      assert.match(await fieldset.locator("legend").innerText(), /どちらを重視しますか/);
      assert.match(await page.locator('[data-action="answer"][data-value="1"]').getAttribute("aria-label"), /左を強く重視/);
      assert.match(await page.locator('[data-action="answer"][data-value="4"]').getAttribute("aria-label"), /どちらも同程度/);
      assert.match(await page.locator('[data-action="answer"][data-value="7"]').getAttribute("aria-label"), /右を強く重視/);
      await page.locator('[data-action="answer"][data-value="7"]').focus();
      await page.keyboard.press("Space");
      assert.equal(await page.locator('[data-action="answer"][data-value="7"]').getAttribute("aria-pressed"), "true");
      await page.locator('[data-action="next"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.id), "a05-question-heading");
      assert.match(await page.locator("#a05-content").innerText(), /質問 2 \/ 30/);
      await page.locator('[data-view="catalog"]').first().focus();
      await page.keyboard.press("Enter");
      assert.match(await page.locator("#a05-content h2").innerText(), /16タイプ図鑑/);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2");
    });

    await check("D-44 progressbar and focus after dynamic rerenders", async () => {
      await page.goto(address + A05);
      await page.locator('[data-action="start"]').click();
      const progress = page.locator('[role="progressbar"][aria-label="回答の進捗"]');
      assert.equal(await progress.getAttribute("aria-valuemax"), "30");
      assert.equal(await progress.getAttribute("aria-valuenow"), "0");
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await progress.getAttribute("aria-valuenow"), "1");
      await page.locator('[data-action="answer"][data-value="4"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await progress.getAttribute("aria-valuenow"), "1",
        "Changing an existing answer must not increase count");
      await page.locator('[data-action="skip"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await progress.getAttribute("aria-valuenow"), "1",
        "Choosing unanswerable counts as answered");
      await page.locator('[data-action="skip"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await progress.getAttribute("aria-valuenow"), "0",
        "Removing an answer decreases accessible progress");

      await page.locator('[data-view="catalog"]').first().click();
      const choose = page.locator('[data-action="filter"][data-filter="G2"]');
      await choose.focus();
      await page.keyboard.press("Enter");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.filter), "G2",
        "Filter rerender must not drop keyboard focus");
      assert.equal(await choose.getAttribute("aria-pressed"), "true");
      await page.locator('[data-action="sample"]').first().click();
      await page.locator('[data-action="share"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), "share",
        "Share toggle rerender must retain keyboard focus");
      assert.equal(await page.locator('#a05-share[readonly]').count(), 1);
      assert.equal(await page.locator('[data-action="share"]').getAttribute('aria-expanded'), "true");
      assert.equal(await page.locator('[data-action="share"]').getAttribute('aria-controls'), "a05-share-panel");
      await page.keyboard.press("Enter");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), "share");
      assert.equal(await page.locator("#a05-share").count(), 0);
    });

    await check("D-45 review shows question text and jumps to first unanswered", async () => {
      await page.goto(address + A05);
      await page.locator('[data-action="start"]').click();
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.locator('[data-view="review"]').first().click();
      const review = page.locator('#a05-content');
      assert.match(await review.innerText(), /29問あります/);
      const first = review.locator('[data-action="jump"][data-index="0"]');
      assert.match(await first.innerText(), /A01/);
      assert.ok((await first.innerText()).includes(QUESTIONS[0].left));
      assert.ok((await first.innerText()).includes(QUESTIONS[0].right));
      assert.match(await first.getAttribute('aria-label'), /質問を編集/);
      assert.equal(await review.locator('[data-action="jump"][data-unanswered="true"]').count(), 29);
      assert.equal(await review.locator('[data-action="finish"]').isDisabled(), true);
      await review.locator('[data-action="next-unanswered"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.match(await page.locator('#a05-content').innerText(), /質問 2 \/ 30/);
      assert.equal(await page.evaluate(() => document.activeElement?.id),
        'a05-question-heading', 'Jumping to an unanswered question should focus the heading');
      await page.locator('[data-view="review"]').first().click();
      await page.locator('[data-action="jump"][data-index="0"]').click();
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.match(await page.locator('#a05-content').innerText(), /質問 1 \/ 30/);
      assert.equal(await page.locator('[data-action="answer"][data-value="7"]').getAttribute('aria-pressed'), 'true');
    });

    await check("D-47 number-key answers preserve selection, focus and no-consent boundary", async () => {
      await page.goto(address + A05);
      await page.locator('[data-action="start"]').click();
      assert.match(await page.locator("#a05-shortcut-hint").innerText(), /数字キー1〜7/);
      assert.match(await page.locator("fieldset").getAttribute("aria-describedby"), /a05-shortcut-hint/);
      assert.equal(await page.evaluate(() => document.activeElement?.id), "a05-question-heading");
      await page.keyboard.press("7");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.locator('[data-action="answer"][data-value="7"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.value), "7",
        "Shortcut should restore focus to selected answer");
      await page.keyboard.press("2");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.locator('[data-action="answer"][data-value="2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('[data-action="answer"][data-value="7"]').getAttribute("aria-pressed"), "false");
      assert.equal(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "1");
      await page.locator('[data-action="skip"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('#a05-content[aria-busy="false"]').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.action), "skip");
      assert.match(await page.locator("#a05-answer-status").innerText(), /判断できない/);
      await page.reload();
      await page.locator('[data-action="start"]').click();
      assert.equal(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "0",
        "Keyboard answers without storage consent must not persist after reload");
    });

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
      await waitForUICommit(page, "home");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.setting), "raw",
        "After opting in, the new raw retention checkbox should be focused");
      await page.locator('input[data-setting="raw"]').uncheck();
      await waitForUICommit(page, "home");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.setting), "raw",
        "Turning raw retention off should retain keyboard focus");
      await page.locator('input[data-setting="raw"]').check();
      await waitForUICommit(page, "home");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.setting), "raw",
        "Turning raw retention on should retain keyboard focus");
      await page.locator('[data-view="quiz"]').first().click();
      // A01, direction=1, answer 7 -> positive A.
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.locator('[data-action="next"]').click();
      // A click event can return before its async IndexedDB write commits.
      // Wait for both the updated step and aria-busy=false before reloading.
      await page.waitForFunction(() => {
        const root = document.querySelector("#a05-content");
        return root?.getAttribute("aria-busy") === "false" &&
          /質問 2 \/ 30/.test(root.innerText);
      }, null, { timeout: 10000 });
      await page.reload();
      await page.locator('[data-action="start"]').click();
      assert.match(await page.locator("#a05-progress-count").innerText(), /1問回答済み/);
      assert.match(await page.locator("#a05-question-heading").innerText(), /理想に近いのは/);
      assert.match(await page.locator("#a05-content").innerText(), /質問 2 \/ 30/,
        "The persisted draft must resume at question 2, not question 1");
    });

    await check("complete 30 and classify T16 / time", async () => {
      for (let i = 1; i < QUESTIONS.length; i++) {
        const step = await page.locator("#a05-content").innerText();
        assert.match(step, new RegExp("質問 " + (i + 1) + " / 30"),
          "Unexpected question before answering Q" + (i + 1) + ": " + step.slice(0, 150));
        const value = QUESTIONS[i].direction === 1 ? 7 : 1;
        await page.locator('[data-action="answer"][data-value="' + value + '"]').click();
        await page.locator('[data-action="next"]').click();
        await page.locator('#a05-content[aria-busy="false"]').waitFor();
      }
      assert.equal(await page.locator('[data-action="finish"]').count(), 1,
        "Expected answer review; current screen: " +
        (await page.locator("#a05-content").innerText()).slice(0, 180));
      await page.locator('[data-action="finish"]').click();
      await waitForUICommit(page, "result");
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

    await check("D-46 cancelling sensitive JSON export does not create a download", async () => {
      await page.evaluate(() => {
        window.__a05ExportPrompt = [];
        window.confirm = message => {
          window.__a05ExportPrompt.push(message);
          return false;
        };
      });
      let downloads = 0;
      const countDownload = () => { downloads++; };
      page.on("download", countDownload);
      try {
        await page.locator('[data-action="export"]').click();
        await page.locator('#a05-content[aria-busy="false"]').waitFor();
        const prompts = await page.evaluate(() => window.__a05ExportPrompt);
        assert.equal(prompts.length, 1);
        assert.match(prompts[0], /生回答/);
        assert.match(prompts[0], /旧版履歴/);
        assert.equal(downloads, 0);
      } finally {
        page.off("download", countDownload);
        await page.reload(); // restore browser-native confirm; keep IndexedDB contents
        await page.locator('[data-view="history"]').first().click();
      }
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
      await page.waitForFunction(() =>
        document.querySelector("#a05-content")?.getAttribute("aria-busy") === "false" &&
        document.querySelector("#a05-content")?.innerText.includes("生回答なし"),
        null, { timeout: 10000 });
      assert.match(await page.locator("#a05-content").innerText(), /生回答なし/);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2",
        "After removing raw answers, focus should return to the history heading");
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
      await page.waitForFunction(() =>
        document.querySelector("#a05-content")?.getAttribute("aria-busy") === "false" &&
        document.querySelector("#a05-content")?.innerText.includes("旧版 0件"),
        null, { timeout: 10000 });
      assert.match(await page.locator("#a05-content").innerText(), /旧版 0件/);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2");
      await page.locator('[data-action="delete-protected"][data-kind="quarantined"]').click();
      await page.waitForFunction(() =>
        document.querySelector("#a05-content")?.getAttribute("aria-busy") === "false" &&
        document.querySelector("#a05-content")?.innerText.includes("隔離 0件"),
        null, { timeout: 10000 });
      assert.match(await page.locator("#a05-content").innerText(), /隔離 0件/);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2");
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
      await other.locator("#a05-notice").waitFor({ state: "visible" });
      await waitForUICommit(other, "home");
      assert.match(await other.locator("#a05-notice").innerText(), /別タブ|自動上書き/);
      await other.close();
    });

    await check("explicit full deletion clears this A05 database", async () => {
      await page.locator('[data-view="history"]').first().click();
      await page.locator('[data-action="erase"]').click();
      await waitForUICommit(page, "home");
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2",
        "After full erase, focus should move to the fresh overview heading");
      await page.reload();
      assert.match(await page.locator("#a05-content").innerText(), /端末保存：無効/);
      await page.locator('[data-view="history"]').first().click();
      assert.match(await page.locator("#a05-content").innerText(), /検証済み 0件/);
    });

    await check("D-32 simulated quota failure fails closed and preserves saved draft", async () => {
      // Begin with a clean A05 DB after the explicit erase case above.
      await page.locator('[data-view="home"]').first().click();
      await page.locator('[data-action="enable"]').click();
      await waitForUICommit(page, "home");
      await page.locator('[data-action="start"]').click();
      await page.locator('[data-action="answer"][data-value="7"]').click();
      await page.waitForFunction(() =>
        document.querySelector("#a05-content")?.getAttribute("aria-busy") === "false" &&
        document.querySelector('[data-action="answer"][data-value="7"]')?.getAttribute("aria-pressed") === "true"
      );

      await page.evaluate(() => {
        const originalPut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "drafts") {
            throw new DOMException("QA injected quota failure", "QuotaExceededError");
          }
          return originalPut.apply(this, args);
        };
      });
      // This second answer must not commit, and normal writes must lock.
      await page.locator('[data-action="answer"][data-value="1"]').click();
      await waitForUICommit(page, "home");
      assert.match(await page.locator("#a05-notice").innerText(), /自動上書きは停止中/);
      assert.match(await page.locator("#a05-content").innerText(), /通常保存は停止中/);
      await page.reload(); // Restores the real prototype method and reopens IDB.
      await page.locator('[data-action="start"]').click();
      assert.equal(await page.locator('[data-action="answer"][data-value="7"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('[data-action="answer"][data-value="1"]').getAttribute("aria-pressed"), "false");
      assert.match(await page.locator("#a05-progress-count").innerText(), /1問回答済み/);
      assert.doesNotMatch(await page.locator("#a05-content").innerText(), /通常保存は停止中/);
    });

    await check("320 / 390 / 768 / 1440 responsive widths cover catalog, review and quiz", async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 860 });
        for (const view of ["catalog", "review", "quiz"]) {
          await page.locator('[data-view="' + view + '"]').first().click();
          const layout = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth
          }));
          assert.ok(layout.scroll <= layout.client + 2,
            width + "px " + view + " overflow: " + JSON.stringify(layout));
          if (view === "review") {
            const cols = await page.locator(".review-grid").first().evaluate(element =>
              getComputedStyle(element).gridTemplateColumns.split(" ").length);
            assert.equal(cols, width < 380 ? 1 : width < 700 ? 2 : 3,
              width + "px responsive review columns");
          }
        }
      }
    });

    await check("D-48 seven-answer mobile targets are at least 44px wide and tall", async () => {
      for (const width of [320, 375, 390, 400, 420, 440, 480, 768]) {
        await page.setViewportSize({ width, height: 800 });
        await page.locator('[data-view="quiz"]').first().click();
        const metrics = await page.locator("#a05-scale").evaluate(scale => {
          const buttons = [...scale.querySelectorAll("button")];
          const rects = buttons.map(button => button.getBoundingClientRect());
          return {
            boxes: rects.map(r => ({ width: r.width, height: r.height, top: Math.round(r.top) })),
            rows: new Set(rects.map(r => Math.round(r.top))).size,
            horizontalOverflow: document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 2
          };
        });
        assert.equal(metrics.boxes.length, 7);
        assert.ok(metrics.boxes.every(box => box.width >= 44 && box.height >= 44),
          width + "px target too small: " + JSON.stringify(metrics.boxes));
        assert.equal(metrics.rows, width <= 440 ? 2 : 1,
          width + "px seven-answer row grouping");
        assert.equal(metrics.horizontalOverflow, false, width + "px horizontal overflow");
      }
    });

    await check("D-29 narrow-screen zoom and touch targets", async () => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.locator('[data-view="quiz"]').first().click();
      for (const zoom of [1, 1.5, 2]) {
        await page.evaluate(n => { document.documentElement.style.fontSize = n + "px"; }, 16 * zoom);
        const box = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          width: document.documentElement.clientWidth,
          heights: [...document.querySelectorAll("#a05-scale button")].map(x => x.getBoundingClientRect().height)
        }));
        assert.ok(box.scroll <= box.width + 2, "overflow at text zoom " + zoom);
        assert.ok(box.heights.every(h => h >= 44), "small touch target at text zoom " + zoom);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    });

    await check("D-30 CSS layout zoom at 200 and 400 percent", async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.locator('[data-view="quiz"]').first().click();
      for (const factor of [2, 4]) {
        await page.evaluate(value => { document.documentElement.style.zoom = String(value); }, factor);
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          buttons: [...document.querySelectorAll("#a05-scale button")].map(b => b.getBoundingClientRect().height)
        }));
        assert.ok(metrics.scroll <= metrics.width + 2,
          "CSS zoom " + factor + " causes horizontal overflow: " + JSON.stringify(metrics));
        assert.ok(metrics.buttons.every(h => h >= 44),
          "CSS zoom " + factor + " reduces answer touch target below 44px");
      }
      await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    });

    await check("D-29 motion and contrast preferences", async () => {
      await page.emulateMedia({ reducedMotion: "reduce", contrast: "more" });
      const values = await page.evaluate(() => ({
        scroll: getComputedStyle(document.documentElement).scrollBehavior,
        border: getComputedStyle(document.documentElement).getPropertyValue("--line").trim()
      }));
      assert.equal(values.scroll, "auto");
      assert.equal(values.border, "#52657b");
      await page.emulateMedia({ reducedMotion: "no-preference", contrast: "no-preference" });
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
