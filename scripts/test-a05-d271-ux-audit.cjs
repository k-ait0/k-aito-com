#!/usr/bin/env node
"use strict";
/**
 * A05 D271: automated UX + WCAG A/AA screen audit of unmodified Ver.2.2.
 * Findings are recorded rather than automatically declaring human acceptance.
 * Browser engines: Chromium and Playwright WebKit (not physical iOS Safari).
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium,webkit}=require("playwright");
const axe=require("axe-core");
const url=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d262-result-v22-preview.html")).href;
const layouts=[
 {width:1280,height:800,deviceScaleFactor:1},
 {width:320,height:568,deviceScaleFactor:2},
 {width:375,height:667,deviceScaleFactor:2},
 {width:390,height:844,deviceScaleFactor:3},
 {width:430,height:932,deviceScaleFactor:3},
 {width:667,height:375,deviceScaleFactor:2}
];
const engines=process.env.A05_D271_ENGINE==="chromium"?[["chromium",chromium]]:
 process.env.A05_D271_ENGINE==="webkit"?[["webkit",webkit]]:
 [["chromium",chromium],["webkit",webkit]];
function compress(v){return v.map(x=>({id:x.id,impact:x.impact,
  nodes:x.nodes.length,
  targets:x.nodes.slice(0,3).map(n=>n.target.join(" "))}));}
async function auditAxe(page,screen){
 await page.addScriptTag({content:axe.source});
 const result=await page.evaluate(async()=>{
  const tag=["wcag2a","wcag2aa","wcag21a","wcag21aa"];
  return await window.axe.run(document,{runOnly:{type:"tag",values:tag}});
 });
 return {screen,violations:compress(result.violations)};
}
async function viewportCheck(page){
 return page.evaluate(()=>({
  viewport:innerWidth+"x"+innerHeight,
  horizontal:document.documentElement.scrollWidth-innerWidth,
  mode:document.body.dataset.screen,
  fallback:document.body.classList.contains("mobile-safe-scroll"),
  screenOverflow:document.documentElement.scrollHeight-innerHeight,
  controls:[...document.querySelectorAll(
   document.body.dataset.screen==="question"?
     "#scale button,#skipUnknown,#skipNA,#next,#prev":
     document.body.dataset.screen==="yn"?
     "#ynChoices button,#ynStop,#ynNext,#ynPrev":
     document.body.dataset.screen==="result"?
     "#resultTabType,#resultTabAxes,#resultTabNotes,#restart,#ynButton":
     "#start"
  )].filter(el=>el.getBoundingClientRect().height>0).map(el=>{
   const r=el.getBoundingClientRect();
   return {id:el.id||el.textContent.trim().slice(0,8),
    width:r.width,height:r.height,
    horizontallyOut:r.left<0||r.right>innerWidth+1,
    verticallyOut:r.top<0||r.bottom>innerHeight+1};
  })
 }));
}
async function answer30(page,chooser){
 const tally={A:0,B:0,C:0,D:0,E:0};
 for(let i=0;i<30;i++){
  assert.equal(await page.locator("#question").isVisible(),true);
  const axis=(await page.locator("#axisLabel").textContent()).trim()[0];
  const ans=chooser(axis,tally[axis]++,i);
  if(ans==="UNKNOWN")await page.locator("#skipUnknown").click();
  else if(ans==="NOT_APPLICABLE")await page.locator("#skipNA").click();
  else{
   await page.locator('#scale button[data-value="'+ans+'"]').click();
   await page.locator("#next").click();
  }
 }
 assert.equal(await page.locator("#result").isVisible(),true);
}
async function main(){
 const report=[];
 for(const [engineName,engine] of engines){
  const browser=await engine.launch({headless:true,...(engineName==="chromium"&&process.env.A05_CHROME_PATH?
   {executablePath:process.env.A05_CHROME_PATH}:{})});
  try{
   for(const viewport of layouts){
    const context=await browser.newContext({viewport,isMobile:viewport.width<=430,
     hasTouch:viewport.width<=430});
    const page=await context.newPage();
    const external=[],errors=[];
    page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))external.push(r.url());});
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(url);
    const initial=await auditAxe(page,"intro");
    const input=await viewportCheck(page);
    await page.locator("#start").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#question").isVisible(),true);
    const questionStart=await viewportCheck(page);
    const question=await auditAxe(page,"question");
    const focusAfterStart=await page.evaluate(()=>({
     id:document.activeElement?.id||"",
     hidden:document.activeElement?.closest("[hidden]")!==null
    }));
    assert.equal(await page.locator("#next").isDisabled(),true);
    await page.locator("#skipUnknown").click();
    await page.locator("#skipNA").click();
    await page.locator("#prev").click();
    assert.equal(await page.locator("#skipNA").getAttribute("aria-pressed"),"true");
    await page.locator("#prev").click();
    assert.equal(await page.locator("#skipUnknown").getAttribute("aria-pressed"),"true");
    await page.locator("#next").click();
    await page.locator("#next").click();
    for(let i=2;i<30;i++){
     await page.locator('#scale button[data-value="4"]').click();
     await page.locator("#next").click();
    }
    assert.equal(await page.locator("#result").isVisible(),true);
    assert.match(await page.locator("#resultComplete").textContent(),
     /判断できない1問／当てはまらない1問/);
    const result=await auditAxe(page,"result");
    const resultView=await viewportCheck(page);
    await page.locator("#resultTabType").focus();
    await page.keyboard.press("ArrowRight");
    const tabArrowMoves=await page.locator("#resultTabAxes").getAttribute("aria-selected")==="true";
    await page.locator("#resultTabAxes").click();
    assert.equal(await page.locator("#resultPanelAxes").isVisible(),true);
    for(const axis of ["A","B","C","D"]){
     assert.equal(await page.locator('.axisrow[data-axis="'+axis+'"]').count(),1);
    }
    await page.locator("#resultTabNotes").click();
    assert.match(await page.locator("#resultNotice").textContent(),/未検証/);
    await page.locator("#restart").click();
    await answer30(page,()=>4);
    assert.equal(await page.locator("#ynButton").isVisible(),true);
    await page.locator("#ynButton").click();
    const yn=await auditAxe(page,"yn");
    const ynView=await viewportCheck(page);
    assert.equal(await page.locator("#ynNext").isDisabled(),true);
    await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
    await page.locator("#ynNext").click();
    await page.locator("#ynPrev").click();
    assert.equal(await page.locator("#ynChoices button").filter({hasText:"YES"})
      .getAttribute("aria-pressed"),"true");
    await page.locator("#ynNext").click();
    for(let i=1;i<8;i++){
     await page.locator("#ynChoices button").filter({hasText:i%2?"NO":"YES"}).click();
     await page.locator("#ynNext").click();
    }
    assert.equal(await page.locator("#result").isVisible(),true);
    assert.equal(await page.locator("#ynButton").isVisible(),false);
    assert.match(await page.locator("#typeEvidenceSummary").textContent(),/Y\/N暫定補完 4軸/);
    // Dynamic state reset (restarts must clear previous Y/N answers).
    await page.locator("#restart").click();
    assert.equal(await page.locator("#question").isVisible(),true);
    assert.equal(await page.locator("#next").isDisabled(),true);
    assert.equal(await page.locator("#skipUnknown").getAttribute("aria-pressed"),"false");
    assert.deepEqual(external,[],"No external communication from Ver.2.2");
    assert.deepEqual(errors,[],"No JS runtime errors");
    const allAxe=[initial,question,result,yn];
    const issues=allAxe.flatMap(s=>s.violations.map(x=>({...x,screen:s.screen})));
    const row={engine:engineName,viewport:viewport.width+"x"+viewport.height,
     severe:issues.filter(x=>["critical","serious"].includes(x.impact)),
     other:issues.filter(x=>!["critical","serious"].includes(x.impact)),
     keyboard:{focusAfterStart,tabArrowMoves},
     layout:{intro:input,question:questionStart,result:resultView,yn:ynView}};
    report.push(row);
    console.log("A05_D271_UX_AUDIT_CASE "+JSON.stringify({
     engine:row.engine,viewport:row.viewport,
     violations:issues.length,
     serious:row.severe.length,tabArrowMoves,
     questionFallback:questionStart.fallback,ynFallback:ynView.fallback,
     horizontal:[input,questionStart,resultView,ynView].map(x=>x.horizontal),
     network:external.length
    }));
    await context.close();
   }
  }finally{await browser.close();}
 }
 const unique=new Map();
 for(const r of report)for(const v of [...r.severe,...r.other]){
  const k=v.id+"/"+v.screen;
  if(!unique.has(k))unique.set(k,{rule:v.id,impact:v.impact,screen:v.screen,examples:[]});
  const a=unique.get(k);
  if(a.examples.length<3)a.examples.push({engine:r.engine,viewport:r.viewport,targets:v.targets});
 }
 console.log("A05_D271_UX_AUDIT_SUMMARY "+JSON.stringify({
  browsers:engines.map(x=>x[0]),runs:report.length,
  axeIssues:[...unique.values()],
  tabArrowPass:report.filter(r=>r.keyboard.tabArrowMoves).length,
  visibleFocusAfterStart:report.filter(r=>!r.keyboard.focusAfterStart.hidden).length,
  layoutHorizontalOverflow:report.filter(r=>Object.values(r.layout).some(x=>x.horizontal>2)).length,
  noRealResponses:true,noNetwork:true,realIOSDeviceTested:false
 }));
 // D271 is a defect-finding gate, not a claim that existing Ver.2.2 is accepted.
 // Separate final release gate only becomes green when fixes are verified.
}
main().catch(e=>{console.error("A05_D271_UX_AUDIT_FAILED",e);process.exitCode=1;});
