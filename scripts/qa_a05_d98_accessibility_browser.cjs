/** A05 D98: source-pinned browser-accessibility smoke test; no HTTP navigation. */
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {join}=require("node:path");
const {chromium}=require("playwright");
const src=readFileSync(join(__dirname,"../projects/kidp/life-design-lab/a05/reflection-d98.html"),"utf8");
const bytes=Buffer.from(src,"utf8");
const sha=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
assert.equal(sha,"83a45c66f1847635d00f7add38913738964f1577");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try {
  for(const width of [280,320,390,820,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[],requests=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>requests.push(r.url()));
   await page.setContent(src,{waitUntil:"load"});
   assert.equal(await page.locator("html").getAttribute("lang"),"ja");
   assert.equal(await page.locator("main").count(),1);
   assert.equal(await page.locator("h1").count(),1);
   assert.equal(await page.locator("#reflection-title").evaluate(el=>el.tagName),"H3");
   assert.equal(await page.locator("#case-picker option").count(),8);
   assert.equal(await page.locator("input,textarea,form").count(),0);
   // First keyboard stop jumps to main content.
   await page.keyboard.press("Tab");
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains("skip-link")),true);
   await page.keyboard.press("Enter");
   assert.equal(await page.evaluate(()=>document.activeElement.id),"main-content");
   for(let i=0;i<8;i++){
     await page.locator("#case-picker").selectOption(String(i));
     assert.match(await page.locator("#case-name").innerText(),new RegExp("例"+(i+1)));
     assert.match(await page.locator("#case-announcement").innerText(),new RegExp("例"+(i+1)));
   }
   for(let i=2;i<=4;i++){
     await page.locator("#next").click();
     assert.match(await page.locator("#reflection-progress").innerText(),new RegExp(i+" / 4"));
     assert.equal(await page.evaluate(()=>document.activeElement.id),"reflection-title");
   }
   assert.equal(await page.locator("#next").isDisabled(),true);
   await page.locator("#prev").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/3 \/ 4/);
   await page.locator("#restart").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/1 \/ 4/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(width===390){
     await page.emulateMedia({forcedColors:"active"});
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   }
   assert.deepEqual(errors,[]);
   assert.deepEqual(requests,[]);
   await page.close();
   console.log("A05 D98 "+width+"px: PASS");
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
