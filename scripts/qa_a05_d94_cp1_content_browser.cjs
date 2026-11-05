/** A05 D94 read-only content-review Chrome QA. Serve repo at 127.0.0.1:8765. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [
   {width:320,height:760},{width:390,height:844},
   {width:820,height:1180},{width:1280,height:800}
  ]){
   const page=await browser.newPage({viewport});
   const problems=[],base="http://127.0.0.1:8765";
   page.on("pageerror",e=>problems.push("pageerror: "+e.message));
   page.on("request",request=>{
    if(new URL(request.url()).origin!==base)problems.push("external: "+request.url());
    if(request.method()!=="GET")problems.push("unexpected non-GET: "+request.method());
   });
   const response=await page.goto(base+
    "/projects/kidp/life-design-lab/a05/cp1-content-review-d94-preview.html");
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll("#item-cards .card").length===3);
   assert.equal(await page.locator("#pair-cards .card").count(),3);
   assert.equal(await page.locator("#option-cards .card").count(),3);
   assert.equal(await page.locator("#prompt-cards .card").count(),2);
   assert.match(await page.locator("#status").innerText(),/第三の独立領域は未確定/);
   assert.match(await page.locator("#status").innerText(),/O2/);
   assert.match(await page.locator("#option-cards").innerText(),/得点には/);
   await page.locator("#view").selectOption("pairs");
   assert.equal(await page.locator("#items").isVisible(),false);
   assert.equal(await page.locator("#pairs").isVisible(),true);
   assert.equal(await page.locator("#options").isVisible(),false);
   await page.locator("#view").selectOption("options");
   assert.equal(await page.locator("#pairs").isVisible(),false);
   assert.equal(await page.locator("#options").isVisible(),true);
   await page.locator("#view").selectOption("items");
   assert.equal(await page.locator("#items").isVisible(),true);
   assert.equal(await page.locator("#options").isVisible(),false);
   await page.locator("#view").selectOption("all");
   assert.equal(await page.locator("#items").isVisible(),true);
   assert.equal(await page.locator("#pairs").isVisible(),true);
   assert.equal(await page.locator("#options").isVisible(),true);
   assert.equal(await page.locator('input,textarea').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,
    "horizontal overflow at "+viewport.width);
   const storage=await page.evaluate(async()=>({
    local:Object.keys(localStorage),session:Object.keys(sessionStorage),
    indexedDb:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(storage,{local:[],session:[],indexedDb:[]});
   assert.deepEqual(problems,[]);
   await page.close();
  }
  console.log("A05 D94 CP1 content review Chrome QA: 4 viewport PASS");
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
