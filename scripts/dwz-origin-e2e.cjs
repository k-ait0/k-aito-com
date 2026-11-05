'use strict';
/**
 * DWZ R4 manual-only origin E2E. Browser & storage are real (no localStorage mock).
 * Usage: NODE_PATH=/path/to/playwright/node_modules node scripts/dwz-origin-e2e.cjs
 * Checks a temporary 127.0.0.1 site, not the public Xserver deployment.
 * Never touches production, GitHub Actions or existing browser profiles.
 */
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const {validateDiagnosticRows}=require('./dwz-origin-result-guard.cjs');
const root=path.resolve(__dirname,'..');
const appPath=path.join(root,'lab/dwz/index.html');
const diagnosticPath=path.join(root,'lab/dwz/diagnostics.html');
const captureKey='dwz-r4-compare-v11-capture/0.1.0';
const portfolioKey='dwz-r4-comparison-portfolio/0.1.0';
for(const p of [appPath,diagnosticPath])assert.ok(fs.existsSync(p),'Required file missing: '+p);
const allowed=new Map([
  ['/lab/dwz/',appPath],
  ['/lab/dwz/index.html',appPath],
  ['/lab/dwz/diagnostics.html',diagnosticPath]
]);
const server=http.createServer((req,res)=>{
  let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{res.writeHead(400).end();return;}
  const file=allowed.get(url.pathname);
  if(!file){res.writeHead(404).end();return;}
  res.writeHead(200,{
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  fs.createReadStream(file).pipe(res);
});
let browser=null,context=null,diagnosticContext=null,checks=0;
const engine=(process.env.DWZ_BROWSER_ENGINE||'chromium').toLowerCase();
assert.ok(['chromium','webkit'].includes(engine),'DWZ_BROWSER_ENGINE must be chromium or webkit');
function pass(message){checks++;console.log('PASS '+message);}
async function verify(label,condition){assert.ok(await condition(),label);pass(label);}
async function getStorage(page,key){return page.evaluate(k=>window.localStorage.getItem(k),key);}
async function fillForm(page,name,value){
  const input=page.locator('#scenario [name="'+name+'"]');
  await input.fill(String(value));
  await input.dispatchEvent('input');
}
async function waitForReady(page){
  await page.locator('#dwz-runtime-status[data-ready="true"]').waitFor({timeout:20000});
}
async function main(){
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  console.log('DWZ origin E2E target '+base+'/lab/dwz/');
  const probe=route=>new Promise((resolve,reject)=>{
    http.get(base+route,res=>{
      let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);
      res.on('end',()=>resolve({status:res.statusCode,text}));
    }).on('error',reject);
  });
  const home=await probe('/lab/dwz/'), diagnosticHtml=await probe('/lab/dwz/diagnostics.html');
  await verify('local HTTP serves actual app HTML',()=>home.status===200 && home.text.includes('資産取り崩しシミュレーター'));
  await verify('local HTTP serves diagnostic HTML',()=>diagnosticHtml.status===200 && diagnosticHtml.text.includes('ブラウザ動作診断'));
  const launchOptions={headless:true};
  if(engine==='chromium'){
    launchOptions.args=['--no-sandbox'];
    if(process.env.DWZ_CHROMIUM_PATH)launchOptions.executablePath=process.env.DWZ_CHROMIUM_PATH;
  }
  console.log('DWZ browser engine:',engine);
  browser=await (engine==='webkit'?webkit:chromium).launch(launchOptions);
  context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],escaped=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base+'/'))escaped.push(r.url());});
  let response;
  try {response=await page.goto(base+'/lab/dwz/',{waitUntil:'domcontentloaded',timeout:20000});}
  catch(e){if(String(e).includes('ERR_BLOCKED_BY_ADMINISTRATOR')){
    console.error('BLOCKED_BY_ENVIRONMENT: '+engine+' could not navigate to 127.0.0.1; no E2E results are claimed.');
    process.exitCode=3;return;
  }throw e;}
  await verify('HTTP 200',()=>response&&response.status()===200);
  await waitForReady(page);pass('financial UI startup');
  await verify('quick mode default',()=>page.evaluate(()=>document.body.dataset.dwzMode==='quick'));
  await verify('localStorage initially empty',async()=>(await getStorage(page,captureKey))===null && (await getStorage(page,portfolioKey))===null);
  await page.locator('#dwz-run').click();
  await verify('initial reverse calculation 45,360 yen',async()=>await page.locator('#output').innerText().then(t=>t.includes('45,360')));
  await page.locator('#dwz-mode-detail').click();
  await verify('detail mode',()=>page.evaluate(()=>document.body.dataset.dwzMode==='detail'));
  await fillForm(page,'assets',6200);
  await page.locator('#r4-save-local').click();
  await verify('explicit localStorage save',async()=>(await getStorage(page,captureKey))?.length>100);
  const saved=await getStorage(page,captureKey);
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await waitForReady(page);
  await verify('persistent value survives full reload',async()=>(await getStorage(page,captureKey))===saved);
  await verify('not automatically restored',async()=>(await page.locator('#scenario [name="assets"]').inputValue())==='5000');
  await page.locator('#dwz-mode-detail').click();
  await page.locator('#r4-restore-local').click();
  await verify('restore reads previously saved value',async()=>(await page.locator('#scenario [name="assets"]').inputValue())==='6200');
  await verify('restore does not automatically recalculate',()=>page.evaluate(()=>document.querySelector('#output').dataset.status===undefined && document.querySelector('#output').textContent.includes('手動で計算')));
  page.once('dialog',d=>d.accept());
  await page.locator('#r4-purge-local').click();
  await verify('user-approved purge removes the key',async()=>(await getStorage(page,captureKey))===null);
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await waitForReady(page);
  await verify('purge remains after reload',async()=>(await getStorage(page,captureKey))===null);
  await page.locator('#dwz-mode-detail').click();
  await page.locator('#r4-portfolio-name').fill('QA_BASELINE_ONLY');
  await page.locator('#r4-portfolio-add').click();
  await page.locator('#r4-portfolio-name').fill('QA_PENSION_CHANGE');
  await fillForm(page,'pension',240);
  await page.locator('#r4-portfolio-add').click();
  await verify('two portfolio scenarios registered',async()=>(await page.locator('#r4-portfolio-count').innerText()).trim()==='2');
  await page.locator('#r4-portfolio-save').click();
  await verify('portfolio saved explicitly',async()=>(await getStorage(page,portfolioKey))?.length>100);
  const portfolioStored=await getStorage(page,portfolioKey);
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await waitForReady(page);
  await verify('portfolio survives full reload',async()=>(await getStorage(page,portfolioKey))===portfolioStored);
  await page.locator('#dwz-mode-detail').click();
  await verify('portfolio not automatically restored',async()=>(await page.locator('#r4-portfolio-count').innerText()).trim()==='0');
  await page.locator('#r4-portfolio-restore').click();
  await verify('portfolio explicitly restored',async()=>(await page.locator('#r4-portfolio-count').innerText()).trim()==='2');
  page.once('dialog',d=>d.accept());
  await page.locator('#r4-portfolio-purge').click();
  await verify('portfolio purge clears storage',async()=>(await getStorage(page,portfolioKey))===null);
  await verify('no browser JS errors',()=>errors.length===0);
  await verify('no external network requests',()=>escaped.length===0);
  // Separate browser context prevents app test storage from affecting the opt-in diagnostic.
  diagnosticContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const diagnostic=await diagnosticContext.newPage();
  diagnostic.on('request',r=>{if(!r.url().startsWith(base+'/'))escaped.push(r.url());});
  const diagnosticResponse=await diagnostic.goto(base+'/lab/dwz/diagnostics.html',{waitUntil:'domcontentloaded',timeout:20000});
  await verify('diagnostic HTTP 200',()=>diagnosticResponse.status()===200);
  await verify('diagnostic has independent empty localStorage',async()=>
    (await getStorage(diagnostic,captureKey))===null && (await getStorage(diagnostic,portfolioKey))===null);
  async function readFinishedDiagnostics(){
    await diagnostic.waitForFunction(()=>{
      const label=document.querySelector('#status')?.textContent||'';
      return label.startsWith('診断完了') || label.startsWith('診断が途中で停止');
    },null,{timeout:30000});
    const statusText=await diagnostic.locator('#status').innerText();
    assert.ok(statusText.startsWith('診断完了'),'Diagnostic did not complete: '+statusText);
    return diagnostic.locator('#results tr').evaluateAll(trs=>trs.map(tr=>{
      const cells=tr.querySelectorAll('td');
      return {label:(cells[0]?.textContent||'').trim(),status:(cells[1]?.textContent||'').trim().split(/\s/)[0]};
    }).filter(row=>row.label));
  }
  await diagnostic.locator('#run').click();
  const standardRows=await readFinishedDiagnostics();
  await verify('standard diagnostic required checks PASS, not SKIP',()=>validateDiagnosticRows(standardRows,[
    '診断ページのJavaScript','アプリJavaScriptの起動','初期条件の逆算結果',
    '資金不足の判定','一時キーの保存・読込・削除','既存の条件保存キーを変更していない'
  ]));
  await diagnostic.locator('#deep-save').check();
  await diagnostic.locator('#run').click();
  const deepRows=await readFinishedDiagnostics();
  await verify('opt-in reload diagnostic all persistent steps PASS, not SKIP',()=>validateDiagnosticRows(deepRows,[
    'アプリの明示保存','アプリ再読込後の保存値一致','再読込後のアプリ復元',
    '復元後は自動計算せず手動待ち','再読込後のアプリ保存削除'
  ]));
  await verify('diagnostic generated no external network requests',()=>escaped.length===0);
  await verify('diagnostic leaves both saved keys empty',async()=>{
    const child=diagnostic.frameLocator('iframe#app');
    return child.locator('body').evaluate(()=>window.localStorage.getItem('dwz-r4-compare-v11-capture/0.1.0')===null && window.localStorage.getItem('dwz-r4-comparison-portfolio/0.1.0')===null);
  });
  console.log('DWZ REAL-ORIGIN E2E: '+checks+'/'+checks+' PASS ('+engine+', localhost origin, no storage mocks)');
}
main().catch(e=>{console.error('DWZ REAL-ORIGIN E2E FAIL after '+checks+' PASS: '+(e?.stack||e));process.exitCode=1})
.finally(async()=>{try{await diagnosticContext?.close();await context?.close();await browser?.close();}finally{await new Promise(r=>server.close(r));}});
