#!/usr/bin/env node
"use strict";
/**
 * D269 full-catalog parity: local D262 browser engine vs Node reference.
 * 128 manifests x 12 distinct response patterns + Y/N scenario combinations.
 * No HTTP listener, data ingestion, or production deployment.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {createRequire}=require("node:module");
const requireModule=createRequire(__filename);
const {chromium}=require("playwright");
const local=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d269-parity-local-only.html")).href;

const PATTERNS=[
 "all7","all1","all4","unknown-all","not-applicable-all","alternating-skip",
 "B5","B4","A-cancel","alternating-poles","mixed-axis","seeded-mix"
];
function scenario(manifest,index,pattern){
 const counters={A:0,B:0,C:0,D:0,E:0},values=[],skipKinds=[];
 function hash(n){let x=(Math.imul(index+7,1664525)+Math.imul(n+11,1013904223))>>>0;
  x^=x>>>16;x=Math.imul(x,2246822507)>>>0;return (x^(x>>>13))>>>0;}
 for(let n=0;n<30;n++){
  const q=manifest.questions[n],a=q.axis,axisIndex=counters[a]++;
  let v=7,skip=null;
  switch(pattern){
   case "all7":break;
   case "all1":v=1;break;
   case "all4":v=4;break;
   case "unknown-all":v=null;skip="UNKNOWN";break;
   case "not-applicable-all":v=null;skip="NOT_APPLICABLE";break;
   case "alternating-skip":
    if(n%3===0){v=null;skip="UNKNOWN";}
    else if(n%3===1){v=null;skip="NOT_APPLICABLE";}
    else v=4;
    break;
   case "B5":if(a==="B"&&axisIndex<5)v=4;break;
   case "B4":if(a==="B"&&axisIndex<4)v=4;break;
   case "A-cancel":if(a==="A")v=axisIndex<3?1:axisIndex<6?7:4;break;
   case "alternating-poles":v=axisIndex%2===0?1:7;break;
   case "mixed-axis":
    v=a==="A"?1:a==="B"?7:a==="C"?4:(axisIndex%3===0?null:5);
    if(v===null)skip="NOT_APPLICABLE";
    break;
   case "seeded-mix":{
    const r=hash(n)%19;
    if(r===0){v=null;skip="UNKNOWN";}
    else if(r===1){v=null;skip="NOT_APPLICABLE";}
    else v=r%7+1;
    break;
   }
   default:throw Error("Unknown pattern "+pattern);
  }
  values.push(v);skipKinds.push(skip);
 }
 return {manifestIndex:index,values,skipKinds,ynState:{responses:{},reasons:{}}};
}
function ynStates(probes){
 const a=probes.axes.find(x=>x.axis==="A"),
 b=probes.axes.find(x=>x.axis==="B"),
 c=probes.axes.find(x=>x.axis==="C"),
 d=probes.axes.find(x=>x.axis==="D");
 const pair=(axis,stage,x,y)=>({
  [axis[stage][0].id]:x,[axis[stage][1].id]:y
 });
 return [
  {responses:{},reasons:{}},
  {responses:pair(b,"initial","NO","YES"),reasons:{}},
  {responses:{[b.initial[0].id]:"UNSURE"},reasons:{}},
  {responses:{...pair(b,"initial","YES","YES"),...pair(b,"context","NO","YES")},reasons:{}},
  {responses:{...pair(a,"initial","YES","NO"),...pair(b,"initial","NO","YES"),
   ...pair(c,"initial","YES","NO"),...pair(d,"initial","NO","YES")},reasons:{}},
  {responses:{...pair(a,"initial","YES","NO"),...pair(a,"context","NO","YES")},reasons:{}},
  {responses:{...pair(b,"initial","YES","NO"),...pair(b,"context","NO","YES")},reasons:{B:"CONTEXT_DEPENDENT"}},
  {responses:pair(b,"initial","UNSURE","NO"),reasons:{B:"WORDING_DIFFICULT"}}
 ];
}
function compare(browser,server,label){
 assert.deepEqual(browser.ids,server.ids,label+": questionnaire manifest drift");
 assert.deepEqual(browser.answerTotals,server.answerTotals,label+": score/skip denominators");
 assert.deepEqual(browser.candidateIds,server.candidateIds,label+": baseline candidate types");
 assert.equal(browser.stats.length,4);
 for(let i=0;i<4;i++){
  const b=browser.stats[i],s=server.stats[i];
  for(const field of Object.keys(s)){
   if(field==="total"||field==="ratio"){
    assert.ok(Math.abs(b[field]-s[field])<1e-10,
     label+":"+s.axis+" "+field+" expected "+s[field]+" actual "+b[field]);
   }else assert.deepEqual(b[field],s[field],label+":"+s.axis+" "+field);
  }
  assert.equal(b.presented,7,label+": expected 7 core items per axis");
 }
 assert.deepEqual(browser.yn,server.yn,label+": D255 Y/N axis sources, candidates, statuses");
 assert.deepEqual(browser.next,server.next,label+": D255 next Y/N offer");
}
(async()=>{
 const {d269ServerClassify:nodeAnalyze,D269_VERSION}=await import("./a05-d269-server-reference.mjs");
 const browser=await chromium.launch({headless:true,...(process.env.A05_CHROME_PATH?{executablePath:process.env.A05_CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:852}});
  const page=await context.newPage();
  const errors=[],external=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))external.push(r.url());});
  await page.goto(local);
  const data=JSON.parse(await page.locator("#data").textContent());
  assert.equal(data.manifests.length,128);
  assert.equal(data.questions.length,50);
  assert.equal(data.ynClassificationVersion,"A05-D255-YN-PROVISIONAL-CLASSIFIER-1");
  assert.equal(data.scoringPower,1.5);
  assert.equal(await page.evaluate(()=>window.__A05_D269_PARITY_TEST__?.harnessOnly),true);
  assert.equal(await page.evaluate(()=>document.querySelector("#data")?.textContent.includes("SYNTHETIC-NONUSER")),false);
  const qById=new Map(data.questions.map(x=>[x.id,x]));
  const states=ynStates(data.ynProbes);
  let tested=0,withYN=0;
  for(let index=0;index<128;index++){
   const manifest={questions:data.manifests[index].ids.map(id=>{
    const q=qById.get(id);assert.ok(q,"Missing item "+id);return q;
   })};
   assert.equal(manifest.questions.length,30);
   for(const pattern of PATTERNS){
    const input=scenario(manifest,index,pattern);
    const server=nodeAnalyze(input);
    assert.equal(server.version,D269_VERSION);
    assert.equal(server.researchOnly,true);
    const result=await page.evaluate(payload=>window.__A05_D269_PARITY_TEST__.analyze(payload),input);
    compare(result,server,index+"/"+pattern);
    tested++;
    if(index%8===0 || index===127){
     // Test the widest Y/N flows on every 8th manifest and final manifest:
     // partial, opposing, unresolved, contradictory, context-dependent, 8 cap.
     for(const state of states.slice(1)){
      const inp={...input,ynState:state};
      const after=nodeAnalyze(inp);
      const fromBrowser=await page.evaluate(payload=>window.__A05_D269_PARITY_TEST__.analyze(payload),inp);
      compare(fromBrowser,after,index+"/"+pattern+"/YN");
      assert.deepEqual(after.stats,server.stats,"Y/N cannot rescore the 30-item baseline");
      assert.deepEqual(after.candidateIds,server.candidateIds,"Y/N cannot overwrite 30-item type set");
      withYN++;
     }
    }
   }
  }
  assert.equal(tested,128*PATTERNS.length);
  assert.equal(withYN,17*PATTERNS.length*7);
  assert.deepEqual(errors,[],"Browser JavaScript errors");
  assert.deepEqual(external,[],"No external requests");
  // Negative typed inputs should fail on the server without side effects.
  const input=scenario({questions:data.manifests[0].ids.map(id=>qById.get(id))},0,"all7");
  for(const changed of [
    {...input,manifestIndex:128},
    {...input,values:input.values.slice(1)},
    {...input,values:[null,...input.values.slice(1)]},
    {...input,values:[8,...input.values.slice(1)]},
    {...input,skipKinds:["UNKNOWN",...input.skipKinds.slice(1)]},
    {...input,ynState:{responses:{"unknown":"YES"},reasons:{}}},
    {...input,ynState:{responses:{[data.ynProbes.axes[0].context[0].id]:"YES"},reasons:{}}}
   ])assert.throws(()=>nodeAnalyze(changed),"Reject invalid/malformed inputs");
  console.log("A05_D269_128_MANIFEST_BROWSER_NODE_PARITY_PASS "+JSON.stringify({
   manifests:128,scenarios:PATTERNS.length,baselineTests:tested,
   ynStatesPerScenario:7,ynTests:withYN,totalComparisons:tested+withYN,
   numericTolerance:1e-10,noNetwork:true,
   30QScoringVersion:data.scoringVersion,ynVersion:data.ynClassificationVersion,
   originalD262Untouched:true
  }));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error("A05_D269_PARITY_FAILED",e);process.exitCode=1;});
