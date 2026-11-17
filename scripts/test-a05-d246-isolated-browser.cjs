#!/usr/bin/env node
"use strict";
/** D246 research-only isolated preview browser verification. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const local=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d246-isolated-midpoint-yn-preview.html")).href;
async function fill30(page,chooser){
 const n={A:0,B:0,C:0,D:0,E:0};
 for(let i=0;i<30;i++){
  assert.equal(await page.locator("#question").isVisible(),true);
  const axis=(await page.locator("#axisLabel").textContent()).trim()[0];
  const response=chooser(axis,n[axis]++);
  if(response===null)await page.locator("#skip").click();
  else{
   await page.locator('#scale button[data-value="'+response+'"]').click();
   await page.locator("#next").click();
  }
 }
 assert.equal(await page.locator("#result").isVisible(),true);
 assert.equal(await page.locator("#axes .axisrow").count(),4);
}
async function ynAnswer(page,choice,reason){
 assert.equal(await page.locator("#yn").isVisible(),true);
 if(reason)await page.locator("#ynReason").selectOption(reason);
 await page.locator("#ynChoices button").filter({hasText:choice}).click();
 assert.equal(await page.locator("#ynNext").isEnabled(),true);
 await page.locator("#ynNext").click();
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,390]){
   const ctx=await browser.newContext({viewport:{width,height:852}});
   const page=await ctx.newPage(),errors=[],requests=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))requests.push(r.url());});
   await page.goto(local);
   assert.match(await page.title(),/中間回答とY\/N/);
   const data=JSON.parse(await page.locator("#data").textContent());
   assert.equal(data.ynVersion,"A05-D246-ISOLATED-Y-N-PREVIEW-1");
   assert.equal(data.scoringVersion,"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1");
   assert.equal(data.ynProbes.policy.maxIndependentYNPerSession,8);
   assert.equal(data.manifests.length,128);
   await page.locator("#start").click();

   // Case I: B has 5 midpoint responses and 2 strong responses;
   // all other axes are clear. Two candidate types, optional Y/N.
   await fill30(page,(axis,i)=>axis==="B"&&i<5?4:7);
   assert.match(await page.locator("#typeBadge").textContent(),/2タイプが参考候補/);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   assert.equal(await page.locator("#extraButton").count(),0);
   assert.match(await page.locator("#post30Note").textContent(),/Y\/N形式のみ/);
   const badgeBefore=await page.locator("#typeBadge").textContent();
   await page.locator("#ynButton").click();
   assert.match(await page.locator("#ynHeading").textContent(),/B軸/);
   assert.equal(await page.locator("#ynNext").isDisabled(),true);
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#ynPrev").isEnabled(),true);
   // Go back to first item and confirm answer is preserved.
   await page.locator("#ynPrev").click();
   assert.equal(await page.locator("#ynChoices button").filter({hasText:"YES"}).getAttribute("aria-pressed"),"true");
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#typeBadge").textContent(),badgeBefore);
   assert.match(await page.locator("#ynSummary").textContent(),/B軸：両方を重視/);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#resultNotice").textContent(),/1.5乗/);

   // Case II: 3 midpoint + 2 skipped in B. Same 5-of-7
   // combined trigger; skipped and 4 are distinct.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis!=="B"?7:i<3?4:i<5?null:7);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   assert.match(await page.locator("#axes").textContent(),/4・スキップ以外の回答が4問未満/);
   const bBadge=await page.locator("#typeBadge").textContent();
   await page.locator("#ynButton").click();
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#typeBadge").textContent(),bBadge);
   assert.equal(await page.locator("#ynButton").isVisible(),true);

   // Case III: 4 midpoints and three signed answers => held,
   // but the *five* threshold does not trigger Y/N.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis==="B"&&i<4?4:7);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#typeBadge").textContent(),/2タイプが参考候補/);

   // Case IV: all 4 => 16 candidates, 8 independent questions
   // across A/B/C/D, never more and never a scored type.
   await page.locator("#restart").click();
   await fill30(page,()=>4);
   const tie=await page.locator("#typeBadge").textContent();
   assert.match(tie,/16候補/);
   await page.locator("#ynButton").click();
   for(let i=0;i<8;i++){
    assert.equal(await page.locator("#yn").isVisible(),true);
    assert.ok(i===0||(await page.locator("#ynCounter").textContent()).includes("/ 8"));
    await page.locator("#ynChoices button").filter({hasText:i%2?"NO":"YES"}).click();
    await page.locator("#ynNext").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#typeBadge").textContent(),tie);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#ynSummary").textContent(),/D軸/);

   // Case V: one UNSURE on B leads to 2 contextual questions.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis==="B"&&i<5?4:7);
   await page.locator("#ynButton").click();
   await page.locator("#ynChoices button").filter({hasText:"判断できない"}).click();
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.match(await page.locator("#ynStage").textContent(),/具体的な場面/);
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   await page.locator("#ynButton").click();
   assert.match(await page.locator("#ynStage").textContent(),/具体的な場面/);
   await page.locator("#ynChoices button").filter({hasText:"NO"}).click();
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#ynSummary").textContent(),/未確定/);

   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
   // Case VI: all 30 skipped; the only post-30 question format is Y/N.
   await page.locator("#restart").click();
   await fill30(page,()=>null);
   assert.match(await page.locator("#typeBadge").textContent(),/16候補/);
   assert.equal(await page.locator("#extraButton").count(),0);
   assert.match(await page.locator("#post30Note").textContent(),/Y\/N形式のみ/);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   await page.locator("#ynButton").click();
   assert.equal(await page.locator("#question").isVisible(),false);
   assert.equal(await page.locator("#ynChoices button").count(),3);
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);

   assert.deepEqual(requests,[],"No network requests");
   assert.deepEqual(errors,[],"No browser JS errors");
   console.log("D246_ISOLATED_BROWSER_PASS "+JSON.stringify({width,forms:128,scoring:"p1.5",cases:6,post30OnlyYN:true,noNetwork:true}));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error("D246_ISOLATED_BROWSER_FAIL",error);process.exitCode=1;});
