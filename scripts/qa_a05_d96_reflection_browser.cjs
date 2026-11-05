const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 try {
  for(const width of [320,390,820,1280]){
   const p=await b.newPage({viewport:{width,height:800}});
   const failures=[],host="http://127.0.0.1:8765";
   p.on("pageerror",e=>failures.push(e.message));
   p.on("request",r=>{
    if(new URL(r.url()).origin!==host||r.method()!=="GET")
     failures.push("unexpected request "+r.method()+" "+r.url());
   });
   const r=await p.goto(host+"/projects/kidp/life-design-lab/a05/reflection-d96.html");
   assert.equal(r.status(),200);
   assert.equal(await p.locator("#case-picker option").count(),8);
   assert.equal(await p.locator("input,textarea,form").count(),0);
   for(let i=0;i<8;i++){
    await p.locator("#case-picker").selectOption(String(i));
    assert.match(await p.locator("#case-name").innerText(),new RegExp("例"+(i+1)));
   }
   for(let i=2;i<=4;i++){
    await p.locator("#next").click();
    assert.match(await p.locator("#reflection-progress").innerText(),new RegExp(i+" / 4"));
   }
   assert.equal(await p.locator("#next").isDisabled(),true);
   await p.locator("#restart").click();
   assert.match(await p.locator("#reflection-progress").innerText(),/1 \/ 4/);
   await p.reload();
   assert.match(await p.locator("#case-name").innerText(),/例1/);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const storage=await p.evaluate(async()=>({
    local:Object.keys(localStorage),session:Object.keys(sessionStorage),
    idb:typeof indexedDB.databases==="function"?(await indexedDB.databases()).map(x=>x.name):[]
   }));
   assert.deepEqual(storage,{local:[],session:[],idb:[]});
   assert.deepEqual(failures,[]);
   await p.close();
  }
 }finally{await b.close()}
 console.log("A05 D96 Chromium reflection QA: four viewport PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
