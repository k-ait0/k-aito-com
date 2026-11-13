#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const url=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d210-research-questionnaire.html")).href;
const screenshots=path.resolve(__dirname,"../qa-screenshots");
(async()=>{
 fs.mkdirSync(screenshots,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
   const page=await context.newPage(),external=[],errors=[];
   page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:")&&!r.url().startsWith("blob:"))external.push(r.url());});
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(url);
   assert.equal(await page.title(),"A05｜50問研究用回答フォーム（非採点）");
   assert.equal(await page.locator("#begin").isDisabled(),true);
   assert.equal(await page.locator("#survey").isVisible(),false);
   await page.locator("#agree").check();
   await page.locator("#begin").click();
   assert.equal(await page.locator("#survey").isVisible(),true);
   assert.match(await page.locator("#progress").textContent(),/1 \/ 50問/);
   for(let i=0;i<50;i++){
    if(i%8===0)await page.locator("#skip").click();
    else await page.locator('#choices button[data-choice="'+(i%7+1)+'"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#completed").isVisible(),true);
   assert.match(await page.locator("#completion").textContent(),/50\/50/);
   for(const id of ["B_AUTONOMY","B_CONNECTION","C_FUTURE","C_PRESENT"])await page.locator('#probe-'+id).selectOption("7");
   await page.locator("#notes").fill("同じ価値を両方重視する場合は、中間回答では表しきれない。");
   const ev=page.waitForEvent("download");
   await page.locator("#export").click();
   const downloaded=await ev, out=JSON.parse(fs.readFileSync(await downloaded.path(),"utf8"));
   assert.equal(out.schema,"A05-D210-RESEARCH-SESSION-1");
   assert.equal(out.mode,"full50");
   assert.equal(out.order.length,50);
   assert.equal(new Set(out.order).size,50);
   assert.equal(Object.keys(out.answers).length,50);
   assert.ok(out.bankDigest.length===64);
   assert.equal(out.probes.B_AUTONOMY,7);
   assert.equal(out.probes.B_CONNECTION,7);
   assert.equal(out.probes.C_FUTURE,7);
   assert.equal(out.probes.C_PRESENT,7);
   assert.equal(Object.hasOwn(out,"score"),false);
   assert.equal(Object.hasOwn(out,"typeId"),false);
   await page.reload();
   assert.equal(await page.locator("#intro").isVisible(),true);
   await page.locator("#importFile").setInputFiles(await downloaded.path());
   assert.equal(await page.locator("#completed").isVisible(),true);
   assert.equal(await page.locator("#probe-B_CONNECTION").inputValue(),"7");
   assert.equal(await page.locator("#notes").inputValue(),out.notes);
   page.once("dialog",d=>d.accept());
   await page.locator("#reset").click();
   await page.locator("#mode").selectOption("ux30");
   await page.locator("#agree").check();
   await page.locator("#begin").click();
   assert.match(await page.locator("#progress").textContent(),/1 \/ 30問/);
   await page.screenshot({path:path.join(screenshots,"a05-d210-"+width+"px.png"),fullPage:false});
   await page.locator("#skip").click();
   await page.locator("#next").click();
   for(let i=1;i<30;i++){
    await page.locator('#choices button[data-choice="4"]').click();
    await page.locator("#next").click();
   }
   const wait30=page.waitForEvent("download");
   await page.locator("#export").click();
   const d30=JSON.parse(fs.readFileSync(await (await wait30).path(),"utf8"));
   assert.equal(d30.mode,"ux30");
   assert.equal(d30.order.length,30);
   assert.equal(new Set(d30.order).size,30);
   assert.equal(d30.answers[d30.order[0]],null);
   assert.match(d30.manifestChecksum,/^[0-9a-f]{64}$/);
   const corrupted={...d30,answers:{...d30.answers,FAKE_ID:7}};
   await page.locator("#importFile").setInputFiles({
    name:"a05-malformed.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(corrupted))
   });
   assert.match(await page.locator("#notice").textContent(),/読込不可/);
   assert.deepEqual(errors,[],"JavaScript page error");
   assert.deepEqual(external,[],"No external requests");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"No horizontal scroll");
   console.log("D210 PASS",width,"full50/30 preview/consent/JSON export/import/probes/corruption/privacy");
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error("D210 FAIL",e);process.exitCode=1;});
