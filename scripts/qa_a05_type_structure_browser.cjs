/** D86 Chrome QA. Static server at 127.0.0.1:8765. No participant inputs. */
const { chromium }=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [{width:320,height:760},{width:390,height:844},{width:820,height:1180},{width:1280,height:800}]){
   const page=await browser.newPage({viewport});
   const problems=[];
   page.on("pageerror",e=>problems.push(e.message));
   page.on("request",req=>{
    const parsed=new URL(req.url());
    if(parsed.origin!=="http://127.0.0.1:8765")problems.push("Unexpected external request: "+parsed.origin);
   });
   await page.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/type-structure-preview.html");
   await page.waitForFunction(()=>document.querySelector("#selection")?.textContent?.includes("B1"));
   assert.equal(await page.locator(".card").count(),3);
   assert.equal(await page.locator("#case option").count(),8);
   assert.match(await page.locator("#model-summary").innerText(),/16/);
   assert.match(await page.locator("#example-value").innerText(),/4/);
   assert.match(await page.locator("#withheld").innerText(),/発行しない/);
   assert.equal(await page.locator('.card[data-current="true"]').count(),1);
   assert.equal(await page.locator('.card[data-mode="B1"]').getAttribute("data-current"),"true");
   await page.locator("#mode").selectOption("B2");
   assert.match(await page.locator("#model-summary").innerText(),/8/);
   assert.match(await page.locator("#example-value").innerText(),/自分の希望7/);
   assert.match(await page.locator("#example-value").innerText(),/他者への配慮7/);
   await page.locator("#case").selectOption("both-low");
   assert.match(await page.locator("#example-value").innerText(),/自分の希望1/);
   assert.match(await page.locator("#example-value").innerText(),/他者への配慮1/);
   await page.locator("#case").selectOption("partial");
   assert.match(await page.locator("#example-value").innerText(),/回答なし/);
   await page.locator("#mode").selectOption("B3");
   assert.match(await page.locator("#model-summary").innerText(),/8/);
   assert.match(await page.locator("#example-value").innerText(),/使用しません/);
   assert.equal(await page.locator('.card[data-current="true"]').count(),1);
   assert.equal(await page.locator('.card[data-mode="B3"]').getAttribute("data-current"),"true");
   await page.locator("#mode").selectOption("B1");
   await page.locator("#case").selectOption("unanswerable");
   assert.match(await page.locator("#example-value").innerText(),/回答なし/);
   assert.match(await page.locator("#withheld").innerText(),/分類状態：保留/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow at "+viewport.width);
   const stored=await page.evaluate(async()=>({
    local:Object.keys(localStorage),
    session:Object.keys(sessionStorage),
    dbs:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(stored,{local:[],session:[],dbs:[]});
   assert.deepEqual(problems,[]);
   await page.close();
  }
  console.log("A05 D86 type structure Chrome comparison PASS");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
