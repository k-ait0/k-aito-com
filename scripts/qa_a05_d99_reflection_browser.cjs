/** A05 D99 exact-blob Chromium QA: standalone page, no network navigation. */
const {chromium}=require("playwright");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {join}=require("node:path");
const assert=require("node:assert/strict");
const html=readFileSync(join(__dirname,"../projects/kidp/life-design-lab/a05/reflection-d99.html"),"utf8");
const binary=Buffer.from(html,"utf8");
assert.equal(createHash("sha1").update("blob "+binary.length+"\0").update(binary).digest("hex"),
 "2e5dbd2de9fed346516892a5cad78310eab8f868");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [280,320,390,820,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[],requests=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>requests.push(r.url()));
   await page.setContent(html,{waitUntil:"load"});
   assert.equal(await page.locator("h1:visible").count(),1);
   assert.equal(await page.locator("main").count(),1);
   assert.equal(await page.locator("input,textarea,form").count(),0);
   await page.keyboard.press("Tab");
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains("skip-link")),true);
   await page.keyboard.press("Enter");
   assert.equal(await page.evaluate(()=>document.activeElement.id),"main-content");
   assert.equal(await page.locator("#case-picker option").count(),8);
   for(let i=0;i<8;i++){
    await page.locator("#case-picker").selectOption(String(i));
    assert.match(await page.locator("#case-name").innerText(),new RegExp("例"+(i+1)));
    assert.match(await page.locator("#case-announcement").textContent(),new RegExp("例"+(i+1)));
   }
   for(let i=2;i<=4;i++){
    await page.locator("#next").click();
    assert.match(await page.locator("#reflection-progress").innerText(),new RegExp(i+" / 4"));
    assert.equal(await page.evaluate(()=>document.activeElement.id),"reflection-title");
   }
   assert.equal(await page.locator("#next").isDisabled(),true);
   await page.locator("#restart").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/1 \/ 4/);
   await page.evaluate(()=>{window.__d99PrintCalls=0;window.print=()=>{window.__d99PrintCalls++}});
   await page.locator("#print-worksheet").click();
   assert.equal(await page.evaluate(()=>window.__d99PrintCalls),1);
   assert.equal(await page.locator("#print-worksheet-page").isVisible(),false);
   await page.emulateMedia({media:"print"});
   assert.equal(await page.locator("#print-worksheet-page").isVisible(),true);
   assert.equal(await page.locator("#print-worksheet-page h2").count(),4);
   assert.equal(await page.locator("#cases-title").isVisible(),false);
   await page.emulateMedia({media:"screen",forcedColors:"active"});
   assert.equal(await page.locator("#print-worksheet-page").isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);
   assert.deepEqual(requests,[]);
   await page.close();
   console.log("D99 Chrome injected QA "+width+"px PASS");
  }
  const noJs=await browser.newPage({javaScriptEnabled:false});
  await noJs.setContent(html);
  assert.equal(await noJs.locator("noscript").isVisible(),true);
  await noJs.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
