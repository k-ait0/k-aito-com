// D276: read-only release-candidate audit. No data leaves the page.
const assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
const {chromium,webkit}=require("playwright");
const engine=process.env.A05_D276_ENGINE||"chromium";
const input=process.env.A05_D276_CANDIDATE||"research/a05/generated/d272-accessibility-candidate.html";
const cases=[{width:1280,height:800},{width:390,height:844},{width:320,height:568},{width:667,height:375}];
const report={engine,input,checks:[],defects:[]};
const check=(name,ok,detail)=>{const rec={name,ok:!!ok,detail};report.checks.push(rec);if(!ok)report.defects.push(rec);};
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function layout(page,label){
 await settle(page);
 const v=await page.evaluate(()=>{
  const current=document.body.dataset.screen||"intro";
  const panel=document.getElementById(current);
  const selectors=["header","#"+current];
  const visible=[...document.querySelectorAll(selectors.join(","))].flatMap(el=>[el,...el.querySelectorAll("button,p,h1,h2,.pole,.brand,.pill,#qtext,#ynQuestion,.axis-position-text,.axis-evidence")]).filter(el=>el.getClientRects().length);
  const overflow=visible.filter(el=>{const r=el.getBoundingClientRect();return r.left<-2||r.right>innerWidth+2||el.scrollWidth>el.clientWidth+3;}).map(el=>el.id||el.className||el.tagName);
  const clipped=visible.filter(el=>{const s=getComputedStyle(el);return ["hidden","clip"].includes(s.overflowY)&&el.scrollHeight>el.clientHeight+3;}).map(el=>el.id||el.className||el.tagName);
  const unreachable=[...panel.querySelectorAll("button:not([disabled])")].filter(el=>el.getClientRects().length).filter(el=>{
   const r=el.getBoundingClientRect();return r.bottom>innerHeight+2&&getComputedStyle(document.body).overflowY==="hidden";
  }).map(el=>el.id||el.textContent);
  return {screen:current,rootFont:getComputedStyle(document.documentElement).fontSize,horizontal:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,overflow,clipped,unreachable,scrollMode:getComputedStyle(document.body).overflowY};
 });
 check(label+" layout",v.horizontal<=2&&!v.overflow.length&&!v.clipped.length&&!v.unreachable.length,v);
}
async function tabsTo(page,selector,max=30){
 for(let i=0;i<max;i++){
  if(await page.locator(selector).evaluate(e=>e===document.activeElement))return true;
  await page.keyboard.press("Tab");
 }return false;
}
async function keyboardCase(page){
 await page.goto(pathToFileURL(path.resolve(input)).href);
 check("keyboard: start reachable",await tabsTo(page,"#start"),null);
 await page.keyboard.press("Enter");await settle(page);
 check("keyboard: first question heading",await page.evaluate(()=>document.activeElement.id==="qtext"),null);
 let lost=0;
 for(let i=0;i<30;i++){
  if(!await tabsTo(page,'#scale button[data-value="4"]')){check("keyboard: scale reachable "+(i+1),false,null);return;}
  await page.keyboard.press("Space");await settle(page);
  const retained=await page.evaluate(()=>document.activeElement?.matches('#scale button[data-value="4"]'));
  if(!retained)lost++;
  assert.equal(await page.locator('#scale button[data-value="4"]').getAttribute("aria-pressed"),"true");
  if(!await tabsTo(page,"#next")){check("keyboard: next reachable "+(i+1),false,null);return;}
  await page.keyboard.press("Enter");await settle(page);
 }
 check("keyboard: 30 questions complete",await page.locator("#result").isVisible(),null);
 check("keyboard: selection focus retained",lost===0,{lost,total:30});
 await page.locator("#resultTabType").focus();await page.keyboard.press("End");
 check("keyboard: End selects notes",await page.locator("#resultTabNotes").getAttribute("aria-selected")==="true",null);
 await page.keyboard.press("Home");
 check("keyboard: Home selects type",await page.locator("#resultTabType").getAttribute("aria-selected")==="true",null);
 await page.keyboard.press("ArrowRight");
 check("keyboard: ArrowRight selects axes",await page.locator("#resultTabAxes").getAttribute("aria-selected")==="true",null);
 if(!await tabsTo(page,"#ynButton")){check("keyboard: Y/N reachable",false,null);return;}
 await page.keyboard.press("Enter");await settle(page);
 for(const [i,label] of ["YES","NO"].entries()){
  const button=page.locator("#ynChoices button").filter({hasText:new RegExp("^"+label+"$")});
  const sel="#ynChoices button:nth-child("+(i+1)+")";
  if(!await tabsTo(page,sel)){check("keyboard: Y/N choice reachable",false,null);return;}
  await page.keyboard.press("Space");await settle(page);
  check("keyboard: Y/N selection focus "+label,await button.evaluate(e=>e===document.activeElement),null);
  assert.equal(await button.getAttribute("aria-pressed"),"true");
  if(i===0){assert.ok(await tabsTo(page,"#ynNext"));await page.keyboard.press("Enter");await settle(page);}
 }
 assert.ok(await tabsTo(page,"#ynStop"));await page.keyboard.press("Enter");await settle(page);
 const evidence=await page.locator("#typeEvidenceSummary").textContent();
 const notice=await page.locator("#resultNotice").textContent();
 const held=await page.locator(".axisrow[data-evidence=UNRESOLVED]").evaluateAll(els=>els.map(x=>x.dataset.axis));
 const supplemented=await page.locator('.axisrow[data-evidence^="YN_"]').evaluateAll(els=>els.map(x=>x.dataset.axis));
 check("partial Y/N: one supplemented and three held",supplemented.length===1&&held.length===3,{evidence,held,supplemented});
 check("partial Y/N: notice identifies only remaining held axes",held.length===3&&notice.includes(held.join("・")+"軸の方向は未確定のままです。")&&!notice.includes("A・B・C・D軸の方向は未確定"),{notice,held,supplemented});
}
async function resizeCase(browser,viewport,percent){
 const ctx=await browser.newContext({viewport});
 const page=await ctx.newPage();const label=viewport.width+"x"+viewport.height+" "+percent+"%";
 const errors=[],net=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(/^https?:/.test(r.url()))net.push(r.url());});
 await page.goto(pathToFileURL(path.resolve(input)).href);
 if(percent===200)await page.addStyleTag({content:"html{font-size:200% !important}"});
 await layout(page,label+" intro");
 await page.locator("#start").click();
 for(let i=0;i<30;i++){
  if(i===0||i===14||i===29)await layout(page,label+" question "+(i+1));
  await page.locator('#scale button[data-value="4"]').click();await page.locator("#next").click();
 }
 await layout(page,label+" type");
 await page.locator("#resultTabAxes").click();await layout(page,label+" axes");
 await page.locator("#resultTabNotes").click();await layout(page,label+" notes");
 await page.locator("#ynButton").click();await layout(page,label+" Y/N");
 if(viewport.width===390){await page.setViewportSize({width:390,height:560});await layout(page,label+" dynamic height 560");await page.setViewportSize(viewport);}
 await page.locator("#ynStop").click();await settle(page);
 check(label+" no errors/network",!errors.length&&!net.length,{errors,net});
 await ctx.close();
}
(async()=>{
 const browser=await (engine==="webkit"?webkit:chromium).launch(engine==="chromium"&&process.env.A05_CHROME_PATH?{executablePath:process.env.A05_CHROME_PATH}:{});
 try{
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});await keyboardCase(await ctx.newPage());await ctx.close();
  for(const v of cases)for(const percent of [100,200])await resizeCase(browser,v,percent);
 }finally{await browser.close();console.log("D276_AUDIT_JSON "+JSON.stringify(report));console.log("D276_AUDIT_TOTAL checks="+report.checks.length+" defects="+report.defects.length);}
 if(process.env.A05_D276_STRICT==="1")assert.equal(report.defects.length,0,"D276 release candidate findings");
})().catch(e=>{console.error(e);process.exitCode=1;});
