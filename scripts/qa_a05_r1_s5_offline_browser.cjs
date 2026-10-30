/**
 * A05 R1 S5 offline HTML browser check, without a server.
 *
 * From repository root:
 *   node scripts/qa_a05_r1_s5_offline_browser.cjs
 *
 * Requires local playwright + Chrome. Do not run GitHub Actions.
 * Only tests bundled editorial data, never collects personal responses.
 */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const {resolve}=require("node:path");
const {pathToFileURL}=require("node:url");

const path=resolve(__dirname,"../projects/kidp/life-design-lab/a05/r1-s5-offline.html");
const url=pathToFileURL(path).href;
const widths=[320,390,768,1280];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try {
  for(const width of widths) {
   const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:"block"});
   const page=await context.newPage();
   const failures=[];
   page.on("pageerror",error=>failures.push("JavaScript: "+error.message));
   page.on("request",request=>{
     const u=request.url();
     if(!u.startsWith("file:"))failures.push("Unexpected network request: "+u);
   });
   const navigation=await page.goto(url);
   assert.ok(navigation,"No local file response");
   await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==="true");
   assert.match(await page.locator("#offline-integrity").innerText(),/256通り／136組、編集候補112組/);
   assert.equal(await page.locator("#first option").count(),16);
   assert.equal(await page.locator("#second option").count(),16);
   assert.equal(await page.locator("#axis-rows tr").count(),4);
   assert.match(await page.locator("#pair-meta").innerText(),/T02-T11/);
   await page.locator("#swap").click();
   assert.equal(await page.locator("#first").inputValue(),"T11");
   assert.equal(await page.locator("#second").inputValue(),"T02");
   assert.match(await page.locator("#pair-meta").innerText(),/T02-T11/);
   await page.locator("#first").selectOption("T01");
   await page.locator("#second").selectOption("T01");
   assert.match(await page.locator("#axis-note").innerText(),/4軸の設定ラベルは同じ/);
   assert.equal(await page.locator("#draft-prompts li").count(),2);
   await page.locator("#second").selectOption("T16");
   assert.equal(await page.locator("#axis-rows .marker").allInnerTexts().then(x=>x.filter(y=>y==="相違").length),4);
   await page.locator("#second").selectOption("T05");
   assert.equal(await page.locator("#draft-variants").isVisible(),true);
   const v04=await page.locator("#draft-description").innerText();
   await page.locator('input[name="draft-variant"][value="v05"]').check();
   const v05=await page.locator("#draft-description").innerText();
   assert.notEqual(v04,v05);
   assert.match(v05,/地域の学習会/);
   assert.equal(await page.locator("#draft-prompts li").count(),3);
   await page.locator("#second").selectOption("T06");
   assert.equal(await page.locator("#draft-variants").isVisible(),true);
   await page.locator("#second").selectOption("T16");
   assert.equal(await page.locator("#draft-variants").isVisible(),false);
   assert.match(await page.locator("#source-status").innerText(),/v0.4/);
   if(width===1280) {
    const seen=new Set();
    for(let a=1;a<=16;a++) {
     await page.locator("#first").selectOption("T"+String(a).padStart(2,"0"));
     for(let b=1;b<=16;b++) {
      await page.locator("#second").selectOption("T"+String(b).padStart(2,"0"));
      const line=await page.locator("#pair-meta").innerText();
      const pairId=line.match(/T\d\d-T\d\d/)[0];
      seen.add(pairId);
      if(await page.locator("#draft-variants").isVisible())variantPairs.add(pairId);
      assert.equal(await page.locator("#axis-rows tr").count(),4);
     }
    }
    assert.equal(seen.size,136);
    assert.equal(variantPairs.size,112);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
     true,"Horizontal overflow at "+width);
   const persisted=await page.evaluate(async()=>{
     const safe=async(fn)=>{try{return await fn()}catch(e){if(e?.name==="SecurityError")return "INACCESSIBLE";throw e;}};
     return {
       local:await safe(()=>Object.keys(localStorage)),
       session:await safe(()=>Object.keys(sessionStorage)),
       databases:await safe(async()=>typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(d=>d.name):[])
     };
   });
   for(const [key,value] of Object.entries(persisted)) {
     assert.ok(value==="INACCESSIBLE"||(Array.isArray(value)&&value.length===0),key+" storage unexpectedly used");
   }
   assert.deepEqual(failures,[]);
   await context.close();
  }
  console.log("A05 R1 S5 offline browser QA PASS: 4 widths, 256 selections, 112 variants, no unexpected network/storage.");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
