#!/usr/bin/env node
"use strict";
/** D262 Ver.2.2 result evidence semantics, centered signed ratio, and mobile regression. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const local=pathToFileURL(path.resolve(__dirname,"../research/a05/generated/d262-result-v22-preview.html")).href;
async function noScrollMobile(page,expected){
 const snapshot=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(window.innerWidth>600||window.innerHeight<560||window.innerWidth>=window.innerHeight){
   resolve({applicable:false});return;
  }
  const screen=document.body.dataset.screen,root=document.documentElement;
  const panel=document.getElementById(screen);
  const selectors=screen==="question"
   ?["#counter","#qtext",".poles","#scale","#skipUnknown","#skipNA","#prev","#next"]
   :["#ynHeading","#ynQuestion","#ynChoices","#ynStop","#ynPrev","#ynNext"];
  const beyond=selectors.filter(sel=>{
   const el=panel?.querySelector(sel);
   if(!el)return true;
   const r=el.getBoundingClientRect();
   return r.top<0||r.bottom>window.innerHeight+1||r.left<-1||r.right>window.innerWidth+1;
  });
  resolve({applicable:true,screen,viewport:window.innerWidth+"x"+window.innerHeight,
   rootOverflow:root.scrollHeight-root.clientHeight,
   panelOverflow:panel.scrollHeight-panel.clientHeight,
   beyond,scrollFallback:document.body.classList.contains("mobile-safe-scroll")});
 }))));
 if(!snapshot.applicable)return;
 assert.equal(snapshot.screen,expected,"Expected current screen in mobile test");
 assert.equal(snapshot.scrollFallback,false,"Standard portrait must not require the fallback "+JSON.stringify(snapshot));
 assert.ok(snapshot.rootOverflow<=2,"Document has a scrollbar "+JSON.stringify(snapshot));
 assert.ok(snapshot.panelOverflow<=2,"Question panel clips content "+JSON.stringify(snapshot));
 assert.deepEqual(snapshot.beyond,[],"Mobile controls/text outside viewport "+JSON.stringify(snapshot));
}
async function stressAllQuestionTexts(page,data){
 if((await page.locator("#question").isVisible())===false)throw Error("Stress test needs question view");
 const before=await page.evaluate(()=>({
  stem:document.getElementById("qtext").textContent,
  left:document.getElementById("left").textContent,
  right:document.getElementById("right").textContent
 }));
 for(const q of data.questions){
  await page.evaluate(q=>{
   document.getElementById("qtext").textContent=q.stem;
   document.getElementById("left").textContent=q.left;
   document.getElementById("right").textContent=q.right;
  },q);
  await noScrollMobile(page,"question");
 }
 await page.evaluate(q=>{
  document.getElementById("qtext").textContent=q.stem;
  document.getElementById("left").textContent=q.left;
  document.getElementById("right").textContent=q.right;
 },before);
}
async function fill30(page,chooser){
 const n={A:0,B:0,C:0,D:0,E:0};
 for(let i=0;i<30;i++){
  assert.equal(await page.locator("#question").isVisible(),true);
  await noScrollMobile(page,"question");
  const axis=(await page.locator("#axisLabel").textContent()).trim()[0];
  const response=chooser(axis,n[axis]++);
  if(response===null)await page.locator("#skipUnknown").click();
  else{
   await page.locator('#scale button[data-value="'+response+'"]').click();
   await page.locator("#next").click();
  }
 }
 assert.equal(await page.locator("#result").isVisible(),true);
 assert.equal(await page.locator("#axes .axisrow").count(),4);
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.A05_CHROME_PATH?{executablePath:process.env.A05_CHROME_PATH}:{})});
 try{
  for(const [width,height] of [[1280,852],[320,568],[360,640],[375,667],[390,844],[430,932]]){
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage(),errors=[],requests=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))requests.push(r.url());});
   await page.goto(local);
   assert.match(await page.title(),/Ver\.2\.2.*4軸の方向と判定根拠/);
   const data=JSON.parse(await page.locator("#data").textContent());
   assert.equal(data.ynVersion,"A05-D246-ISOLATED-Y-N-PREVIEW-1");
   assert.equal(data.ynClassificationVersion,"A05-D255-YN-PROVISIONAL-CLASSIFIER-1");
   assert.equal(data.mobileUiVersion,"A05-D257-ONE-SCREEN-MOBILE-V2-1");
   assert.equal(data.mobileUiRevision,"A05-D259-MOBILE-V2_1-1");
   assert.equal(data.resultUiVersion,"A05-D262-RESULT-EVIDENCE-V2_2-1");
   assert.equal(data.scoringVersion,"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1");
   assert.equal(data.ynProbes.policy.maxIndependentYNPerSession,8);
   assert.equal(await page.locator("#ynReasonBox").count(),0,"No post-30 non-Y/N input");
   assert.equal(data.manifests.length,128);
   await page.locator("#start").click();
   await stressAllQuestionTexts(page,data);

   // Case I: B has 5 midpoint responses and 2 strong responses;
   // all other axes are clear. Two candidate types, optional Y/N.
   await fill30(page,(axis,i)=>axis==="B"&&i<5?4:7);
   assert.match(await page.locator("#typeBadge").textContent(),/2タイプが参考候補/);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   assert.equal(await page.locator("#extraButton").count(),0);
   assert.match(await page.locator("#post30Note").textContent(),/Y\/N形式のみ/);
   const badgeBefore=await page.locator("#typeBadge").textContent();
   await page.locator("#ynButton").click();
   await noScrollMobile(page,"yn");
   assert.match(await page.locator("#ynHeading").textContent(),/B軸/);
   assert.equal(await page.locator("#ynNext").isDisabled(),true);
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#ynPrev").isEnabled(),true);
   // Go back to first item and confirm answer is preserved.
   await page.locator("#ynPrev").click();
   assert.equal(await page.locator("#ynChoices button").filter({hasText:"YES"}).getAttribute("aria-pressed"),"true");
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"NO"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.notEqual(await page.locator("#typeBadge").textContent(),badgeBefore);
   assert.match(await page.locator("#typeBadge").textContent(),/Y\/N補完の暫定参考タイプ/);
   assert.match(await page.locator("#typeEvidenceSummary").textContent(),/Y\/N暫定補完 1軸／保留 0軸/);
   const bAxis=page.locator('.axisrow[data-axis="B"]');
   assert.equal(await bAxis.getAttribute("data-evidence"),"YN_INITIAL_PROVISIONAL");
   assert.match(await bAxis.locator(".axis-outcome").textContent(),/Y\/N|寄り/);
   assert.match(await bAxis.locator(".axis-method").textContent(),/30問の得点には未加算/);
   assert.equal(await bAxis.locator(".axis-score-marker.is-reference").count(),1);
   assert.match(await page.locator("#ynSummary").textContent(),/B軸：左側を重視/);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#resultNotice").textContent(),/1.5乗/);

   // Case II: 3 midpoint + 2 skipped in B. Same 5-of-7
   // combined trigger; skipped and 4 are distinct.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis!=="B"?7:i<3?4:i<5?null:7);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   assert.match(await page.locator("#axes").textContent(),/方向を示す回答が4問未満です/);
   const bBadge=await page.locator("#typeBadge").textContent();
   await page.locator("#ynButton").click();
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#typeBadge").textContent(),bBadge);
   assert.equal(await page.locator("#ynButton").isVisible(),true);

   // Case III: 4 midpoints and three signed answers => held,
   // D255 now offers Y/N even though the old five-of-seven trigger was not met.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis==="B"&&i<4?4:7);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   assert.match(await page.locator("#typeBadge").textContent(),/2タイプが参考候補/);

   // Case IV: all 4 => 16 candidates, 8 independent questions
   // across A/B/C/D; the provisional classifier may narrow candidates, not rescore 30Q.
   await page.locator("#restart").click();
   await fill30(page,()=>4);
   const tie=await page.locator("#typeBadge").textContent();
   assert.match(tie,/16通りの組み合わせ/);
   await page.locator("#resultTabAxes").click();
   for(const axis of ["A","B","C","D"]){
    const node=page.locator('.axisrow[data-axis="'+axis+'"]');
    assert.equal(await node.locator(".axis-score-track").isVisible(),false,
      "All-4 midpoint must not masquerade as zero-score marker");
    assert.match(await node.locator(".axis-position-text").textContent(),/中間4のみ/);
    assert.match(await node.locator(".axis-evidence").textContent(),/中間4 7\/7/);
    assert.match(await node.locator(".axis-outcome").textContent(),/中間/);
   }
   assert.match(await page.locator("#typeEvidenceSummary").textContent(),/保留 4軸/);
   await page.locator("#ynButton").click();
   for(let i=0;i<8;i++){
    assert.equal(await page.locator("#yn").isVisible(),true);
    await noScrollMobile(page,"yn");
    assert.match(await page.locator("#ynCounter").textContent(),/上限8問/);
    assert.equal(await page.locator(".yn-progress-line").isVisible(),true);
    assert.equal(await page.locator(".yn-progress-line").getAttribute("aria-valuenow"),String(i));
    await page.locator("#ynChoices button").filter({hasText:i%2?"NO":"YES"}).click();
    await page.locator("#ynNext").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.notEqual(await page.locator("#typeBadge").textContent(),tie);
   assert.match(await page.locator("#typeEvidenceSummary").textContent(),/Y\/N暫定補完 4軸／保留 0軸/);
   await page.locator("#resultTabAxes").click();
   for(const axis of ["A","B","C","D"]){
    const node=page.locator('.axisrow[data-axis="'+axis+'"]');
    assert.equal(await node.getAttribute("data-evidence"),"YN_INITIAL_PROVISIONAL");
    assert.equal(await node.locator(".axis-score-track").isVisible(),false,
      "Y/N must NOT invent 7-scale numeric reference position");
    assert.match(await node.locator(".axis-method").textContent(),/30問の得点には未加算/);
   }
   assert.match(await page.locator("#typeBadge").textContent(),/Y\/N補完の暫定参考タイプ/);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#ynSummary").textContent(),/D軸/);

   // Case V: one UNSURE on B leads to 2 contextual questions.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis==="B"&&i<5?4:7);
   await page.locator("#ynButton").click();
   await page.locator("#ynChoices button").filter({hasText:"判断できない"}).click();
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.match(await page.locator("#ynStage").textContent(),/具体的な場面/);
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   await page.locator("#ynButton").click();
   assert.match(await page.locator("#ynStage").textContent(),/具体的な場面/);
   await page.locator("#ynChoices button").filter({hasText:"NO"}).click();
   await page.locator("#ynNext").click();
   await page.locator("#ynChoices button").filter({hasText:"YES"}).click();
   await page.locator("#ynNext").click();
   assert.equal(await page.locator("#result").isVisible(),true);
   assert.equal(await page.locator("#ynButton").isVisible(),false);
   assert.match(await page.locator("#ynSummary").textContent(),/具体場面Y\/Nで/);
   assert.match(await page.locator("#typeBadge").textContent(),/Y\/N補完の暫定参考タイプ/);

   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false);
   // Case VI: all 30 skipped; the only post-30 question format is Y/N.
   await page.locator("#restart").click();
   await fill30(page,()=>null);
   assert.match(await page.locator("#typeBadge").textContent(),/16通りの組み合わせ/);
   await page.locator("#resultTabAxes").click();
   for(const axis of ["A","B","C","D"]){
    const node=page.locator('.axisrow[data-axis="'+axis+'"]');
    assert.equal(await node.locator(".axis-score-track").isVisible(),false);
    assert.match(await node.locator(".axis-position-text").textContent(),/回答がなく算出不可/);
    assert.match(await node.locator(".axis-outcome").textContent(),/回答情報なし/);
    assert.match(await node.locator(".axis-evidence").textContent(),/判断できない 7\/7/);
   }
   assert.equal(await page.locator("#extraButton").count(),0);
   assert.match(await page.locator("#post30Note").textContent(),/Y\/N形式のみ/);
   assert.equal(await page.locator("#ynButton").isVisible(),true);
   await page.locator("#ynButton").click();
   assert.equal(await page.locator("#question").isVisible(),false);
   assert.equal(await page.locator("#ynChoices button").count(),3);
   await noScrollMobile(page,"yn");
   await page.locator("#ynStop").click();
   assert.equal(await page.locator("#result").isVisible(),true);

   // Case VII: distinguish why an answer was skipped without changing the
   // seven-point null score. Returning to a skipped question must show state.
   await page.locator("#restart").click();
   await noScrollMobile(page,"question");
   await page.locator("#skipUnknown").click();
   await page.locator("#skipNA").click();
   await page.locator("#prev").click();
   assert.equal(await page.locator("#skipNA").getAttribute("aria-pressed"),"true");
   await page.locator("#prev").click();
   assert.equal(await page.locator("#skipUnknown").getAttribute("aria-pressed"),"true");
   await page.locator("#next").click();
   await page.locator("#next").click();
   for(let i=2;i<30;i++){
     await noScrollMobile(page,"question");
     await page.locator('#scale button[data-value="7"]').click();
     await page.locator("#next").click();
   }
   assert.equal(await page.locator("#resultTabType").getAttribute("aria-selected"),"true");
   assert.match(await page.locator("#resultComplete").textContent(),/判断できない1問／当てはまらない1問/);
   await page.locator("#resultTabAxes").click();
   assert.equal(await page.locator("#resultPanelAxes").isVisible(),true);
   assert.equal(await page.locator("#resultPanelType").isVisible(),false);
   assert.match(await page.locator("#axes").textContent(),/判断できない/);
   await page.locator("#resultTabNotes").click();
   assert.equal(await page.locator("#resultPanelNotes").isVisible(),true);
   assert.match(await page.locator("#resultNotice").textContent(),/未検証/);
   await page.locator("#resultTabType").click();
   assert.equal(await page.locator("#resultPanelType").isVisible(),true);

   // Case VIII: a skipped reason clears if the user replaces it with scale 4.
   await page.locator("#restart").click();
   await page.locator("#skipNA").click();
   await page.locator("#prev").click();
   assert.equal(await page.locator("#skipNA").getAttribute("aria-pressed"),"true");
   await page.locator('#scale button[data-value="4"]').click();
   assert.equal(await page.locator("#skipNA").getAttribute("aria-pressed"),"false");
   assert.equal(await page.locator("#skipUnknown").getAttribute("aria-pressed"),"false");
   assert.equal(await page.locator('#scale button[data-value="4"]').getAttribute("aria-pressed"),"true");
   await noScrollMobile(page,"question");
   // Case VIII intentionally ends on the editable question screen.
   // Finish that session through the normal UI before clicking restart.
   await page.locator("#next").click();
   for(let i=1;i<30;i++){
    await page.locator('#scale button[data-value="7"]').click();
    await page.locator("#next").click();
   }
   assert.equal(await page.locator("#result").isVisible(),true);

   // Case IX: six directional 7-point answers cancel around true zero:
   // this is NOT a single midpoint answer, not no data, and not 'clear'.
   await page.locator("#restart").click();
   await fill30(page,(axis,i)=>axis==="A"?(i<3?1:i<6?7:4):7);
   await page.locator("#resultTabAxes").click();
   const cancelled=page.locator('.axisrow[data-axis="A"]');
   assert.equal(await cancelled.getAttribute("data-axis-status"),"tie");
   assert.equal(await cancelled.getAttribute("data-evidence"),"UNRESOLVED");
   assert.equal(await cancelled.locator(".axis-score-track").isVisible(),true);
   assert.equal(await cancelled.locator(".axis-score-marker.is-tie").count(),1);
   assert.match(await cancelled.locator(".axis-position-text").textContent(),/0\.00.*相殺/);
   assert.match(await cancelled.locator(".axis-evidence").textContent(),/方向回答 6\/7 · 中間4 1\/7/);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,"Result axis tab caused horizontal overflow "+overflow);

   // Case X: no invented probability, count provenance visible, 7-item pole at +1.
   await page.locator("#restart").click();
   await fill30(page,()=>7);
   await page.locator("#resultTabAxes").click();
   assert.match(await page.locator("#typeEvidenceSummary").textContent(),/30問の参考方向 4軸／Y\/N暫定補完 0軸／保留 0軸/);
   for(const axis of ["A","B","C","D"]){
    const node=page.locator('.axisrow[data-axis="'+axis+'"]');
    assert.equal(await node.getAttribute("data-evidence"),"BASE_30");
    assert.match(await node.locator(".axis-position-text").textContent(),/\+1\.00/);
    assert.match(await node.locator(".axis-evidence").textContent(),/方向回答 7\/7/);
    assert.equal(await node.locator(".axis-score-marker.is-reference").count(),0);
    assert.equal(await node.locator(".axis-score-track").isVisible(),true);
   }
   assert.doesNotMatch(await page.locator("#resultPanelAxes").textContent(),/診断精度\s*\d+%|信頼度\s*\d+%/);

   assert.deepEqual(requests,[],"No network requests");
   assert.deepEqual(errors,[],"No browser JS errors");
   console.log("D262_RESULT_V22_BROWSER_PASS "+JSON.stringify({width,height,forms:128,allBankItemsStress:50,cases:10,noQuestionScroll:true,resultEvidence:true,centeredScore:true,skipReasons:true,resultTabs:true,ynProgress:true,post30OnlyYN:true,noNetwork:true}));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error("D246_ISOLATED_BROWSER_FAIL",error);process.exitCode=1;});
