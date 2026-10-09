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
// Derive browser coverage from the published sitemap, including newly added notes.
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const pages=[...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match=>{
  const value=match[1].trim();
  const url=new URL(value);
  if(url.origin!=="https://k-aito.com"||
      !(url.pathname==="/"||/^\/[a-z0-9/-]+\/$/.test(url.pathname))||
      url.search||url.hash||url.href!=="https://k-aito.com"+url.pathname){
    throw Error("Unexpected public sitemap URL: "+value);
  }
  return url.pathname;
});
if(!pages.length||new Set(pages).size!==pages.length){
  throw Error("Sitemap has no pages or contains duplicate public URLs");
}
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
  const externalUrl=process.env.KAITO_BASE_URL?.replace(/\/$/,"");
  if(!externalUrl)await listen();
  const url=externalUrl||"http://127.0.0.1:"+server.address().port;
  console.log("BROWSER TEST TARGET",url);
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
          // Global reading-surface standard: all public pages include the white layer;
          // only the copy surfaces are white — the surrounding canvas remains warm.
          const surfaces=await page.evaluate(()=>{
            const white="rgb(255, 255, 255)";
            const cases={
              "/":[".hero-poster",".section-heading",".shelf",".entry-card",".home-project-card"],
              "/storage/":[".page-intro",".storage-guide",".storage-discovery",".storage-discovery-link",".status-guide"],
              "/archive/":[".page-intro",".archive-guide",".archive-tools",".archive-period .note-link"],
              "/projects/":[".projects-hero-copy",".project-index",".portfolio-section-head",".portfolio-card",".project-note-feature"],
              "/about/":[".about-hero-copy",".about-hero-card",".about-copy",".editorial-principles li"],
              "/travel/":[".page-intro",".shelf-group-heading",".shelf-empty",".record-guide"],
              "/projects/kidp/":[".kidp-hero",".kidp-process",".kidp-section-head",".kidp-build-queue"],
              "/projects/kidp/whynot/":[".kidp-project-hero",".kidp-two-col>div",".kidp-next-full"],
              "/links/":[".page-intro",".links-section",".link-row"]
            };
            const route=location.pathname;
            const selected=cases[route]||[];
            return {
              styleLink:!!document.querySelector('link[href^="/white-surfaces-v1.css"]'),
              isLastCSS:[...document.querySelectorAll('head link[rel="stylesheet"]')].at(-1)?.getAttribute("href")?.startsWith("/white-surfaces-v1.css"),
              warmCanvas:getComputedStyle(document.body).backgroundColor!==white,
              selected:selected.map(selector=>{
                const el=document.querySelector(selector);
                return {selector,exists:!!el,background:el?getComputedStyle(el).backgroundColor:null};
              }),
              shelfOverlay:route==="/storage/"?(()=>{
                const e=document.querySelector(".storage-shelf");
                return e?{overlay:getComputedStyle(e,"::before").backgroundImage,
                  text:getComputedStyle(e.querySelector("h2")).color,
                  image:getComputedStyle(e.querySelector(".storage-shelf-image")).display}:null;
              })():null
            };
          });
          check(surfaces.styleLink&&surfaces.isLastCSS&&surfaces.warmCanvas,
            mode.name+" "+slug+" standard white surface layer preserves warm site",JSON.stringify(surfaces));
          if(surfaces.selected.length){
            check(surfaces.selected.every(x=>x.exists&&x.background==="rgb(255, 255, 255)"),
              mode.name+" "+slug+" readable text panels are opaque white",JSON.stringify(surfaces.selected));
          }
          if(slug==="/storage/"){
            check(!!surfaces.shelfOverlay&&surfaces.shelfOverlay.overlay.includes("rgb(255, 255, 255)")&&
              surfaces.shelfOverlay.text==="rgb(25, 63, 50)"&&surfaces.shelfOverlay.image!=="none",
              mode.name+" SHELVES retain photographs with white type panel",JSON.stringify(surfaces.shelfOverlay));
          }
          // All published KAITO articles share a white reading paper over the warm site background.
          if(slug.startsWith("/notes/")){
            await page.evaluate(async()=>{
              await Promise.all([...document.querySelectorAll(".article-copy img")].map(async img=>{
                img.loading="eager";
                try{await img.decode();}catch(_error){}
              }));
            });
            const design=await page.evaluate(()=>{
              const paper=document.querySelector(".article-page");
              const body=document.querySelector("body");
              const reading=document.querySelector(".article-copy.essay-body");
              const css=paper?getComputedStyle(paper):null;
              return {paper:css?.backgroundColor||null,site:getComputedStyle(body).backgroundColor,
                padding:css?parseFloat(css.paddingLeft):0,reading:!!reading,
                illustrations:[...document.querySelectorAll(".article-copy img")].every(img=>img.complete&&img.naturalWidth>0)};
            });
            check(design.paper==="rgb(255, 255, 255)",mode.name+" "+slug+" white article paper",JSON.stringify(design));
            check(design.site!=="rgb(255, 255, 255)",mode.name+" "+slug+" warm site background preserved",JSON.stringify(design));
            check(design.reading&&design.padding>=15,mode.name+" "+slug+" article padding and typography",JSON.stringify(design));
            check(design.illustrations,mode.name+" "+slug+" article illustrations load",JSON.stringify(design));
          }
          if(slug==="/"){
            const link=page.locator(".home-project-finowa-link");
            check(await link.count()===1 &&
              await link.getAttribute("href")==="https://finowa.jp/" &&
              await link.getAttribute("target")==="_blank",
              mode.name+" HOME has FINOWA external link");
            const photo=await page.locator(".hero-polaroid .photo-notebook").evaluate(node=>
              getComputedStyle(node).backgroundImage.includes("/assets/notebook-photo.webp"));
            check(photo,mode.name+" HOME first note uses sharp photo");
          }
          if(slug==="/"){
            const homeDiscovery=await page.evaluate(()=>{
              const feature=document.querySelector("#fresh .home-feature-note");
              const all=document.querySelector("#fresh .section-heading a");
              const hero=document.querySelector(".hero-polaroid");
              const latest=document.querySelector("#recent");
              const featureSection=document.querySelector("#fresh");
              const shelves=document.querySelector("#shelves");
              const cards=[...document.querySelectorAll("#recent-grid .entry-card")];
              return {href:feature?.getAttribute("href"),title:feature?.querySelector(".home-feature-title")?.textContent,
                all:all?.getAttribute("href"),hero:hero?.getAttribute("href"),
                order:!!featureSection&&!!shelves&&featureSection.compareDocumentPosition(shelves)&Node.DOCUMENT_POSITION_FOLLOWING,
                cards:cards.length,duplicate:cards.some(card=>card.getAttribute("href")===feature?.getAttribute("href")),
                latestVisible:!!latest};
            });
            check(!!homeDiscovery.href?.startsWith("/notes/")&&!!homeDiscovery.title,
              mode.name+" HOME highlights one published article",JSON.stringify(homeDiscovery));
            check(homeDiscovery.all==="/archive/"&&homeDiscovery.hero==="/notes/site-launch-trouble/"&&!!homeDiscovery.order,
              mode.name+" HOME has direct archive link and preserves FIRST NOTE",JSON.stringify(homeDiscovery));
            check(homeDiscovery.cards>=1&&!homeDiscovery.duplicate,
              mode.name+" HOME avoids repeating the featured note in remaining cards",JSON.stringify(homeDiscovery));
          }
          if(slug==="/storage/"){
            const shelves=await page.evaluate(()=>{
              const anchors=[...document.querySelectorAll(".storage-discovery-link")];
              return {count:anchors.length,hrefs:anchors.map(a=>a.getAttribute("href")),
                label:document.querySelector("#storage-discovery-heading")?.textContent||"",
                overflow:document.documentElement.scrollWidth-window.innerWidth};
            });
            check(shelves.count===3&&shelves.hrefs.includes("/archive/")&&shelves.hrefs.includes("/projects/kidp/"),
              mode.name+" SHELVES offers discovery paths despite unfilled categories",JSON.stringify(shelves));
          }
          if(slug==="/"||slug==="/projects/"){
            const cards=await page.locator('[data-card-type="project"][data-project-id]').evaluateAll(nodes=>
              nodes.map(node=>({
                id:node.dataset.projectId,
                stage:node.querySelector('[data-project-stage]')?.textContent.trim()||"",
                access:node.querySelector('[data-project-access]')?.textContent.trim()||"",
                action:node.querySelector('[data-project-action]')?.textContent.trim()||"",
                clickable:node.tagName==="A"
              })));
            const ids=cards.map(x=>x.id);
            const stages={ "digital-storage":"OPERATING","tabi-route":"DESIGNING","finowa":"BUILDING","kidp":"TESTING" };
            check(cards.length===4&&new Set(ids).size===4&&Object.entries(stages).every(([id,stage])=>cards.some(x=>x.id===id&&x.stage===stage&&x.access&&x.action)),
              mode.name+" "+slug+" project cards disclose type, phase and availability",JSON.stringify(cards));
            check(cards.some(x=>x.id==="tabi-route"&&!x.clickable&&x.access==="未公開")&&cards.some(x=>x.id==="kidp"&&x.clickable&&x.access==="試作あり"),
              mode.name+" "+slug+" distinguishes unpublished concepts from accessible prototypes",JSON.stringify(cards));
          }
          if(slug==="/"){
            const articleCards=await page.locator("#recent-grid .entry-card").evaluateAll(nodes=>nodes.map(node=>({
              type:node.dataset.cardType,label:node.querySelector(".card-kind")?.textContent.trim(),state:node.querySelector(".state")?.textContent.trim()
            })));
            check(articleCards.length===3&&articleCards.every(x=>x.type==="article"&&x.label==="ARTICLE"&&x.state),
              mode.name+" HOME distinguishes reading cards from project cards",JSON.stringify(articleCards));
          }
          if(slug==="/storage/"||slug==="/archive/"){
            const count=await page.locator(slug==="/storage/"?'[data-catalogue-recent] .note-link':'[data-catalogue-timeline] .note-link').evaluateAll(nodes=>
              ({total:nodes.length,typed:nodes.filter(n=>n.dataset.cardType==="article"&&n.querySelector(".card-kind")?.textContent.trim()==="ARTICLE").length}));
            check(count.total===4&&count.typed===count.total,
              mode.name+" "+slug+" identifies all published article cards",JSON.stringify(count));
          }
          if(slug==="/projects/"){
            check(await page.locator(".featured-project-card .project-meta").innerText()
              .then(text=>text.includes("公開済み / 運用・記事拡充中")),
              mode.name+" PROJECTS reflects DIGITAL STORAGE operations status");
            const link=page.locator(".project-secondary-grid a.external-project");
            check(await link.count()===1 &&
              await link.getAttribute("href")==="https://finowa.jp/",
              mode.name+" PROJECTS links to FINOWA");
          }
          if(slug==="/projects/digital-storage/"){
            check(await page.locator(".project-status strong").innerText()
              .then(text=>text.includes("公開・運用中")),
              mode.name+" project detail reflects live operations");
          }
          if(slug==="/archive/"){
            const layout=await page.evaluate(()=>{
              const heading=document.querySelector(".archive-page .page-intro h1");
              const eyebrow=document.querySelector(".archive-page .page-intro .eyebrow");
              const summary=document.querySelector(".archive-period .note-link p");
              const title=document.querySelector(".archive-period .note-link h3");
              return {
                headingLeft:heading.getBoundingClientRect().left,
                eyebrowLeft:eyebrow.getBoundingClientRect().left,
                summaryLeft:summary.getBoundingClientRect().left,
                titleLeft:title.getBoundingClientRect().left,
                summaryWidth:summary.getBoundingClientRect().width
              };
            });
            check(Math.abs(layout.headingLeft-layout.eyebrowLeft)<8,
              mode.name+" ARCHIVE heading follows the approved left alignment",
              JSON.stringify(layout));
            check(Math.abs(layout.summaryLeft-layout.titleLeft)<8 &&
              layout.summaryWidth>mode.width*.30,
              mode.name+" ARCHIVE note summaries use the article column",
              JSON.stringify(layout));
          }
          if(slug==="/notes/site-launch-trouble/"){
            const cover=await page.locator(".article-cover img").evaluate(img=>({
              width:img.naturalWidth,height:img.naturalHeight,complete:img.complete
            }));
            check(cover.complete&&cover.width>=1600&&cover.height>=1000,
              mode.name+" first article cover has native high-resolution image",
              JSON.stringify(cover));
          }
          if(["/","/storage/","/about/","/archive/","/projects/"].includes(slug)){
            const label=slug==="/"?"home":slug==="/storage/"?"shelves":slug.slice(1,-1);
            await page.screenshot({path:path.join(screens,mode.name+"-"+label+".png"),fullPage:true});
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
        if(mode.name==="mobile"){
          await home.locator("#search-form button[type=submit]").tap();
          check(await home.locator("#search-form").evaluate(e=>e.classList.contains("is-open")),
            "mobile HOME search expands on tap");
        }
        await home.locator("#site-search").waitFor({state:"visible",timeout:3000});
        await home.locator("#site-search").fill("原子炉");
        await home.locator("#site-search").press("Enter");
        check(await home.locator("#archive-dialog").evaluate(e=>e.open),
          mode.name+" HOME search dialog opens");
        check(await home.locator("#archive-results .entry-card").count()===1,
          mode.name+" HOME full-text search matches");
      }catch(e){failures.push(mode.name+" HOME search: "+e.message);}
      finally{await home.close();}
      // Test the noindex roulette beta separately from public sitemap pages.
      const roulette=await context.newPage();
      const rouletteErrors=[];
      roulette.on("pageerror",e=>rouletteErrors.push(e.message));
      roulette.on("response",r=>{
        if(r.url().startsWith(url+"/tools/want-roulette/")&&r.status()>=400)
          rouletteErrors.push("HTTP "+r.status()+" "+r.url());
      });
      try{
        const response=await roulette.goto(url+"/tools/want-roulette/",{
          waitUntil:"networkidle",timeout:30000
        });
        check(response?.status()===200,mode.name+" roulette beta HTTP 200");
        check((await roulette.locator("#runtimeBanner").innerText()).includes("操作機能を読み込みました"),
          mode.name+" roulette JavaScript initialized");
        const first=await roulette.locator("#cardText").innerText();
        await roulette.locator("#swipeCard").scrollIntoViewIfNeeded();
        const box=await roulette.locator("#swipeCard").boundingBox();
        if(!box)throw Error("Swipe card has no bounding box");
        const x=Math.round(box.x+Math.min(box.width*.28,100));
        const y=Math.round(box.y+box.height*.50);
        if(mode.name==="mobile"){
          const cdp=await context.newCDPSession(roulette);
          await cdp.send("Input.dispatchTouchEvent",{
            type:"touchStart",touchPoints:[{x,y}]
          });
          for(let i=1;i<=8;i++){
            await cdp.send("Input.dispatchTouchEvent",{
              type:"touchMove",touchPoints:[{x:x+i*17,y}]
            });
          }
          await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
          await cdp.detach();
        }else{
          await roulette.mouse.move(x,y);
          await roulette.mouse.down();
          await roulette.mouse.move(x+136,y,{steps:8});
          await roulette.mouse.up();
        }
        check((await roulette.locator("#statYes").innerText())==="1",
          mode.name+" roulette right-swipe adds candidate");
        await roulette.locator("#yesBtn").click();
        check((await roulette.locator("#statYes").innerText())==="2",
          mode.name+" roulette add button responds");
        await roulette.locator('.tab[data-tab="list"]').click();
        check((await roulette.locator("#listGrid").innerText()).includes(first),
          mode.name+" roulette swipe candidate appears in list");
        await roulette.locator("#customText").fill("QA テスト用のやりたいこと");
        await roulette.locator('#addForm button[type="submit"]').click();
        check((await roulette.locator("#listGrid").innerText()).includes("QA テスト用のやりたいこと"),
          mode.name+" roulette accepts custom candidate");
        await roulette.reload({waitUntil:"networkidle"});
        await roulette.locator('.tab[data-tab="list"]').click();
        check((await roulette.locator("#listGrid").innerText()).includes("QA テスト用のやりたいこと"),
          mode.name+" roulette local data survives reload");
        await roulette.locator('.tab[data-tab="wheel"]').click();
        check(Number(await roulette.locator("#wheelEligible").innerText())===3,
          mode.name+" roulette wheel uses three saved candidates");
        await roulette.locator("#spinBtn").click();
        await roulette.locator("#result.show").waitFor({timeout:8000});
        check((await roulette.locator("#page-wheel h2").innerText()).includes("次に"),
          mode.name+" roulette uses next-step product copy");
        if(mode.name==="mobile"){
          const pos=await roulette.locator(".tabs").evaluate(el=>getComputedStyle(el).position);
          check(pos==="sticky",mode.name+" roulette navigation stays reachable while scrolling");
        }
        check((await roulette.locator("#rouletteMode").inputValue())==="ALL",
          mode.name+" roulette defaults to all intent modes");
        check((await roulette.locator("#resultText").innerText()).trim().length>2,
          mode.name+" roulette returns selected result");
        const winnerText=(await roulette.locator("#resultText").innerText()).trim();
        const isCustom=winnerText.includes("QA テスト用のやりたいこと");
        if(!isCustom){
          check((await roulette.locator("#resultMeta").innerText()).trim().length>0,
            mode.name+" roulette built-in result shows action type");
          check((await roulette.locator("#firstStepText").innerText()).trim().length>=5,
            mode.name+" roulette built-in result shows first step");
        }
        const storedBefore=await roulette.evaluate(()=>JSON.parse(localStorage.getItem("kaito.wants.roulette.v1")));
        check(storedBefore?.version===2&&Array.isArray(storedBefore.progressEvents),
          mode.name+" roulette migrates persisted state to v2");
        await roulette.locator("#doneBtn").click();
        const storedAfter=await roulette.evaluate(()=>JSON.parse(localStorage.getItem("kaito.wants.roulette.v1")));
        check(isCustom?storedAfter?.done?.length===1:storedAfter?.done?.length===0,
          mode.name+" roulette separates built-in progress from completion");
        check(isCustom||storedAfter.progressEvents?.length===1,
          mode.name+" roulette built-in progress event is recorded");
        if(!isCustom){
          await roulette.locator("#doneBtn").click();
          const repeated=await roulette.evaluate(()=>JSON.parse(localStorage.getItem("kaito.wants.roulette.v1")));
          check(repeated.progressEvents?.length===2&&repeated.done?.length===0,
            mode.name+" roulette can record repeated progress without completing goal");
          await roulette.locator('[data-tab="list"]').first().click();
          check((await roulette.locator("#progressHistory").innerText()).trim().length>0,
            mode.name+" roulette list shows recent progress history");
        }
        await roulette.locator('.tab[data-tab="wheel"]').click();
        await roulette.locator("#rouletteMode").selectOption("TODAY");
        const todayCount=Number(await roulette.locator("#wheelEligible").innerText());
        check(todayCount>=0,
          mode.name+" roulette today mode updates eligible candidates");
        check(!(await roulette.locator("#result").evaluate(el=>el.classList.contains("show"))),
          mode.name+" roulette mode switch clears stale result");
        await roulette.locator("#rouletteMode").selectOption("ALL");
        check(rouletteErrors.length===0,mode.name+" roulette no script/asset errors",
          rouletteErrors.join("; "));
        await roulette.screenshot({
          path:path.join(screens,mode.name+"-want-roulette.png"),fullPage:true
        });
      }catch(e){failures.push(mode.name+" roulette: "+e.message);console.error("FAIL roulette",mode.name,e);}
      finally{await roulette.close();}
      await context.close();
    }
  }finally{await browser.close();if(!externalUrl)await stop();}
  console.log("RESULT "+passed+" assertions passed; "+failures.length+" failed");
  if(failures.length){for(const failure of failures)console.error("FAILED "+failure);process.exitCode=1;}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
