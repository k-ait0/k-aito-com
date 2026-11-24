#!/usr/bin/env node
"use strict";
/**
 * A05 D274 | Real click/keyboard-only end-to-end checks against the exact
 * unmodified D272 accessibility research candidate.
 *
 * Expected T01/T16/T06/T12 and axis-score values come from hand-enumerated
 * D273 mathematical examples, not from D227/D243/D255/D269 functions.
 *
 * This test reads immutable page data ONLY to recognize question prompts
 * and verify the displayed question order. It never reads internal answers,
 * calls browser analysis functions, injects score data, or uses server results
 * as an oracle. All answers are synthetic and remain inside a file:// page.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium,webkit}=require("playwright");
const url=pathToFileURL(path.resolve(__dirname,
 "../research/a05/generated/d272-accessibility-candidate.html")).href;
const axes=["A","B","C","D"];
const sizes=[
 {width:1280,height:800,deviceScaleFactor:1},
 {width:320,height:568,deviceScaleFactor:2},
 {width:390,height:844,deviceScaleFactor:3}
];
const chosen=process.env.A05_D274_ENGINE==="webkit"?
 [["webkit",webkit]]:process.env.A05_D274_ENGINE==="chromium"?
 [["chromium",chromium]]:[["chromium",chromium],["webkit",webkit]];
const modes=["all-right","all-left","all-midpoint-yn","b-midpoint-e-skips","all-skipped-resume"];
const started=Date.now();
function firstQuestionMeta(data,question){
 const candidates=data.questions.filter(q=>q.stem===question);
 assert.equal(candidates.length,1,"Each question text identifies exactly one immutable bank entry");
 return candidates[0];
}
function expectedAnswer(mode,axis,axisPosition,questionIndex){
 if(mode==="all-right")return {value:7,skip:null};
 if(mode==="all-left")return {value:1,skip:null};
 if(mode==="all-midpoint-yn")return {value:4,skip:null};
 if(mode==="b-midpoint-e-skips"){
  if(axis==="E")return {value:null,skip:axisPosition===0?"UNKNOWN":"NOT_APPLICABLE"};
  if(axis==="B")return {value:axisPosition<5?4:7,skip:null};
  return {value:7,skip:null};
 }
 if(mode==="all-skipped-resume")
  return {value:null,skip:questionIndex===0||questionIndex%2===1?"NOT_APPLICABLE":"UNKNOWN"};
 throw Error("Unknown E2E scenario "+mode);
}
async function chooseScale(page,n){
 const item=page.locator('#scale button[data-value="'+n+'"]');
 await item.click();
 assert.equal(await item.getAttribute("aria-pressed"),"true","User-selected 7-point choice is reflected in UI");
 assert.equal(await page.locator("#next").isDisabled(),false);
}
async function chooseSkip(page,reason){
 const id=reason==="UNKNOWN"?"#skipUnknown":"#skipNA";
 await page.locator(id).click();
}
function matchCounts(text,answered,unknown,na){
 assert.ok(text.includes("有効回答"+answered+"問"),"answered count displayed: "+text);
 assert.ok(text.includes("判断できない"+unknown+"問"),"unknown count displayed: "+text);
 assert.ok(text.includes("当てはまらない"+na+"問"),"not-applicable count displayed: "+text);
}
async function resultMeta(page){
 assert.equal(await page.locator("#result").isVisible(),true);
 return {
  name:await page.locator("#typeName").textContent(),
  badge:await page.locator("#typeBadge").textContent(),
  evidence:await page.locator("#typeEvidenceSummary").textContent(),
  complete:await page.locator("#resultComplete").textContent(),
  canYN:await page.locator("#ynButton").isVisible()
 };
}
function confirmEvidence(text,base,yn,held){
 const expected="30問の参考方向 "+base+"軸／Y/N暫定補完 "+
  yn+"軸／保留 "+held+"軸";
 assert.ok(text.includes(expected),"Expected evidence "+expected+" but got "+text);
}
function assertKind(data,metadata,id){
 if(id){
  assert.ok(metadata.badge.includes(id),"Expected type "+id+" but got "+metadata.badge);
  assert.equal(metadata.name,data.types.find(x=>x.id===id).name);
 }else{
  assert.ok(metadata.badge.includes("未確定"),"No forced single type");
 }
}
function plannedCounts(mode){
 if(mode==="b-midpoint-e-skips")return [28,1,1];
 if(mode==="all-skipped-resume")return [0,14,16];
 return [30,0,0];
}
async function validateAxes(page,mode,when){
 await page.locator("#resultTabAxes").click();
 assert.equal(await page.locator("#resultPanelAxes").isVisible(),true);
 assert.equal(await page.locator(".axisrow").count(),4);
 const expectedBase=(mode==="all-right"||mode==="all-left"?4:
  mode==="b-midpoint-e-skips"?3:0);
 const expectedYN=when==="fully-resolved"?(mode==="all-midpoint-yn"?4:1):
  when==="one-yn"?1:0;
 const expectedHeld=4-expectedBase-expectedYN;
 for(const a of axes){
  const row=page.locator('.axisrow[data-axis="'+a+'"]');
  const source=await row.getAttribute("data-evidence");
  const fromBase=mode==="all-right"||mode==="all-left"||
   (mode==="b-midpoint-e-skips"&&a!=="B");
  const fromYN=when==="fully-resolved"&&(mode==="all-midpoint-yn"||a==="B")||
   when==="one-yn"&&a==="A";
  const expected=fromBase?"BASE_30":fromYN?"YN_INITIAL_PROVISIONAL":"UNRESOLVED";
  assert.equal(source,expected,"axis evidence source "+a);
  const line=await row.locator(".axis-position-text").textContent();
  const text=await row.locator(".axis-evidence").textContent();
  const markerHidden=await row.locator(".axis-score-marker").getAttribute("hidden")!==null;
  if(mode==="all-right"){
   assert.ok(line.includes("+1.00"),a+" all-7 analytic score");
   assert.ok(text.includes("方向回答 7/7"),a+" directional count");
   assert.equal(markerHidden,false);
  }else if(mode==="all-left"){
   assert.ok(line.includes("-1.00"),a+" all-1 analytic score");
   assert.ok(text.includes("方向回答 7/7"),a+" directional count");
   assert.equal(markerHidden,false);
  }else if(mode==="all-midpoint-yn"){
   assert.ok(line.includes("中間4のみ"),a+" midpoint-only no directional score");
   assert.ok(text.includes("中間4 7/7"),a+" seven midpoints");
   assert.equal(markerHidden,true);
  }else if(mode==="all-skipped-resume"){
   assert.ok(line.includes("回答がなく算出不可"),a+" no valid score for skipped axis");
   assert.equal(markerHidden,true);
  }else if(mode==="b-midpoint-e-skips"){
   assert.ok(line.includes(a==="B"?"+0.29":"+1.00"),a+" analytic score");
   if(a==="B"){
    assert.ok(text.includes("方向回答 2/7"),"B has only two directional responses");
    assert.ok(text.includes("中間4 5/7"),"B has five valid middle responses");
   }
   assert.equal(markerHidden,false);
  }
 }
 await page.locator("#resultTabNotes").click();
 assert.equal(await page.locator("#resultPanelNotes").isVisible(),true);
 assert.match(await page.locator("#resultNotice").textContent(),/未検証/);
 await page.locator("#resultTabType").click();
 assert.equal(await page.locator("#resultPanelType").isVisible(),true);
 return {expectedBase,expectedYN,expectedHeld};
}
function findProbe(data,question){
 const hits=[];
 for(const axis of data.ynProbes.axes){
  for(const key of ["initial","context"]){
   for(let i=0;i<axis[key].length;i++){
    const q=axis[key][i];
    if(q.prompt===question)hits.push({axis:axis.axis,stage:key,pole:i});
   }
  }
 }
 assert.equal(hits.length,1,"Shown Y/N prompt must match exact immutable bank item");
 return hits[0];
}
async function pressYN(page,data,expectedAxis,pole,value,stage="initial"){
 assert.equal(await page.locator("#yn").isVisible(),true);
 const current=await page.locator("#ynQuestion").textContent();
 const q=findProbe(data,current);
 assert.deepEqual(q,{axis:expectedAxis,stage,pole},
  "The actual next question must follow independently expected axis/pole order");
 assert.equal(await page.locator("#ynHeading").textContent(),
  expectedAxis+"軸 · 左右それぞれの価値観");
 const button=page.locator("#ynChoices").getByRole("button",{
  name:value==="UNSURE"?"判断できない":value,exact:true
 });
 await button.click();
 assert.equal(await page.locator("#ynChoices").getByRole("button",{
  name:value==="UNSURE"?"判断できない":value,exact:true
 }).getAttribute("aria-pressed"),"true");
 assert.equal(await page.locator("#ynNext").isDisabled(),false);
}
async function gotoNextYN(page){await page.locator("#ynNext").click();}
async function driveQuestionnaire(page,data,mode){
 await page.locator("#start").click();
 assert.equal(await page.locator("#question").isVisible(),true);
 const byAxis={A:0,B:0,C:0,D:0,E:0},seen=[];
 let changedB=false,changedE=false;
 for(let i=0;i<30;i++){
  assert.equal(await page.locator("#question").isVisible(),true,"Question visible "+(i+1));
  assert.equal(await page.locator("#counter").textContent(),(i+1)+" / 30");
  const q=firstQuestionMeta(data,await page.locator("#qtext").textContent());
  assert.equal(await page.locator("#axisLabel").textContent(),
   q.axis==="E"?"補助項目":q.axis+"軸");
  seen.push(q.id);
  assert.equal(await page.locator("#next").isDisabled(),true,
   "Unanswered question must not auto-advance");
  const axisPosition=byAxis[q.axis]++;
  const plan=expectedAnswer(mode,q.axis,axisPosition,i);
  if(mode==="all-right"&&i===0 || mode==="all-left"&&i===0){
   const incorrect=mode==="all-right"?1:7;
   await chooseScale(page,incorrect);
   await page.locator("#next").click();
   await page.locator("#prev").click();
   assert.equal(await page.locator('#scale button[data-value="'+incorrect+'"]')
    .getAttribute("aria-pressed"),"true","Back navigation restores original selection");
   await chooseScale(page,plan.value);
   await page.locator("#next").click();
  }else if(mode==="b-midpoint-e-skips"&&q.axis==="B"&&axisPosition===0){
   await chooseScale(page,7);
   await page.locator("#next").click();
   await page.locator("#prev").click();
   await chooseScale(page,4);
   await page.locator("#next").click();
   changedB=true;
  }else if(mode==="b-midpoint-e-skips"&&q.axis==="E"&&axisPosition===0){
   await chooseScale(page,7);
   await page.locator("#next").click();
   await page.locator("#prev").click();
   await chooseSkip(page,"UNKNOWN");
   changedE=true;
  }else if(mode==="all-skipped-resume"&&i===0){
   await chooseSkip(page,"UNKNOWN");
   await page.locator("#prev").click();
   assert.equal(await page.locator("#skipUnknown").getAttribute("aria-pressed"),
    "true","Back navigation restores chosen skip reason");
   await chooseSkip(page,"NOT_APPLICABLE");
  }else if(plan.value===null)await chooseSkip(page,plan.skip);
  else{
   await chooseScale(page,plan.value);
   if(mode==="all-midpoint-yn"&&i===0){
    await page.locator("#next").focus();
    await page.keyboard.press("Enter");
   }else await page.locator("#next").click();
  }
 }
 assert.deepEqual(byAxis,{A:7,B:7,C:7,D:7,E:2},
  "Rendered questionnaire must have fixed core quotas");
 assert.equal(new Set(seen).size,30,"No question ID repeated in rendered questionnaire");
 assert.ok(data.manifests.some(m=>JSON.stringify(m.ids)===JSON.stringify(seen)),
  "The 30 DOM-rendered questions must match exactly one bundled 128-manifest sequence");
 assert.equal(await page.locator("#result").isVisible(),true);
 const initial=await resultMeta(page);
 const [valid,unknown,na]=plannedCounts(mode);
 matchCounts(initial.complete,valid,unknown,na);
 if(mode==="all-right"){assertKind(data,initial,"T16");confirmEvidence(initial.evidence,4,0,0);assert.equal(initial.canYN,false);}
 if(mode==="all-left"){assertKind(data,initial,"T01");confirmEvidence(initial.evidence,4,0,0);assert.equal(initial.canYN,false);}
 if(mode==="all-midpoint-yn"){
  assertKind(data,initial,null);assert.ok(initial.badge.includes("16通り"));
  confirmEvidence(initial.evidence,0,0,4);assert.equal(initial.canYN,true);
 }
 if(mode==="b-midpoint-e-skips"){
  assert.equal(changedB,true);assert.equal(changedE,true);
  assert.ok(initial.badge.includes("2タイプ"),"Only B unresolved means two reference types");
  confirmEvidence(initial.evidence,3,0,1);assert.equal(initial.canYN,true);
  const nearText=await page.locator("#nearTypes").textContent();
  assert.ok(nearText.includes(data.types.find(x=>x.id==="T12").name));
  assert.ok(nearText.includes(data.types.find(x=>x.id==="T16").name));
 }
 if(mode==="all-skipped-resume"){
  assertKind(data,initial,null);assert.match(initial.name,/判断できません/);
  confirmEvidence(initial.evidence,0,0,4);assert.equal(initial.canYN,true);
 }
 await validateAxes(page,mode,"initial");
 return {initial,seen};
}
async function ynAllMidpoint(page,data){
 await page.locator("#ynButton").click();
 const answer={A:["YES","NO"],B:["NO","YES"],C:["YES","NO"],D:["NO","YES"]};
 let counter=0;
 for(const a of axes){
  for(let i=0;i<2;i++){
   assert.equal(await page.locator("#yn").isVisible(),true);
   await pressYN(page,data,a,i,answer[a][i]);
   counter++;
   assert.ok((await page.locator("#ynCounter").textContent()).includes(
    "Y/N 回答済み "+counter+" / 上限8問"),"Y/N progress is accurate");
   await gotoNextYN(page);
  }
 }
 assert.equal(counter,8);
 const end=await resultMeta(page);
 assertKind(data,end,"T06");confirmEvidence(end.evidence,0,4,0);
 assert.equal(end.canYN,false,"Hard maximum eight Y/N answers enforced");
 assert.ok(end.badge.includes("Y/N補完"),"Result clearly labels provisional Y/N");
 await validateAxes(page,"all-midpoint-yn","fully-resolved");
 const labels=await page.locator("#resultNotice").textContent();
 assert.match(labels,/30問の1.5乗加点は維持/);
 return {extra:8,type:"T06",source:"YN_INITIAL_PROVISIONAL"};
}
async function ynMixedB(page,data){
 await page.locator("#ynButton").click();
 await pressYN(page,data,"B",0,"YES");
 await gotoNextYN(page);
 await page.locator("#ynPrev").click();
 const first=data.ynProbes.axes.find(x=>x.axis==="B").initial[0].prompt;
 assert.equal(await page.locator("#ynQuestion").textContent(),first);
 assert.equal(await page.locator("#ynChoices").getByRole("button",{name:"YES",exact:true})
  .getAttribute("aria-pressed"),"true","Y/N previous answer must be preserved");
 await gotoNextYN(page);
 await pressYN(page,data,"B",1,"NO");
 await gotoNextYN(page);
 const end=await resultMeta(page);
 assertKind(data,end,"T12");confirmEvidence(end.evidence,3,1,0);
 assert.equal(end.canYN,false);
 assert.ok(end.badge.includes("Y/N補完"));
 matchCounts(end.complete,28,1,1);
 await validateAxes(page,"b-midpoint-e-skips","fully-resolved");
 return {extra:2,type:"T12",source:"YN_INITIAL_PROVISIONAL"};
}
async function ynSkippedResume(page,data){
 await page.locator("#ynButton").click();
 assert.equal(await page.locator("#ynNext").isDisabled(),true);
 await page.locator("#ynStop").click();
 let end=await resultMeta(page);
 assertKind(data,end,null);confirmEvidence(end.evidence,0,0,4);
 await page.locator("#ynButton").click();
 await pressYN(page,data,"A",0,"YES");
 await page.locator("#ynStop").click();
 end=await resultMeta(page);
 assertKind(data,end,null);confirmEvidence(end.evidence,0,0,4);
 assert.equal(end.canYN,true,"A partial Y/N pair must not consume another pair");
 await page.locator("#ynButton").click();
 await pressYN(page,data,"A",1,"NO");
 await gotoNextYN(page);
 assert.equal(await page.locator("#yn").isVisible(),true,"Next unresolved axis is offered");
 const next=findProbe(data,await page.locator("#ynQuestion").textContent());
 assert.deepEqual(next,{axis:"B",stage:"initial",pole:0});
 await page.locator("#ynStop").click();
 end=await resultMeta(page);
 assert.equal(end.badge.includes("8通り"),true);
 confirmEvidence(end.evidence,0,1,3);
 assert.equal(end.canYN,true);
 await validateAxes(page,"all-skipped-resume","one-yn");
 return {extra:2,type:"8 provisional candidates",source:"YN_INITIAL_PROVISIONAL"};
}
async function oneCase(engine,instance,mode,size){
 const ctx=await instance.newContext({viewport:size,
  isMobile:size.width<=430,hasTouch:size.width<=430});
 const page=await ctx.newPage();
 const errors=[],unexpected=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))unexpected.push(r.url());});
 try{
  await page.goto(url,{waitUntil:"load"});
  assert.equal(await page.locator("#intro").isVisible(),true);
  const data=JSON.parse(await page.locator("#data").textContent());
  assert.equal(data.questions.length,50);
  assert.equal(data.manifests.length,128);
  assert.equal(data.types.length,16);
  assert.equal(data.ynProbes.axes.length,4);
  assert.equal(data.scoringPower,1.5);
  const {initial,seen}=await driveQuestionnaire(page,data,mode);
  let yn={extra:0,type:mode==="all-right"?"T16":mode==="all-left"?"T01":null};
  if(mode==="all-midpoint-yn")yn=await ynAllMidpoint(page,data);
  if(mode==="b-midpoint-e-skips")yn=await ynMixedB(page,data);
  if(mode==="all-skipped-resume")yn=await ynSkippedResume(page,data);
  await page.locator("#restart").click();
  assert.equal(await page.locator("#question").isVisible(),true);
  assert.equal(await page.locator("#counter").textContent(),"1 / 30");
  assert.equal(await page.locator("#next").isDisabled(),true,
   "Restart cannot retain previous answers/Y/N state");
  assert.deepEqual(errors,[],"No browser JavaScript errors");
  assert.deepEqual(unexpected,[],"No outgoing HTTP requests from local research UI");
  const result={engine,viewport:size.width+"x"+size.height,mode,ynCount:yn.extra,
   final:yn.type,questions:seen.length,network:unexpected.length,errors:errors.length};
  console.log("A05_D274_ACTUAL_DOM_E2E_CASE "+JSON.stringify(result));
  return result;
 }finally{await ctx.close();}
}
async function main(){
 const results=[];
 for(const [name,engine] of chosen){
  const config={headless:true};
  if(name==="chromium"&&process.env.A05_CHROME_PATH)
   config.executablePath=process.env.A05_CHROME_PATH;
  const browser=await engine.launch(config);
  try{
   for(const size of sizes){
    for(const mode of modes){
     results.push(await oneCase(name,browser,mode,size));
    }
   }
  }finally{await browser.close();}
 }
 assert.equal(results.length,chosen.length*sizes.length*modes.length);
 console.log("A05_D274_USER_INTERACTION_END_TO_END_PASS "+JSON.stringify({
  engines:chosen.map(x=>x[0]),screenSizes:sizes.map(x=>x.width+"x"+x.height),
  scenarios:modes,cases:results.length,
  completed30QuestionSessions:results.length,
  noScoreFunctionAccess:true,noSyntheticAPI:true,
  independentManualExpectedTypes:["T01","T16","T06","T12"],
  noNetwork:true,noRealUserData:true,noProductionDeployment:true,
  elapsedMs:Date.now()-started
 }));
}
main().catch(e=>{console.error("A05_D274_DOM_E2E_FAILED",e);process.exitCode=1;});
