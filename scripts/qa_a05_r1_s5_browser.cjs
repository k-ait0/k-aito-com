/**
 * Run after: python3 -m http.server 8765 --bind 127.0.0.1
 * From repo root: node scripts/qa_a05_r1_s5_browser.cjs
 * Requires locally installed Playwright and Chromium. Do not use GitHub Actions.
 */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const origin="http://127.0.0.1:8765";
const url=origin+"/projects/kidp/life-design-lab/a05/r1-s5-preview.html";
const viewports=[320,390,768,1280];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of viewports){
   const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:"block"});
   const page=await context.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push("pageerror "+e.message));
   page.on("request",r=>{
     const u=new URL(r.url());
     if(u.origin!==origin || u.search || u.hash)errors.push("Unexpected request "+u.href);
   });
   const response=await page.goto(url);
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.documentElement.dataset.previewReady==="true");
   assert.equal(await page.locator("#first option").count(),16);
   assert.equal(await page.locator("#second option").count(),16);
   assert.match(await page.locator("#pair-meta").innerText(),/T02-T11/);
   assert.equal(await page.locator("#axis-rows tr").count(),4);
   assert.equal(await page.locator("#draft-prompts li").count(),3);
   assert.match(await page.locator("h1").innerText(),/16タイプ価値観関係マップ/);
   assert.match(await page.locator(".notice").innerText(),/未承認/);
   await page.locator("#swap").click();
   assert.equal(await page.locator("#first").inputValue(),"T11");
   assert.equal(await page.locator("#second").inputValue(),"T02");
   assert.match(await page.locator("#pair-meta").innerText(),/T02-T11/);
   await page.locator("#first").selectOption("T01");
   await page.locator("#second").selectOption("T01");
   assert.match(await page.locator("#axis-note").innerText(),/4軸の設定ラベルは同じ/);
   await page.locator("#second").selectOption("T16");
   assert.equal(await page.locator("#axis-rows .marker").allInnerTexts().then(x=>x.filter(y=>y==="相違").length),4);
   if(width===1280){
     const ids=new Set();
     for(let a=1;a<=16;a++){
       await page.locator("#first").selectOption("T"+String(a).padStart(2,"0"));
       for(let b=1;b<=16;b++){
         await page.locator("#second").selectOption("T"+String(b).padStart(2,"0"));
         const line=await page.locator("#pair-meta").innerText();
         ids.add(line.match(/T\d\d-T\d\d/)[0]);
         assert.equal(await page.locator("#axis-rows tr").count(),4);
       }
     }
     assert.equal(ids.size,136);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow "+width);
   const storage=await page.evaluate(async()=>({
     local:Object.keys(localStorage),session:Object.keys(sessionStorage),
     databases:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(storage,{local:[],session:[],databases:[]});
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log("A05 R1 S5 browser QA PASS: 4 widths and 256 ordered pair selections");
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
