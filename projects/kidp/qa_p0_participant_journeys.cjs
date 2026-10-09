const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const origin = process.env.KIDP_TEST_ORIGIN || "https://k-aito.com";
const checks = [];
async function runCase(name,fn){
  await fn();
  checks.push(name);
  console.log("PASS: "+name);
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const errors=[];
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},permissions:["clipboard-read","clipboard-write"]});
    const page=await context.newPage();
    page.on("pageerror",err=>errors.push(err.message));

    await runCase("station-life P0 participant journey",async()=>{
      await page.goto(origin+"/projects/kidp/station-life/prototype/?test=1&pid=P01");
      assert.equal(await page.locator("#participantId").inputValue(),"P01");
      await page.locator("#startBtn").click();
      assert.equal(await page.locator("#areaGrid .area").count(),3);
      await page.locator('[data-life="hybrid"]').click();
      assert.equal(await page.locator("#mLife").innerText(),"1");
      await page.locator("#areaGrid .area").first().locator("button").click();
      assert.equal(await page.locator("#detail").isVisible(),true);
      await page.locator("#returnCompare").click();
      await page.locator('[data-life="night"]').click();
      await page.locator("#problemUnderstood").selectOption("yes");
      await page.locator("#lifestyleUnderstood").selectOption("yes");
      await page.locator("#wantsUse").selectOption("yes");
      await page.locator("#scoreMisread").selectOption("no");
      await page.locator("#chosenArea").selectOption("A");
      await page.locator("#firstQuote").fill("駅からの道が大事ですね");
      const payload=await page.evaluate(()=>testPayload());
      assert.equal(payload.participant_id,"P01");
      assert.equal(payload.life_changes,2);
      assert.equal(payload.areas_viewed.length,1);
      const row=await page.evaluate(()=>testCsv());
      assert.equal(row.match(/","/g).length,12);
      await page.locator("#copyCsvBtn").click();
      await page.waitForFunction(()=>document.querySelector("#copyState")?.textContent?.includes("コピーしました")||document.querySelector("#copyState")?.textContent?.includes("コピーできません")); 
      assert.match(await page.locator("#copyState").innerText(),/コピーしました/);
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),row);
      await page.reload();
      assert.equal(await page.locator("#mLife").innerText(),"2");
      assert.equal(await page.locator("#mAreas").innerText(),"1");
    });

    await runCase("life-design-lab P0 20 cards, undo and resume",async()=>{
      await page.goto(origin+"/projects/kidp/life-design-lab/prototype/?test=1&pid=P02");
      await page.locator("#startBtn").click();
      for(let i=0;i<20;i++){
        await page.locator('[data-choice="WANT"]').click();
        if(i===3){
          await page.locator("#undoBtn").click();
          await page.locator('[data-choice="MAYBE"]').click();
        }
      }
      assert.equal(await page.locator("#result").isVisible(),true);
      const p=await page.evaluate(()=>testPayload());
      assert.equal(p.participant_id,"P02");
      assert.equal(p.completed_20,true);
      assert.equal(p.want_count,19);
      assert.equal(p.maybe_count,1);
      assert.equal(p.undo_count,1);
      await page.locator("#resonance").selectOption("somewhat");
      await page.locator("#diagnosisRead").selectOption("no");
      await page.locator("#deepDive").fill("Travel");
      await page.locator("#firstQuote").fill("旅行が上でした");
      const row=await page.evaluate(()=>testCsv());
      assert.equal(row.match(/","/g).length,25);
      await page.locator("#copyCsvBtn").click();
      await page.waitForFunction(()=>document.querySelector("#copyState")?.textContent?.includes("コピーしました")||document.querySelector("#copyState")?.textContent?.includes("コピーできません")); 
      assert.match(await page.locator("#copyState").innerText(),/コピーしました/);
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),row);
      await page.reload();
      await page.locator("#startBtn").click();
      assert.equal(await page.locator("#result").isVisible(),true);
      assert.equal((await page.evaluate(()=>testPayload())).completed_20,true);
    });

    await runCase("WHYNOT P0 browse, SAME and submit intent",async()=>{
      await page.goto(origin+"/projects/kidp/whynot/prototype/?test=1&pid=P03");
      await page.locator('button.nav[data-page="explore"]').click();
      for(const i of [1,2,3]){
        await page.locator("#app .card").nth(i).click();
        if(i===1)await page.locator("#app .samebtn").click();
        await page.locator('button.nav[data-page="explore"]').click();
      }
      assert.equal(await page.locator("#mViewed").innerText(),"3");
      assert.equal(await page.locator("#mSame").innerText(),"1");
      await page.locator('button.nav[data-page="submit"]').click();
      await page.locator("#raw").fill("日常の困りごとがあります");
      await page.locator("#problemFirstInput").selectOption("yes");
      await page.locator("#wantsSubmitInput").selectOption("yes");
      await page.locator("#likeMisreadInput").selectOption("no");
      const p=await page.evaluate(()=>testPayload());
      assert.equal(p.participant_id,"P03");
      assert.equal(p.problems_viewed.length,3);
      assert.equal(p.same_clicks,1);
      assert.equal(p.submit_opened,true);
      assert.ok(p.draft_chars>=5);
      const row=await page.evaluate(()=>testCsv());
      assert.equal(row.match(/","/g).length,16);
      await page.locator("#copyCsvBtn").click();
      await page.waitForFunction(()=>document.querySelector("#copyState")?.textContent?.includes("コピーしました")||document.querySelector("#copyState")?.textContent?.includes("コピーできません")); 
      assert.match(await page.locator("#copyState").innerText(),/コピーしました/);
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),row);
      await page.reload();
      assert.equal(await page.locator("#mViewed").innerText(),"3");
      assert.equal(await page.locator("#mDraft").innerText(),String(p.draft_chars));
    });

    assert.deepEqual(errors,[]);
    await context.close();
    console.log("P0 journeys PASS: "+checks.length+" projects; browser exceptions 0");
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});