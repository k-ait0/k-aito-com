/** D83 non-collecting editorial preview Chromium checks. Local static server on :8765. */
const { chromium }=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [{width:320,height:760},{width:390,height:844},{width:820,height:1180},{width:1280,height:800}]){
   const page=await browser.newPage({viewport});
   const problems=[];
   page.on("pageerror",e=>problems.push(e.message));
   page.on("request",r=>{
    const u=new URL(r.url());
    if(u.origin!=="http://127.0.0.1:8765")problems.push("External request: "+u.origin);
   });
   await page.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/editorial-preview.html");
   await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("A01"));
   assert.equal(await page.locator(".variant").count(),3);
   assert.match(await page.locator("#count").innerText(),/1 \/ 6/);
   assert.match(await page.locator("#cards").innerText(),/R：人生選択/);
   assert.match(await page.locator("#original").innerText(),/現行の参照文面/);
   await page.locator("#axis").selectOption("B");
   assert.match(await page.locator("#status").innerText(),/B01/);
   await page.locator("#block-only").check();
   assert.match(await page.locator("#status").innerText(),/B02.*BLOCK/);
   assert.equal(await page.locator("#item option").count(),1);
   await page.locator("#block-only").uncheck();
   await page.locator("#item").selectOption("B05");
   assert.match(await page.locator("#status").innerText(),/B05.*REVISE/);
   await page.locator("#overlap").selectOption("B02");
   await page.locator("#jump-overlap").click();
   assert.match(await page.locator("#status").innerText(),/B02.*BLOCK/);
   assert.equal(await page.locator("#item").inputValue(),"B02");
   assert.equal(await page.locator("#item").evaluate(el=>document.activeElement===el),true);
   await page.locator("#axis").selectOption("A");
   await page.locator("#item").selectOption("A04");
   assert.match(await page.locator("#cards").innerText(),/今の住まい方/);
   await page.locator("#block-only").check();
   assert.equal(await page.locator("#item option").count(),2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"horizontal overflow "+viewport.width);
   const stored=await page.evaluate(async()=>{
    const dbs=typeof indexedDB.databases==="function"?await indexedDB.databases():[];
    return {local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:dbs.map(x=>x.name)};
   });
   assert.deepEqual(stored,{local:[],session:[],databases:[]});
   assert.deepEqual(problems,[]);
   await page.close();
  }
  console.log("A05 D83 editorial preview responsive/interaction checks PASS");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
