/** A05 D101: exact-blob Chromium AX-tree regression, not real VoiceOver speech QA. */
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {join}=require("node:path");
const {chromium}=require("playwright");
const html=readFileSync(join(__dirname,"../projects/kidp/life-design-lab/a05/reflection-d101.html"),"utf8");
const bytes=Buffer.from(html,"utf8");
assert.equal(createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex"),
 "a20c5676e3e22a547f03141b0907e852ac2edebf");

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [280,390,820,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const pageErrors=[],network=[];
   page.on("pageerror",e=>pageErrors.push(e.message));
   page.on("request",request=>network.push(request.url()));
   await page.setContent(html,{waitUntil:"load"});
   const session=await page.context().newCDPSession(page);
   const tree=()=>session.send("Accessibility.getFullAXTree");
   const inspect=async ()=>{
    const nodes=(await tree()).nodes;
    const indexed=new Map(nodes.map(x=>[x.nodeId,x]));
    const val=x=>x?.value??"";
    const role=n=>val(n.role);
    const name=n=>val(n.name);
    const status=nodes.filter(n=>!n.ignored&&role(n)==="status");
    assert.equal(status.length,1,"one live status");
    const texts=status[0].childIds.map(id=>indexed.get(id)).filter(Boolean).map(name);
    assert.equal(texts.length,1,"one atomic live announcement");
    assert.ok(texts[0].includes("考える点："));
    assert.ok(!texts[0].includes("。。"),"double Japanese punctuation");
    assert.ok(nodes.some(n=>!n.ignored&&role(n)==="main"));
    assert.ok(nodes.some(n=>!n.ignored&&role(n)==="link"&&name(n)==="本文へ移動"));
    assert.ok(nodes.some(n=>!n.ignored&&role(n)==="combobox"&&name(n)==="例を切り替える"));
    assert.ok(nodes.some(n=>!n.ignored&&role(n)==="button"&&name(n)==="4つの問いを印刷"));
    return texts[0];
   };
   assert.ok((await inspect()).includes("例1"));
   // Check the initial keyboard tab order *before* touching the select element.
   await page.keyboard.press("Tab");
   assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains("skip-link")),true);
   await page.keyboard.press("Enter");
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"main-content");
   for(let i=0;i<8;i++){
    await page.locator("#case-picker").selectOption(String(i));
    assert.ok((await inspect()).includes("例"+(i+1)));
   }
   for(let i=2;i<=4;i++){
    await page.locator("#next").click();
    assert.ok((await page.locator("#reflection-progress").innerText()).includes(i+" / 4"));
    assert.equal(await page.evaluate(()=>document.activeElement?.id),"reflection-title");
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(pageErrors,[]);
   assert.deepEqual(network,[]);
   await session.detach();
   await page.close();
   console.log("D101 AX-tree and navigation PASS",width);
  }
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
