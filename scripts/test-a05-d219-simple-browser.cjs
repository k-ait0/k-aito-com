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
   const payload=JSON.parse(await page.locator("#data").textContent());
   assert.equal(payload.scoringVersion,"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1");
   assert.equal(payload.scoringPower,1.5);
   assert.match(payload.scoringValidation,/NOT_PSYCHOMETRICALLY_VALIDATED/);
   assert.equal(payload.manifests.length,128);
   for(const m of payload.manifests)
    assert.ok(m.ids.every(id=>!payload.excludedCoreScoringIds.includes(id)),"Held C item in D242 form");
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
   assert.match(await page.locator("#resultNotice").textContent(),/1.5乗/);
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

   assert.equal(await page.locator("#resultComplete").isVisible(),true);
   assert.match(await page.locator("#resultComplete").textContent(),/診断は完了/);
   assert.equal(await page.locator("#extraButton").isVisible(),true);
   assert.equal(await page.locator("#nearTypes").isVisible(),false);
   // All four axes tied: the user may opt to finish, or answer 2 + 2 optional items.
   await page.locator("#extraButton").click();
   assert.equal(await page.locator("#question").isVisible(),true);
   assert.equal(await page.locator("#counter").textContent(),"31 / 32");
   for(let i=0;i<2;i++){
    await page.locator('#scale button[data-value="4"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.match(await page.locator("#resultComplete").textContent(),/32問/);
   assert.equal(await page.locator("#extraButton").isVisible(),true);
   await page.locator("#extraButton").click();
   assert.equal(await page.locator("#counter").textContent(),"33 / 34");
   for(let i=0;i<2;i++){
    await page.locator('#scale button[data-value="4"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.match(await page.locator("#resultComplete").textContent(),/34問/);
   assert.equal(await page.locator("#extraButton").isVisible(),false);
   assert.equal(await page.locator("#axes .axisrow").count(),4);
   // Exactly one ambiguous A axis: show the two plausible types instead of forcing a restart.
   await page.locator("#restart").click();
   for(let i=0;i<30;i++){
    const isA=(await page.locator("#axisLabel").textContent()).trim()==="A軸";
    await page.locator('#scale button[data-value="'+(isA?4:7)+'"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.match(await page.locator("#typeBadge").textContent(),/2タイプが参考候補/);
   assert.equal(await page.locator("#nearTypes .near-type-item").count(),2);
   assert.equal(await page.locator("#extraButton").isVisible(),true);
   assert.match(await page.locator("#extraButton").textContent(),/A軸に2問追加/);
   assert.match(await page.locator("#resultComplete").textContent(),/診断は完了/);
   // Additional questions must come from the same axis and never count E as a classifier.
   await page.locator("#extraButton").click();
   assert.match(await page.locator("#axisLabel").textContent(),/追加質問 · A軸/);
   for(let i=0;i<2;i++){
    await page.locator('#scale button[data-value="7"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#axes .axisrow").count(),4);
   assert.match(await page.locator("#resultNotice").textContent(),/E軸/);

   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
   assert.deepEqual(requests,[],"No data sent over network");
   assert.deepEqual(exceptions,[],"No client JS error");
   console.log("D242 PASS",width,"30Q/T01/T16/tie completion/near2/optional 32-34Q/zero network");
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error("D219 FAIL",e);process.exitCode=1;});
