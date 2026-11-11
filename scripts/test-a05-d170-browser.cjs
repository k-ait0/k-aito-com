#!/usr/bin/env node
/**
 * A05 D-170 offline research review: browser QA.
 * Run with Playwright available via NODE_PATH, e.g.
 * NODE_PATH=/tmp/a05qa/node_modules node scripts/test-a05-d170-browser.cjs
 * No network calls are made by the test application.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const htmlPath = path.resolve(__dirname, "../research/a05/d170-eleven-hypotheses-offline-cognitive-review.html");
const screenshotDir = path.resolve(__dirname, "../qa-screenshots");
const schema = "A05-D170-COGNITIVE-REVIEW-NOTES-0.1";
const noteText = "回答理由：費用ではなく、選択の主体を重視";
const assertVisible = async (page, visible, label) => {
  const count = await page.locator(".question-card:visible").count();
  assert.equal(count, visible, label);
};
(async () => {
  assert.ok(fs.existsSync(htmlPath), "Offline HTML must exist");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, acceptDownloads: true });
      const page = await context.newPage();
      const outbound = [], errors = [];
      page.on("request", req => {
        if (!req.url().startsWith("file:") && !req.url().startsWith("data:")) outbound.push(req.url());
      });
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(pathToFileURL(htmlPath).href);
      assert.equal(await page.title(), "A05 D-170｜11観察仮説・認知面接レビュー（オフライン）");
      assert.equal(await page.locator(".question-card").count(), 11, "All 11 cases present");
      await assertVisible(page, 11, "Initially all cases displayed");
      assert.equal(await page.locator(".question-card[data-axis='A']").count(), 2);
      assert.equal(await page.locator(".question-card[data-axis='B']").count(), 3);
      assert.equal(await page.locator(".question-card[data-axis='C']").count(), 3);
      assert.equal(await page.locator(".question-card[data-axis='D']").count(), 3);
      await page.locator("#axisFilter").selectOption("B");
      await assertVisible(page, 3, "Only B cases visible when filtered");
      assert.equal(await page.locator("#count").textContent(), "3件を表示");
      await page.locator("#axisFilter").selectOption("ALL");
      await assertVisible(page, 11, "All cases return after filter");
      const caseB = page.locator(".question-card[data-id='B-G1']");
      await caseB.locator("select[data-field='independent_1']").selectOption("7");
      await caseB.locator("select[data-field='independent_2']").selectOption("6");
      await caseB.locator("textarea[data-field='observation']").fill(noteText);
      await caseB.locator("select[data-field='verdict']").selectOption("not_bipolar").catch(async ()=>{
        await caseB.locator("select[data-field='verdict']").selectOption("context_only");
      });
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#export").click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "a05-d170-review-notes.json");
      const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
      assert.equal(exported.schema, schema);
      assert.equal(exported.answers.length, 11);
      assert.equal(new Set(exported.answers.map(x => x.case_id)).size, 11);
      const savedB = exported.answers.find(x => x.case_id === "B-G1");
      assert.equal(savedB.inputs.independent_1, "7");
      assert.equal(savedB.inputs.independent_2, "6");
      assert.equal(savedB.inputs.observation, noteText);
      // Negative test: importing wrong schema must not modify the current entries.
      await page.locator("#importFile").setInputFiles({
        name: "invalid.json", mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ schema:"invalid", answers:[] }))
      });
      await page.waitForFunction(() => document.querySelector("#ioStatus").textContent.includes("読み込み失敗"));
      assert.equal(await caseB.locator("textarea[data-field='observation']").inputValue(), noteText);
      // Reset and restore using an anonymous, validated, manually saved export.
      page.once("dialog", d => d.accept());
      await page.locator("#reset").click();
      assert.equal(await caseB.locator("textarea[data-field='observation']").inputValue(), "");
      await page.locator("#importFile").setInputFiles({
        name: "notes.json", mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(exported))
      });
      await page.waitForFunction(() => document.querySelector("#ioStatus").textContent.includes("11件の記録を読み込みました"));
      assert.equal(await caseB.locator("textarea[data-field='observation']").inputValue(), noteText);
      assert.equal(await caseB.locator("select[data-field='independent_1']").inputValue(), "7");
      assert.equal(await caseB.locator("select[data-field='independent_2']").inputValue(), "6");
      // The survey must remain a data-free and tracking-free offline tool.
      assert.deepEqual(outbound, [], "No external network requests");
      assert.deepEqual(errors, [], "No page runtime exceptions");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      assert.equal(overflow, false, "No horizontal overflow at " + viewport.width);
      fs.mkdirSync(screenshotDir, { recursive:true });
      await page.screenshot({
        path:path.join(screenshotDir, "a05-d170-" + viewport.width + "px.png"),
        fullPage:false
      });
      console.log("D170 PASS", viewport.width, "cards=11 filter/export/import/reset/privacy/layout");
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error("D170 FAIL", err); process.exitCode = 1; });
