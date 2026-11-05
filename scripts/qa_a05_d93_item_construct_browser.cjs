/** D93 read-only mapping Chromium QA. Start port 8765 static server first. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [
   {width:320,height:760},{width:390,height:844},
   {width:820,height:1180},{width:1280,height:800}
  ]){
   const page=await browser.newPage({viewport});
   const errors=[],base="http://127.0.0.1:8765";
   page.on("pageerror",e=>errors.push("page: "+e.message));
   page.on("request",req=>{
    if(new URL(req.url()).origin!==base)errors.push("external: "+req.url());
    if(req.method()!=="GET")errors.push("not GET: "+req.method());
   });
   const response=await page.goto(base+
    "/projects/kidp/life-design-lab/a05/item-construct-d93-preview.html");
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll(".card").length===6);
   assert.equal(await page.locator(".card").count(),6);
   assert.equal(await page.locator(".card table").count(),6);
   assert.equal(await page.locator('[data-disposition="CONDITIONAL_TRIAL"]').count(),2);
   assert.equal(await page.locator('[data-disposition="REWRITE_BEFORE_TRIAL"]').count(),4);
   assert.match(await page.locator("#state").innerText(),/全6問/);
   assert.match(await page.locator('[data-id="C-P02"]').innerText(),/現状の充実度を外し/);
   await page.locator("#facet").selectOption("related");
   assert.equal(await page.locator(".card:visible").count(),3);
   await page.locator("#disposition").selectOption("REWRITE_BEFORE_TRIAL");
   assert.equal(await page.locator(".card:visible").count(),1);
   assert.equal(await page.locator(".card:visible").first().getAttribute("data-id"),"B-R03");
   await page.locator("#facet").selectOption("present");
   assert.equal(await page.locator(".card:visible").count(),3);
   await page.locator("#disposition").selectOption("CONDITIONAL_TRIAL");
   assert.equal(await page.locator(".card:visible").count(),0);
   await page.locator("#disposition").selectOption("ALL");
   await page.locator("#facet").selectOption("ALL");
   assert.equal(await page.locator(".card:visible").count(),6);
   assert.equal(await page.locator('input,textarea,button').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow "+viewport.width);
   const stored=await page.evaluate(async()=>({
    local:Object.keys(localStorage),session:Object.keys(sessionStorage),
    indexedDb:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(stored,{local:[],session:[],indexedDb:[]});
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log("A05 D93 editorial mapping preview Chrome QA: 4 viewport passes");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
