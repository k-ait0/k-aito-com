"use strict";
/* Browser QA on the checked-out static site (not a claim of live XServer QA).
   npm install --prefix /tmp/kaito-qa playwright@1.56.1
   PLAYWRIGHT_BROWSERS_PATH=/tmp/kaito-browsers /tmp/kaito-qa/node_modules/.bin/playwright install chromium
   NODE_PATH=/tmp/kaito-qa/node_modules node scripts/browser-smoke.cjs
 */
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
const screens = path.join(root, "qa-screenshots");
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",
  ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".txt":"text/plain",
  ".xml":"application/xml"};
const pages = ["/","/about/","/archive/","/business/","/drink/","/links/","/money/",
  "/notes/nuclear-industrial-carrier/","/notes/site-launch-trouble/",
  "/projects/","/projects/digital-storage/","/storage/","/study/","/travel/","/works/"];
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{
    res.writeHead(400);res.end();return;
  }
  const file=path.resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404);res.end("not found: "+pathname);return;
  }
  res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream"});
  fs.createReadStream(file).pipe(res);
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const stop=()=>new Promise(resolve=>server.close(resolve));
(async()=>{
  await listen();
  const url="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  fs.mkdirSync(screens,{recursive:true});
  let failures=[],passed=0;
  const check=(ok,label,detail="")=>{
    if(ok){passed++;console.log("PASS "+label);}
    else{failures.push(label+(detail?" — "+detail:""));console.error("FAIL "+label,detail);}
  };
  try{
    for(const mode of [{name:"mobile",width:390,height:844},{name:"desktop",width:1440,height:900}]){
      const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},
        deviceScaleFactor:1,isMobile:mode.name==="mobile",hasTouch:mode.name==="mobile"});
      for(const slug of pages){
        const page=await context.newPage();
        const errors=[];
        page.on("pageerror",err=>errors.push(err.message));
        page.on("response",response=>{
          if(response.url().startsWith(url)&&response.status()>=400)
            errors.push("HTTP "+response.status()+" "+response.url().slice(url.length));
        });
        try{
          const response=await page.goto(url+slug,{waitUntil:"networkidle",timeout:30000});
          await page.waitForTimeout(100);
          check(response.status()===200,mode.name+" "+slug+" response "+response.status());
          const valid=await page.evaluate(()=>({
            visibleH1:[...document.querySelectorAll("h1")].filter(e=>e.getClientRects().length).length,
            overflow:document.documentElement.scrollWidth-window.innerWidth,
            header:!!document.querySelector(".site-header"),
            search:!!document.querySelector(".site-wide-search, #search-form")
          }));
          check(valid.visibleH1===1,mode.name+" "+slug+" one visible heading",JSON.stringify(valid));
          check(valid.overflow<=2,mode.name+" "+slug+" no horizontal overflow",JSON.stringify(valid));
          check(valid.header&&valid.search,mode.name+" "+slug+" header and search",JSON.stringify(valid));
          check(errors.length===0,mode.name+" "+slug+" no script/asset errors",errors.join("; "));
          if(["/","/about/","/archive/","/projects/"].includes(slug)){
            const label=slug==="/"?"home":slug.slice(1,-1);
            await page.screenshot({path:path.join(screens,mode.name+"-"+label+".png"),fullPage:false});
          }
          if(mode.name==="mobile"){
            const dimensions=await page.locator(slug==="/"
              ?"#search-form":".site-wide-search").boundingBox();
            check(!!dimensions&&dimensions.width<=52,mode.name+" "+slug+" compact search",
              JSON.stringify(dimensions));
          }
        }catch(e){failures.push(mode.name+" "+slug+": "+e.message);console.error("FAIL",mode.name,slug,e);}
        finally{await page.close();}
      }
      const page=await context.newPage();
      const searchErrors=[];
      page.on("pageerror",e=>searchErrors.push(e.message));
      try{
        await page.goto(url+"/about/",{waitUntil:"networkidle"});
        await page.locator(".site-wide-search button[type=submit]").click();
        check(await page.locator(".site-wide-search").evaluate(e=>e.classList.contains("is-open")),
          mode.name+" subpage search expands");
        await page.locator("#global-search-input").fill("原子炉");
        await page.locator("#global-search-input").press("Enter");
        check(await page.locator("#site-wide-search-dialog").evaluate(e=>e.open),
          mode.name+" subpage search dialog opens");
        check(await page.locator(".site-search-result").count()===1,
          mode.name+" subpage full-text search matches one");
        await page.locator("#site-search-query").fill("該当しない単語abc");
        check(await page.locator(".site-search-result").count()===0 &&
          await page.locator(".site-search-empty").count()===1,
          mode.name+" empty result message");
        await page.locator("#site-search-query").fill("XServer GitHub");
        check(await page.locator(".site-search-result").count()===1,
          mode.name+" multiple search tokens match");
        await page.locator(".site-search-result").first().click();
        check(new URL(page.url()).pathname==="/notes/site-launch-trouble/",
          mode.name+" result opens canonical article");
        check(searchErrors.length===0,mode.name+" search has no JS errors",searchErrors.join("; "));
      }catch(e){failures.push(mode.name+" subpage search: "+e.message);}
      finally{await page.close();}
      const home=await context.newPage();
      try{
        await home.goto(url+"/",{waitUntil:"networkidle"});
        if(mode.name==="mobile")await home.locator("#search-form button[type=submit]").click();
        console.log("HOME SEARCH STATE",mode.name,await home.locator("#search-form").evaluate(f=>({className:f.className,inputDisplay:getComputedStyle(f.querySelector("#site-search")).display,formDisplay:getComputedStyle(f).display,formWidth:f.getBoundingClientRect().width,inputWidth:f.querySelector("#site-search").getBoundingClientRect().width,innerWidth:innerWidth,media700:matchMedia("(max-width:700px)").matches,archiveDialogOpen:document.querySelector("#archive-dialog").open,enhanced:!!document.querySelector("#random-grid .small-notes-empty"),buttonHit:document.elementFromPoint(...Object.values(f.querySelector("button[type=submit]").getBoundingClientRect().toJSON()).slice(0,2))?.tagName})));
        await home.locator("#site-search").waitFor({state:"visible",timeout:3000});
        await home.locator("#site-search").fill("原子炉");
        await home.locator("#site-search").press("Enter");
        check(await home.locator("#archive-dialog").evaluate(e=>e.open),
          mode.name+" HOME search dialog opens");
        check(await home.locator("#archive-results .entry-card").count()===1,
          mode.name+" HOME full-text search matches");
      }catch(e){failures.push(mode.name+" HOME search: "+e.message);}
      finally{await home.close();}
      await context.close();
    }
  }finally{await browser.close();await stop();}
  console.log("RESULT "+passed+" assertions passed; "+failures.length+" failed");
  if(failures.length){for(const failure of failures)console.error("FAILED "+failure);process.exitCode=1;}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
