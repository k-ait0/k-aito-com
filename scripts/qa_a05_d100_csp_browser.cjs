/** A05 D100 CSP-protected standalone page; Chromium injection, not URL E2E. */
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {join}=require("node:path");
const {chromium}=require("playwright");
const html=readFileSync(join(__dirname,"../projects/kidp/life-design-lab/a05/reflection-d100.html"),"utf8");
const bytes=Buffer.from(html,"utf8");
assert.equal(createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex"),
 "0ed6a91d5a0dc57a74cc45569b1b5c1969b22ccb");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [280,320,390,820,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const pageErrors=[],cspViolations=[],requests=[];
   page.on("pageerror",e=>pageErrors.push(e.message));
   page.on("request",r=>requests.push(r.method()+" "+r.url()));
   page.on("console",m=>{if(m.text().includes("Content Security Policy"))cspViolations.push(m.text())});
   await page.setContent(html,{waitUntil:"load"});
   assert.equal(await page.locator("#case-picker option").count(),8);
   assert.equal(await page.locator("input,textarea,form").count(),0);
   for(let i=0;i<8;i++){
    await page.locator("#case-picker").selectOption(String(i));
    assert.match(await page.locator("#case-name").innerText(),new RegExp("例"+(i+1)));
   }
   for(let step=2;step<=4;step++){
    await page.locator("#next").click();
    assert.match(await page.locator("#reflection-progress").innerText(),new RegExp(step+" / 4"));
   }
   await page.locator("#restart").click();
   assert.match(await page.locator("#reflection-progress").innerText(),/1 \/ 4/);
   await page.emulateMedia({media:"print"});
   assert.equal(await page.locator("#print-worksheet-page").isVisible(),true);
   assert.equal(await page.locator("#print-worksheet-page h2").count(),4);
   assert.equal(await page.locator("#case-picker").isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(pageErrors,[]);
   assert.deepEqual(cspViolations,[]);
   assert.deepEqual(requests,[]);
   await page.close();
  }
  const damaged=html.replace("</script>","/* tampered */</script>");
  const page=await browser.newPage();
  const violations=[];
  page.on("console",m=>{if(m.text().includes("Content Security Policy"))violations.push(m.text())});
  await page.setContent(damaged);
  assert.equal(await page.locator("#case-text").innerText(),"","modified inline script unexpectedly ran");
  assert.ok(violations.length>=1,"tampered source should trigger CSP refusal");
  await page.close();
  console.log("A05 D100 CSP Chromium injected QA: 5 viewports and tamper rejection PASS");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
