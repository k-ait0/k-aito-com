/** D90 read-only bank comparison Chrome QA. Start local static server port 8765. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({headless:true,channel:"chrome"});
  try {
    for (const viewport of [
      {width:320,height:760},{width:390,height:844},
      {width:820,height:1180},{width:1280,height:800}
    ]) {
      const page = await browser.newPage({viewport});
      const problems=[];
      const localRoot="http://127.0.0.1:8765";
      page.on("pageerror",error=>problems.push("page error: "+error.message));
      page.on("request",request=>{
        const url=new URL(request.url());
        if(url.origin!==localRoot)problems.push("external request: "+url.href);
        if(request.method()!=="GET")problems.push("write request: "+request.method());
      });
      const response=await page.goto(localRoot+
        "/projects/kidp/life-design-lab/a05/bc-pilot-d90-preview.html");
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>document.querySelectorAll(".item[data-status]").length===12);
      assert.match(await page.locator("#load-state").innerText(),/改訂6問/);
      assert.match(await page.locator("#load-state").innerText(),/据置6問/);
      assert.equal(await page.locator('[data-status="REVISED"]').count(),6);
      assert.equal(await page.locator('[data-status="UNCHANGED"]').count(),6);
      assert.equal(await page.locator(".group").count(),4);
      assert.equal(await page.locator('input[type="radio"]').count(),0);
      assert.match(await page.locator('[data-question-id="C-P03"]').innerText(),/価値を見いだす/);
      await page.locator("#filter").selectOption("REVISED");
      assert.equal(await page.locator(".item:visible").count(),6);
      assert.equal(await page.locator('[data-status="UNCHANGED"]:visible').count(),0);
      await page.locator("#filter").selectOption("UNCHANGED");
      assert.equal(await page.locator(".item:visible").count(),6);
      assert.equal(await page.locator('[data-status="REVISED"]:visible').count(),0);
      await page.locator("#filter").selectOption("ALL");
      assert.equal(await page.locator(".item:visible").count(),12);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,
        "Horizontal overflow at width "+viewport.width);
      const stored=await page.evaluate(async()=>({
        local:Object.keys(localStorage),session:Object.keys(sessionStorage),
        indexedDb:typeof indexedDB.databases==="function"?
          (await indexedDB.databases()).map(db=>db.name):[]
      }));
      assert.deepEqual(stored,{local:[],session:[],indexedDb:[]});
      assert.deepEqual(problems,[]);
      await page.close();
    }
    console.log("A05 D90 bank comparison Chrome QA: 4 viewport passes");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
