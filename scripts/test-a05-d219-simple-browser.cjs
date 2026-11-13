#!/usr/bin/env node
"use strict";
/** D219 nonproduction 30-question diagnosis UX acceptance test. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const local=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d219-simple-diagnosis.html")).href;
const screenshotDir=path.resolve(__dirname,"../qa-screenshots");
async function fill30(page,value){
 for(let i=0;i<30;i++){
  assert.equal(await page.locator("#question").isVisible(),true);
  assert.equal((await page.locator("#counter").textContent()).trim(),(i+1)+" / 30");
  if(value===null){
   await page.locator("#skip").click();
  }else{
   await page.locator('#scale button[data-value="'+value+'"]').click();
   assert.equal(await page.locator("#next").isEnabled(),true);
   await page.locator("#next").click();
  }
 }
 assert.equal(await page.locator("#result").isVisible(),true);
 assert.equal(await page.locator("#question").isVisible(),false);
 assert.equal(await page.locator("#axes .axisrow").count(),4);
}
(async()=>{
 fs.mkdirSync(screenshotDir,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,390]){
   const ctx=await browser.newContext({viewport:{width,height:852}});
   const page=await ctx.newPage(),requests=[],exceptions=[];
   page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))requests.push(r.url());});
   page.on("pageerror",e=>exceptions.push(e.message));
   await page.goto(local);
   assert.equal(await page.title(),"A05｜かんたん価値観診断（試作）");
   assert.equal(await page.locator("#intro").isVisible(),true);
   assert.equal(await page.locator("#question").isVisible(),false);
   assert.match(await page.locator("body").textContent(),/心理検査/);
   await page.locator("#start").click();
   assert.equal(await page.locator("#next").isDisabled(),true);
   await page.locator('#scale button[data-value="7"]').click();
   assert.equal(await page.locator("#next").isEnabled(),true);
   await page.locator("#next").click();
   assert.equal(await page.locator("#counter").textContent(),"2 / 30");
   await page.locator("#prev").click();
   assert.equal(await page.locator("#counter").textContent(),"1 / 30");
   assert.equal(await page.locator('#scale button[data-value="7"]').getAttribute("aria-pressed"),"true");
   await page.locator("#next").click();
   // Correct first-answer state and move through remaining 29 questions.
   for(let i=1;i<30;i++){
    await page.locator('#scale button[data-value="7"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal((await page.locator("#typeName").textContent()).trim(),"情熱を分かち合う人");
   assert.match(await page.locator("#typeBadge").textContent(),/T16/);
   assert.match(await page.locator("#resultNotice").textContent(),/E軸/);
   assert.equal(await page.locator("#axes .axisrow").count(),4);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
   await page.screenshot({path:path.join(screenshotDir,"a05-d219-"+width+"px.png"),fullPage:true});
   await page.locator("#restart").click();
   await fill30(page,1);
   assert.equal((await page.locator("#typeName").textContent()).trim(),"着実な開拓者");
   assert.match(await page.locator("#typeBadge").textContent(),/T01/);
   await page.locator("#restart").click();
   await fill30(page,4);
   assert.equal((await page.locator("#typeName").textContent()).trim(),"価値観が拮抗しています");
   assert.match(await page.locator("#typeBadge").textContent(),/判定を保留/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
   assert.deepEqual(requests,[],"No data sent over network");
   assert.deepEqual(exceptions,[],"No client JS error");
   console.log("D219 PASS",width,"mobile/demo 30 Q/T01 T16/tie withheld/edge/back/zero network");
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error("D219 FAIL",e);process.exitCode=1;});
