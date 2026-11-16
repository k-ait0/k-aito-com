"use strict";
/** A05 v37: run the actual result page at a local, ephemeral origin (never production). */
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const A05 = "/projects/kidp/life-design-lab/a05/";
const PNG = Buffer.from(
 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+mSkAAAAASUVORK5CYII=",
 "base64"
);
const MIME={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",
 ".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",
 ".svg":"image/svg+xml",".png":"image/png"};

function localServer(){
 const server=http.createServer((request,response)=>{
  let url;
  try{url=decodeURIComponent(new URL(request.url,"http://localhost").pathname);}
  catch{response.writeHead(400).end();return;}
  const absolute=path.resolve(ROOT,"."+ (url.endsWith("/")?url+"index.html":url));
  if(!absolute.startsWith(ROOT+path.sep)||!fs.existsSync(absolute)||!fs.statSync(absolute).isFile()){
   response.writeHead(404).end();return;
  }
  response.writeHead(200,{"Content-Type":MIME[path.extname(absolute)]||"application/octet-stream"});
  fs.createReadStream(absolute).pipe(response);
 });
 return new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve(server)));
}
async function openSample(page,origin,query){
 await page.goto(origin+A05+query,{waitUntil:"domcontentloaded"});
 await page.locator('[data-action="sample"][data-index="10"]').waitFor({state:"visible",timeout:20000});
 await page.locator('[data-action="sample"][data-index="10"]').click();
 await page.locator(".result-head").waitFor({state:"visible"});
}
async function main(){
 let server,browser;
 try{
  server=await localServer();
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const errors=[];
  const posts=[];
  page.on("pageerror",e=>errors.push(String(e.message)));
  page.on("request",r=>{if(r.method()!=="GET")posts.push(r.method()+" "+r.url());});
  await openSample(page,origin,"?a05_tier2_review=1");
  assert.equal(await page.locator('[data-a05-tier2-review="opt-in"]').count(),1);
  assert.equal(await page.locator('.a05-t2-fallback').count(),1);
  const headBefore=await page.locator(".result-head").innerText();
  const axesBefore=await page.locator(".value-axis").allInnerTexts();

  await page.locator('input[data-tier2-upload]').setInputFiles({
   name:"review-fixture.png",mimeType:"image/png",buffer:PNG
  });
  await page.locator('img[data-tier2-art]').waitFor({state:"attached"});
  assert.equal(await page.locator('img[data-tier2-art]').evaluate(async el=>{
   await el.decode();return el.naturalWidth;
  }),1);
  assert.match(await page.locator('.a05-t2-figure figcaption').innerText(),/世界樹/);
  await page.locator('[data-tier2-setting="worldTreeRatio"]').selectOption("portrait");
  assert.equal(await page.locator('.a05-t2-stage--natural').count(),0);
  await page.locator('[data-tier2-setting="worldTreeRatio"]').selectOption("natural");
  assert.equal(await page.locator('.a05-t2-stage--natural').count(),1);
  await page.locator('[data-tier2-setting="accent"]').selectOption("B");
  assert.equal(await page.locator(".a05-t2-stage").evaluate(el=>getComputedStyle(el).borderTopColor),"rgb(41, 182, 255)");
  await page.locator('[data-tier2-setting="eAxis"]').selectOption("time");
  assert.match(await page.locator(".a05-t2-figure figcaption").innerText(),/時間的自由/);
  await page.locator('[data-tier2-setting="guide"]').uncheck();
  assert.equal(await page.locator(".a05-t2-guide").count(),0);
  await page.locator('[data-tier2-setting="guide"]').check();
  assert.equal(await page.locator(".a05-t2-guide").count(),1);

  // The image is associated with explicit motif selection, never with T11.
  await page.locator('[data-tier2-setting="motif"]').selectOption("pegasus");
  assert.equal(await page.locator('img[data-tier2-art]').count(),0);
  await page.locator('input[data-tier2-upload]').setInputFiles({
   name:"pegasus-fixture.png",mimeType:"image/png",buffer:PNG
  });
  await page.locator('img[data-tier2-art]').waitFor({state:"attached"});
  assert.equal(await page.locator(".a05-t2-mini").count(),2);
  assert.equal(await page.locator(".a05-t2-mini--crop").count(),1);
  await page.locator('[data-tier2-setting="motif"]').selectOption("world-tree");
  assert.equal(await page.locator('img[data-tier2-art]').count(),1);

  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:860});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>
      document.documentElement.clientWidth+2);
   assert.equal(overflow,false,"result page overflow at "+width+"px");
   assert.equal(await page.locator('img[data-tier2-art]').count(),1);
  }
  assert.equal(await page.locator(".result-head").innerText(),headBefore);
  assert.deepEqual(await page.locator(".value-axis").allInnerTexts(),axesBefore);
  await page.locator('[data-action="tier2-clear"]').click();
  assert.equal(await page.locator('img[data-tier2-art]').count(),0);
  assert.equal(await page.locator('.a05-t2-fallback').count(),1);

  // A new navigation shows nothing persisted. Ordinary result does not show lab.
  await openSample(page,origin,"?a05_tier2_review=1");
  assert.equal(await page.locator('img[data-tier2-art]').count(),0);
  await openSample(page,origin,"");
  assert.equal(await page.locator('[data-a05-tier2-review="opt-in"]').count(),0);
  assert.equal(await page.locator(".a05-vp").count(),1);
  assert.deepEqual(posts,[],"the preview must never POST to the server");
  assert.deepEqual(errors,[]);
  console.log("PASS A05 v37 actual result: 4 widths, local PNG, CSS/E, fallback, no storage");
  await context.close();
 }finally{
  if(browser) await browser.close();
  if(server) await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error("FAIL A05 v37 browser:",e.stack||e);process.exitCode=1;});
