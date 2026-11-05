/** A05 D95 static read-only protocol acceptance. Serve repo at 127.0.0.1:8765. */
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
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",request=>{
    if(new URL(request.url()).origin!==base)errors.push("external "+request.url());
    if(request.method()!=="GET")errors.push("unexpected method "+request.method());
   });
   const response=await page.goto(base+
    "/projects/kidp/life-design-lab/a05/cp1-domain-protocol-d95-preview.html");
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll("#domains .card").length===2);
   assert.equal(await page.locator("#probes .card").count(),9);
   assert.equal(await page.locator("#outcomes .card").count(),4);
   assert.equal(await page.locator("#gates li").count(),5);
   assert.equal(await page.locator("#case-select option").count(),8);
   assert.match(await page.locator("#status").innerText(),/領域 2／架空の反例 8/);
   assert.match(await page.locator("#status").innerText(),/決裁 5件（すべて保留）/);
   await page.locator("#case-select").selectOption("CX5");
   assert.match(await page.locator("#case-detail").innerText(),/いまの暮らしに不満/);
   assert.match(await page.locator("#case-detail").innerText(),/実測・得点化/);
   await page.locator("#case-select").selectOption("CX8");
   assert.match(await page.locator("#case-detail").innerText(),/注意が散りやす/);
   await page.locator("#case-select").selectOption("CX1");
   assert.match(await page.locator("#case-detail").innerText(),/仕事の作業過程/);
   assert.equal(await page.locator("input,textarea,button").count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
    true,"horizontal overflow "+viewport.width);
   const stored=await page.evaluate(async()=>({
    local:Object.keys(localStorage),session:Object.keys(sessionStorage),
    indexedDb:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(stored,{local:[],session:[],indexedDb:[]});
   assert.deepEqual(errors,[]);
   await page.close();
  }
  // Changing harmless whitespace preserves valid JSON but breaks the Git blob SHA.
  // The UI must reject this tampered source instead of displaying stale research guidance.
  const mutated=await browser.newPage({viewport:{width:1280,height:800}});
  await mutated.route("**/docs/A05_D90_BC_PILOT_0_2_20261105.json",async route=>{
   const original=await route.fetch();
   await route.fulfill({response:original,body:(await original.text())+" "});
  });
  await mutated.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/cp1-domain-protocol-d95-preview.html");
  await mutated.waitForFunction(()=>document.querySelector("#status").textContent.includes("資料を読み込めませんでした"));
  assert.equal(await mutated.locator("#domains .card").count(),0);
  await mutated.close();
  console.log("A05 D95 research protocol Chrome QA: 4 viewports + blob tamper rejection");
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
