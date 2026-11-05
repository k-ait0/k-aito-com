/** A05 D97 fallback QA: real Chromium with direct HTML injection (no URL navigation). */
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const path=require("node:path");
const html=readFileSync(path.join(__dirname,"../projects/kidp/life-design-lab/a05/reflection-d96.html"),"utf8");
const bytes=Buffer.from(html,"utf8");
const sha=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
assert.equal(sha,"8f424f7ba206cab3dcd779779de5a2cf84568699",
 "D96 source changed: review before QA");
assert.doesNotMatch(html,/<input\b|<textarea\b|<form\b|<iframe\b/i);
for(const banned of ["localStorage","sessionStorage","indexedDB","sendBeacon","XMLHttpRequest","fetch("])
 assert.equal(html.includes(banned),false,banned);
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [320,390,820,1280]){
   const context=await browser.newContext({viewport:{width,height:800}});
   const page=await context.newPage();
   const errors=[],requests=[];
   page.on("pageerror",error=>errors.push(error.message));
   page.on("request",req=>requests.push(req.method()+" "+req.url()));
   await page.setContent(html,{waitUntil:"load"});
   assert.equal(await page.locator("#case-picker option").count(),8);
   assert.equal(await page.locator(".banded").count(),2);
   assert.equal(await page.locator("input,textarea,form").count(),0);
   assert.equal(await page.locator("#prev").isDisabled(),true);
   for(let i=0;i<8;i++){
    await page.locator("#case-picker").selectOption(String(i));
    assert.match(await page.locator("#case-name").innerText(),new RegExp("例"+(i+1)));
    assert.ok((await page.locator("#case-question").innerText()).length>10);
   }
   for(let step=2;step<=4;step++){
    await page.locator("#next").click();
    assert.match(await page.locator("#reflection-progress").innerText(),new RegExp(step+" / 4"));
   }
   assert.equal(await page.locator("#next").isDisabled(),true);
   await page.locator("#prev").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/3 \/ 4/);
   await page.locator("#restart").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/1 \/ 4/);
   await page.locator("#next").focus();
   await page.keyboard.press("Enter");
   assert.match(await page.locator("#reflection-progress").innerText(),/2 \/ 4/);
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"reflection-title");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,
    "horizontal overflow at "+width);
   const fresh=await context.newPage();
   await fresh.setContent(html,{waitUntil:"load"});
   assert.match(await fresh.locator("#reflection-progress").innerText(),/1 \/ 4/);
   assert.match(await fresh.locator("#case-name").innerText(),/例1/);
   assert.deepEqual(errors,[]);
   assert.deepEqual(requests,[]);
   await context.close();
   console.log("D97 injected Chrome PASS: "+width+"px, 8 cases, 4 steps, keyboard, no network");
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
