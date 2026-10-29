/**
 * C03 independent local-Chromium acceptance for 136-pair editorial preview.
 * Run from repo root after starting a STATIC server at 127.0.0.1:8765:
 *   python3 -m http.server 8765 --bind 127.0.0.1
 *   node scripts/qa_a05_compatibility_editorial_browser.cjs
 * No CI workflow, external requests, real user data, or publication.
 */
const { chromium }=require("playwright");
const assert=require("node:assert/strict");
const base="http://127.0.0.1:8765";
const target=base+"/projects/kidp/life-design-lab/a05/compatibility-editorial-preview.html";
const viewports=[
 {width:320,height:760},{width:390,height:844},
 {width:820,height:1180},{width:1280,height:800}
];

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of viewports){
   const page=await browser.newPage({viewport});
   const problems=[];
   page.on("pageerror",e=>problems.push("JS: "+e.message));
   page.on("request",r=>{
    if(new URL(r.url()).origin!==base)
      problems.push("Unexpected network: "+r.url());
   });
   const response=await page.goto(target);
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelector("#pair-meta")?.textContent?.includes("T02-T11"));
   assert.equal(await page.locator("#first option").count(),16);
   assert.equal(await page.locator("#second option").count(),16);
   assert.equal(await page.locator("#nearby button").count(),16);
   assert.match(await page.locator("#pair-status").innerText(),/1軸.*3軸/);
   assert.match(await page.locator("#shared").innerText(),/B軸｜自律/);
   assert.equal(await page.locator("#different li").count(),3);
   assert.match(await page.locator("#different").innerText(),/T02「安定」／T11「変化」/);
   assert.match(await page.locator("#research-note").innerText(),/A05のタイプ/);
   assert.match(await page.locator("#story-caveat").innerText(),/B軸/);
   assert.match(await page.locator("h2").allInnerTexts().then(x=>x.join("|")),/A｜仕様事実.*B｜一般研究.*C｜編集仮説/);

   // Reverse selection must reverse displayed labels but preserve the pair ID.
   await page.locator("#first").selectOption("T11");
   await page.locator("#second").selectOption("T02");
   assert.match(await page.locator("#first-name").innerText(),/T11/);
   assert.match(await page.locator("#second-name").innerText(),/T02/);
   assert.match(await page.locator("#pair-meta").innerText(),/T02-T11/);
   assert.match(await page.locator("#different").innerText(),/T11「変化」／T02「安定」/);

   // Same-type and fully opposite corners are both discussion prompts,
   // never numerical compatibility.
   await page.locator("#first").selectOption("T01");
   await page.locator("#second").selectOption("T01");
   assert.match(await page.locator("#pair-status").innerText(),/4軸.*0軸/);
   await page.locator("#second").selectOption("T16");
   assert.match(await page.locator("#pair-status").innerText(),/0軸.*4軸/);

   // Index can navigate all 16 second-type choices without a page change.
   await page.locator("#first").selectOption("T02");
   for(let i=0;i<16;i++){
     await page.locator("#nearby button").nth(i).click();
     assert.equal(await page.locator("#second").inputValue(),"T"+String(i+1).padStart(2,"0"));
   }

   // Full 16x16 selection-space verification in one browser viewport.
   if(viewport.width===1280){
     const seen=new Set();
     for(let i=1;i<=16;i++){
       await page.locator("#first").selectOption("T"+String(i).padStart(2,"0"));
       for(let j=1;j<=16;j++){
         await page.locator("#second").selectOption("T"+String(j).padStart(2,"0"));
         const pairId=(await page.locator("#pair-meta").innerText()).match(/T\d\d-T\d\d/);
         assert.ok(pairId,"missing pair at "+i+","+j);
         seen.add(pairId[0]);
         assert.equal(await page.locator("#nearby button").count(),16);
       }
     }
     assert.equal(seen.size,136);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
     true,"horizontal overflow at "+viewport.width);
   const stored=await page.evaluate(async()=>({
     local:Object.keys(localStorage),
     session:Object.keys(sessionStorage),
     databases:typeof indexedDB.databases==="function"
       ?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(stored,{local:[],session:[],databases:[]});
   assert.deepEqual(problems,[]);
   await page.close();
  }
  console.log("A05 C03 136-pair editorial Chrome QA PASS (4 viewports; 256 selections)");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
