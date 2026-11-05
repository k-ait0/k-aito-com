/** D92 read-only preview acceptance. Start static server on 127.0.0.1:8765 first. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try {
  for(const viewport of [
   {width:320,height:760},{width:390,height:844},
   {width:820,height:1180},{width:1280,height:800}
  ]){
   const page=await browser.newPage({viewport});
   const errors=[];
   const base="http://127.0.0.1:8765";
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",req=>{
    if(new URL(req.url()).origin!==base) errors.push("unexpected external request "+req.url());
    if(req.method()!=="GET") errors.push("unexpected method "+req.method());
   });
   const response=await page.goto(base+"/projects/kidp/life-design-lab/a05/construct-choice-d92-preview.html");
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll(".card").length===8);
   assert.equal(await page.locator('.card[data-position="EDITORIAL_PREFERRED_CONDITIONAL"]').count(),2);
   assert.equal(await page.locator(".card table").count(),8);
   assert.match(await page.locator("#state").innerText(),/8件/);
   assert.match(await page.locator("#gates").innerText(),/5件すべて保留/);
   await page.locator("#scale").selectOption("B_related");
   assert.equal(await page.locator(".card:visible").count(),4);
   await page.locator("#position").selectOption("EDITORIAL_PREFERRED_CONDITIONAL");
   assert.equal(await page.locator(".card:visible").count(),1);
   assert.equal(await page.locator(".card:visible").first().getAttribute("data-option-id"),"BR1");
   await page.locator("#scale").selectOption("C_present");
   assert.equal(await page.locator(".card:visible").count(),1);
   assert.equal(await page.locator(".card:visible").first().getAttribute("data-option-id"),"CP1");
   await page.locator("#position").selectOption("NOT_SELECTED");
   assert.equal(await page.locator(".card:visible").count(),3);
   await page.locator("#position").selectOption("ALL");
   await page.locator("#scale").selectOption("ALL");
   assert.equal(await page.locator(".card:visible").count(),8);
   assert.equal(await page.locator('input,textarea').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow: "+viewport.width);
   const stored=await page.evaluate(async()=>({
     local:Object.keys(localStorage),session:Object.keys(sessionStorage),
     indexedDb:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(stored,{local:[],session:[],indexedDb:[]});
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log("A05 D92 construct-choice Chrome QA passed all 4 viewports");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
