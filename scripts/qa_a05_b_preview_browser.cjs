/** D85 browser QA: synthetic-only B format comparison, local static server. */
const { chromium }=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [{width:320,height:760},{width:390,height:844},{width:820,height:1180},{width:1280,height:800}]){
   const page=await browser.newPage({viewport});
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",request=>{
    const url=new URL(request.url());
    if(url.origin!=="http://127.0.0.1:8765")errors.push("Unexpected network: "+url.origin);
   });
   await page.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/b-preview.html");
   await page.waitForFunction(()=>document.querySelector("#independent-result")?.textContent?.includes("7"));
   assert.equal(await page.locator("#scenario option").count(),8);
   assert.match(await page.locator("#case-heading").innerText(),/両方を強く重視/);
   assert.match(await page.locator("#bipolar-result").innerText(),/回答：4/);
   assert.match(await page.locator("#independent-result").innerText(),/自分の希望：7/);
   assert.match(await page.locator("#independent-result").innerText(),/他者への配慮：7/);
   await page.locator("#scenario").selectOption("both-low");
   assert.match(await page.locator("#bipolar-result").innerText(),/回答：4/);
   assert.match(await page.locator("#independent-result").innerText(),/自分の希望：1/);
   assert.match(await page.locator("#independent-result").innerText(),/他者への配慮：1/);
   await page.locator("#scenario").selectOption("both-middle");
   assert.match(await page.locator("#independent-result").innerText(),/自分の希望：4/);
   await page.locator("#scenario").selectOption("self-high");
   assert.match(await page.locator("#bipolar-result").innerText(),/回答：1/);
   await page.locator("#scenario").selectOption("others-high");
   assert.match(await page.locator("#bipolar-result").innerText(),/回答：7/);
   await page.locator("#scenario").selectOption("unanswerable");
   assert.match(await page.locator("#bipolar-result").innerText(),/判断不能（未回答）/);
   await page.locator("#scenario").selectOption("partial");
   assert.match(await page.locator("#independent-result").innerText(),/回答状態：partial/);
   assert.match(await page.locator("#insight").innerText(),/数値の相互変換はしていません/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"horizontal overflow "+viewport.width);
   const storage=await page.evaluate(async()=>({
    local:Object.keys(localStorage),session:Object.keys(sessionStorage),
    dbNames:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(db=>db.name):[]
   }));
   assert.deepEqual(storage,{local:[],session:[],dbNames:[]});
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log("A05 D85 B synthetic format preview Chromium checks PASS");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
