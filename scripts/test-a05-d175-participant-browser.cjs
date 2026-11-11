#!/usr/bin/env node
"use strict";
/**
 * Tier 1 participant study, real-browser QA. No external networking in app.
 * NODE_PATH=/tmp/a05-review/node_modules node scripts/test-a05-d175-participant-browser.cjs
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const url=pathToFileURL(path.resolve(__dirname,"../research/a05/d175-tier1-participant-pilot-offline.html")).href;
const idset=["A-G2","B-G1","C-G1","D-G1"];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,390]){
   const ctx=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
   const page=await ctx.newPage(),external=[],jsErrors=[];
   page.on("request",req=>{if(!req.url().startsWith("file:")&&!req.url().startsWith("data:"))external.push(req.url());});
   page.on("pageerror",err=>jsErrors.push(err.message));
   await page.goto(url);
   assert.equal(await page.title(),"A05｜質問文の試行フォーム（研究用）");
   assert.equal(await page.locator("#survey").isVisible(),false,"Consent required before start");
   assert.equal(await page.locator("#begin").isDisabled(),true);
   if(width===390)await page.locator("#order").selectOption("probe-first");
   const expectedOrder=width===390?["probe","reference"]:["reference","probe"];
   await page.locator("#agree").check();
   await page.locator("#begin").click();
   assert.equal(await page.locator("#survey").isVisible(),true);
   assert.deepEqual(await page.locator(".case").evaluateAll(cards=>cards.map(x=>x.dataset.caseId)),idset);
   for(const id of idset){
    const c=page.locator('.case[data-case-id="'+id+'"]');
    assert.deepEqual(await c.locator(".question").evaluateAll(nodes=>nodes.map(n=>n.dataset.arm)),expectedOrder);
    await c.locator('[name="same_meaning"]').selectOption("partly");
    await c.locator('[name="comparison_note"]').fill("模擬記録。設問を比較しながら判断した。");
   }
   const a=page.locator('.case[data-case-id="A-G2"]');
   await a.locator('.question[data-arm="reference"] [name="response"]').selectOption("both");
   await a.locator('.question[data-arm="probe"] [name="response"]').selectOption("neither");
   await a.locator('.question[data-arm="probe"] [name="paraphrase"]').fill("年度の区切りと環境更新について質問している");
   await a.locator('.question[data-arm="probe"] [name="reason"]').fill("合計費用より基盤を重視した");
   const b=page.locator('.case[data-case-id="B-G1"]');
   assert.equal(await b.locator('.question[data-arm="probe"] select[name^="independent_"]').count(),2);
   await b.locator('.question[data-arm="probe"] [name="independent_1"]').selectOption("7");
   await b.locator('.question[data-arm="probe"] [name="independent_2"]').selectOption("6");
   const c=page.locator('.case[data-case-id="C-G1"]');
   await c.locator('.question[data-arm="probe"] [name="response"]').selectOption("4");
   const d=page.locator('.case[data-case-id="D-G1"]');
   await d.locator('.question[data-arm="probe"] [name="response"]').selectOption("unknown");
   const downloading=page.waitForEvent("download");
   await page.locator("#export").click();
   const downloaded=await downloading;
   assert.equal(downloaded.suggestedFilename(),"a05-tier1-participant-notes.json");
   const out=JSON.parse(fs.readFileSync(await downloaded.path(),"utf8"));
   assert.equal(out.schema,"A05-D175-TIER1-PARTICIPANT-NOTES-0.1");
   assert.equal(out.consent_confirmed,true);
   assert.equal(out.responses.length,4);
   assert.equal(out.presentation_order,width===390?"probe-first":"reference-first");
   assert.equal(out.responses.find(r=>r.case_id==="A-G2").anchor.response,"both");
   assert.equal(out.responses.find(r=>r.case_id==="A-G2").probe.response,"neither");
   assert.equal(out.responses.find(r=>r.case_id==="B-G1").probe.independent_1,"7");
   assert.equal(out.responses.find(r=>r.case_id==="B-G1").probe.independent_2,"6");
   assert.equal(out.responses.find(r=>r.case_id==="C-G1").probe.response,"4");
   assert.equal(out.responses.find(r=>r.case_id==="D-G1").probe.response,"unknown");
   assert.deepEqual(external,[],"No network connections");
   assert.deepEqual(jsErrors,[],"No JS runtime exceptions");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,"Mobile/desktop must not overflow");
   page.once("dialog",dlg=>dlg.accept());
   await page.locator("#restart").click();
   assert.equal(await page.locator("#survey").isVisible(),false);
   assert.equal(await page.locator("#begin").isDisabled(),true);
   assert.equal(await page.locator(".case").count(),0);
   const screenshotDir=path.resolve(__dirname,"../qa-screenshots");
   fs.mkdirSync(screenshotDir,{recursive:true});
   await page.locator("#agree").check();await page.locator("#begin").click();
   await page.screenshot({path:path.join(screenshotDir,"a05-d175-"+width+"px.png"),fullPage:false});
   console.log("D175 PASS",width,"consent/4-cases/order/dual-B/semantic-choices/JSON/restart/privacy");
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error("D175 FAIL",err);process.exitCode=1;});
