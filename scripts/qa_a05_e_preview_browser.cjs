/** D68 research-only E-preview Chromium checks; run against local static server. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1280,height:800}]){
   const page=await browser.newPage({viewport});
   const failures=[];
   page.on("pageerror",e=>failures.push(e.message));
   await page.goto("http://127.0.0.1:8765/projects/kidp/life-design-lab/a05/e-preview.html");
   await page.locator("#result").getByText("追加の希望（比較回答）").waitFor();
   assert.equal(await page.locator("#relative-group").isVisible(),true);
   await page.locator("#mode").selectOption("independent");
   assert.equal(await page.locator("#independent-group").isVisible(),true);
   await page.locator("#money").fill("7");
   await page.locator("#time").fill("7");
   assert.match(await page.locator("#result").innerText(),/金銭面： 7/);
   assert.match(await page.locator("#result").innerText(),/時間面： 7/);
   await page.locator("#mode").selectOption("omitted");
   assert.match(await page.locator("#result").innerText(),/分類しません/);
   assert.equal(await page.locator("#relative-group").isVisible(),false);
   assert.equal(await page.locator("#independent-group").isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"horizontal overflow");
   assert.deepEqual(failures,[]);
   await page.close();
  }
  console.log("A05 D68 E-preview Chromium viewport/interaction checks PASS");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
