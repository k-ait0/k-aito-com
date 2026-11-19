#!/usr/bin/env node
"use strict";
/** D265 synthetic-only dashboard browser acceptance. No real data or API. */
const assert=require("node:assert/strict");
const {resolve}=require("node:path");
const {pathToFileURL}=require("node:url");
const {readFileSync}=require("node:fs");
const {chromium}=require("playwright");
const pathname=resolve(__dirname,"../research/a05/generated/d265-synthetic-analytics-dashboard.html");
const source=readFileSync(pathname,"utf8");
assert.match(source,/<meta http-equiv="Content-Security-Policy"/);
assert.match(source,/connect-src 'none'/);
assert.match(source,/form-action 'none'/);
assert.match(source,/noindex,nofollow/);
assert.doesNotMatch(source,/https?:\/\//);
const local=pathToFileURL(pathname).href;
const dateSessions={V_DEMO_A:420,V_DEMO_B:180};
function sum(rows,filter){return rows.filter(filter).reduce((n,x)=>n+x.n,0);}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.A05_CHROME_PATH?{executablePath:process.env.A05_CHROME_PATH}:{})});
 try{
  for(const [width,height] of [[1280,852],[320,568],[375,667],[390,844],[430,932]]){
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage();const errors=[],external=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>{if(!r.url().startsWith("file:")&&!r.url().startsWith("data:"))external.push(r.url());});
   await page.goto(local);
   assert.match(await page.title(),/合成データ専用/);
   const data=JSON.parse(await page.locator("#data").textContent());
   assert.equal(data.schema,"A05-D265-SYNTHETIC-DASHBOARD-1");
   assert.equal(data.synthetic,true);
   assert.equal(data.noActualResponses,true);
   assert.equal(data.flags.dbConnected,false);
   assert.equal(data.flags.networkEnabled,false);
   assert.equal(data.flags.autoReplacementEnabled,false);
   assert.equal(data.uniqueConsentedCompleted,600);
   assert.equal(data.manualReviewCandidates.length>=1,true);
   assert.match(await page.locator(".notice").textContent(),/合成・架空データ/);
   assert.match(await page.locator("#queueList").textContent(),/rev\./);
   assert.equal(await page.locator("#typeList .type-item").count(),16);
   assert.equal(await page.locator("#kpis .kpi").count(),4);
   assert.equal(await page.locator("#version").inputValue(),"V_DEMO_A");
   assert.equal(await page.locator("#kpis .kpi strong").first().textContent(),"420");
   assert.match(await page.locator("#typeUnresolved").textContent(),/未確定/);
   // 16 type counts + unresolved must equal selected completed sessions.
   for(const phase of ["BASE_30","FINAL_AFTER_YN"]){
    const n=sum(data.dailyTypeCounts,q=>q.questionnaire_version==="V_DEMO_A"&&q.phase===phase);
    assert.equal(n,dateSessions.V_DEMO_A);
    await page.locator("#phase").selectOption(phase);
    assert.equal(await page.locator("#kpis .kpi strong").first().textContent(),String(n));
    assert.equal(await page.locator("#typeList .type-item").count(),16);
   }
   await page.locator("#denominator").selectOption("single");
   assert.match(await page.locator("#typeMeta").textContent(),/単独分類/);
   const shares=await page.locator("#typeList .pct").allTextContents();
   const percentSum=shares.reduce((n,x)=>n+(Number.parseFloat(x)||0),0);
   assert.ok(Math.abs(percentSum-100)<1.0,"Single type shares should sum ~100%, got "+percentSum);
   await page.locator("#denominator").selectOption("all");
   assert.match(await page.locator("#typeMeta").textContent(),/全完了/);
   // Distinguish unanswered Y/N, midpoints and "not applicable" in detail panels.
   assert.equal(await page.locator("#questionRows tr").count()>20,true);
   await page.locator("#questionRows button").first().click();
   assert.match(await page.locator("#questionDetail").textContent(),/判断できない/);
   assert.match(await page.locator("#questionDetail").textContent(),/当てはまらない/);
   assert.match(await page.locator("#questionDetail").textContent(),/中間|4/);
   await page.locator("#format").selectOption("YN");
   assert.match(await page.locator("#questionDetail").textContent(),/YES/);
   assert.match(await page.locator("#questionDetail").textContent(),/提示後未回答/);
   await page.locator("#format").selectOption("CORE");
   await page.locator("#period").selectOption("last1");
   assert.equal(await page.locator("#queueList .queue").count(),0,
    "A single day must not meet 100 exposures for any one question");
   const oneDay=Number(await page.locator("#kpis .kpi strong").first().textContent());
   assert.ok(oneDay>0&&oneDay<420);
   await page.locator("#period").selectOption("last7");
   const seven=Number(await page.locator("#kpis .kpi strong").first().textContent());
   assert.ok(seven>oneDay&&seven<420);
   await page.locator("#period").selectOption("all");
   await page.locator("#version").selectOption("V_DEMO_B");
   assert.equal(await page.locator("#kpis .kpi strong").first().textContent(),"180");
   // B may have no question eligible for the provisional review threshold.
   assert.equal(await page.locator("#typeList .type-item").count(),16);
   const viewport=await page.evaluate(()=>({
    docOverflow:document.documentElement.scrollWidth-innerWidth,
    queuePolicy:document.getElementById("policyVersion").textContent,
    sentinel:window.__A05_D265_TEST_HOOK__.status()
   }));
   assert.ok(viewport.docOverflow<=2,"Body horizontal overflow "+JSON.stringify(viewport));
   assert.match(viewport.queuePolicy,/未承認/);
   assert.equal(viewport.sentinel.form,"V_DEMO_B");
   assert.equal(await page.locator("form").count(),0);
   assert.deepEqual(errors,[],"No JS runtime errors");
   assert.deepEqual(external,[],"No external requests or data exfiltration");
   console.log("A05_D265_DASHBOARD_BROWSER_PASS "+JSON.stringify({
    width,height,versions:2,types:16,syntheticOnly:true,filterChecks:5,
    noExternalRequests:true,noHorizontalOverflow:true
   }));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error("A05_D265_BROWSER_FAIL",e);process.exitCode=1;});
