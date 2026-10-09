const {chromium}=require("playwright");
const fs=require("node:fs");
const assert=require("node:assert/strict");
const origin=process.env.KIDP_TEST_ORIGIN||"http://127.0.0.1:8765";
const projects=[
 ["station-life","projects/kidp/station-life/test-review/index.html"],
 ["life-design-lab","projects/kidp/life-design-lab/test-review/index.html"],
 ["whynot","projects/kidp/whynot/test-review/index.html"]
];
const csvCell=v=>'"'+String(v??"").replaceAll('"','""')+'"';
function makeCsv(file,project){
 const s=fs.readFileSync(file,"utf8");
 const header=JSON.parse(s.match(/const HEADER=(\[[^\n;]+\]);/)[1]);
 const vals={station:{problem_understood:"yes",lifestyle_change_understood:"yes",wants_real_use:"yes",score_misread:"no"},
 life:{completed_20:"true",result_resonance:"yes",wants_deep_dive:"true",thought_it_was_diagnosis:"no",unclear_cards:""},
 why:{problems_viewed:'["P002","P003","P006"]',same_clicks:"1",draft_chars:"8",wants_submit:"yes",problem_first_understood:"yes",same_like_misread:"no"}};
 const v=project==="station-life"?vals.station:project==="life-design-lab"?vals.life:vals.why;
 const rows=[];
 for(let i=1;i<=5;i++)rows.push(header.map(h=>h==="participant_id"?"P0"+i:v[h]??"").map(csvCell).join(","));
 return {csv:header.join(",")+"\n"+rows.join("\n"),lastRow:rows[0]};
}
async function main(){
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 await page.goto(origin+"/projects/kidp/test-ops/");
 await page.locator('[data-project="station-life"] .person').first().locator(".status").selectOption("DONE");
 assert.match(await page.locator('[data-project="station-life"] .ops-message').innerText(),/CSV/);
 assert.equal(await page.locator('[data-project="station-life"] .count').innerText(),"0 / 5 DONE");
 console.log("PASS: no early DONE");
 for(const [project,file] of projects){
  await page.goto(origin+"/projects/kidp/test-ops/");
  const card=page.locator('[data-project="'+project+'"]');
  for(let i=0;i<5;i++){
   const row=card.locator(".person").nth(i);
   await row.locator(".receipt").check();
   await card.locator(".person").nth(i).locator(".status").selectOption("DONE");
  }
  assert.equal(await card.locator(".count").innerText(),"5 / 5 DONE");
  const {csv,lastRow}=makeCsv(file,project);
  await page.goto(origin+"/"+file.replace("/index.html","/"));
  await page.locator("#csvInput").fill(csv);
  await page.locator(project==="life-design-lab"?"#analyzeBtn":"#analyze").click();
  assert.equal(await page.locator("#decision strong").innerText(),"P1 GO");
  const summary=project==="life-design-lab"?"#copySummary":"#copySummary";
  assert.equal(await page.locator("#results").isVisible(),true);
  console.log("PASS: "+project+" verified five -> P1 GO");
  await page.locator("#csvInput").fill(csv+"\n"+lastRow);
  await page.locator(project==="life-design-lab"?"#analyzeBtn":"#analyze").click();
  assert.match(await page.locator("#parseStatus").innerText(),/重複/);
  assert.equal(await page.locator("#results").isVisible(),false);
  console.log("PASS: "+project+" duplicate -> error");
  await page.goto(origin+"/projects/kidp/test-ops/");
  await page.locator('[data-project="'+project+'"] .person').nth(4).locator(".status").selectOption("INVALID");
  await page.goto(origin+"/"+file.replace("/index.html","/"));
  await page.locator("#csvInput").fill(csv);
  await page.locator(project==="life-design-lab"?"#analyzeBtn":"#analyze").click();
  assert.equal(await page.locator("#decision strong").innerText(),"MORE DATA");
  assert.match(await page.locator("#parseStatus").innerText(),/INVALID除外/);
  console.log("PASS: "+project+" INVALID -> valid 4 -> MORE DATA");
  // The operator must be able to replace an invalid P05 with a new P06.
  await page.goto(origin+"/projects/kidp/test-ops/");
  const updatedCard=page.locator('[data-project="'+project+'"]');
  await updatedCard.locator(".reserve-group summary").click();
  const reserveP06=updatedCard.locator(".reserve-people .person").first();
  assert.equal(await reserveP06.locator("b").innerText(),"P06");
  await reserveP06.locator(".receipt").check();
  await updatedCard.locator(".reserve-people .person").first().locator(".status").selectOption("DONE");
  assert.equal(await updatedCard.locator(".count").innerText(),"5 / 5 DONE");
  assert.equal(await updatedCard.locator(".reserve-group").evaluate(el=>el.open),true);
  const nextRow=lastRow.replace(/^"P01",/,'"P06",');
  assert.notEqual(nextRow,lastRow);
  await page.goto(origin+"/"+file.replace("/index.html","/"));
  await page.locator("#csvInput").fill(csv+"\n"+nextRow);
  await page.locator(project==="life-design-lab"?"#analyzeBtn":"#analyze").click();
  assert.equal(await page.locator("#decision strong").innerText(),"P1 GO");
  assert.equal(await page.locator("#n, #mN").first().innerText(),"5");
  assert.match(await page.locator("#parseStatus").innerText(),/INVALID除外.*P05/);
  console.log("PASS: "+project+" invalid P05 -> replacement P06 counts as fifth valid session");
 }
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:850});
  for(const pageName of ["test-ops/","station-life/test-review/","life-design-lab/test-review/","whynot/test-review/"]){
   await page.goto(origin+"/projects/kidp/"+pageName);
   const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(over<=1,pageName+" overflow "+over+"px at "+width);
  }
  console.log("PASS: no horizontal overflow at "+width+"px");
 }
 await context.close();
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
