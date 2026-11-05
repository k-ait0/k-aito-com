/** A05 D104: real Chromium printable PDF and text-zoom smoke; no URL navigation. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const filename=join(__dirname,'../projects/kidp/life-design-lab/a05/reflection-d101.html');
const source=readFileSync(filename,'utf8');
const bytes=Buffer.from(source,'utf8');
const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(blob,'a20c5676e3e22a547f03141b0907e852ac2edebf');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  for(const width of [320,390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>requests.push(r.url()));
   await page.setContent(source,{waitUntil:'load'});
   for(const percent of [100,200,400]){
    const metrics=await page.evaluate(value=>{
     document.documentElement.style.fontSize=value+'%';
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      fontSize:getComputedStyle(document.documentElement).fontSize};
    },percent);
    assert.equal(metrics.scrollWidth<=metrics.width,true,'overflow at '+width+'px x '+percent+'%');
    assert.equal(parseFloat(metrics.fontSize),16*percent/100);
    await page.locator('#case-picker').selectOption('7');
    assert.match(await page.locator('#case-name').innerText(),/例8/);
    await page.locator('#next').click();
    assert.match(await page.locator('#reflection-progress').innerText(),/2 \/ 4/);
    await page.locator('#restart').click();
   }
   assert.deepEqual(errors,[]);
   assert.deepEqual(requests,[]);
   await page.close();
  }
  const sheet=await browser.newPage({viewport:{width:1280,height:850}});
  await sheet.setContent(source,{waitUntil:'load'});
  await sheet.emulateMedia({media:'print'});
  assert.equal(await sheet.locator('#print-worksheet-page').isVisible(),true);
  assert.equal(await sheet.locator('#print-worksheet-page h2').count(),4);
  assert.equal(await sheet.locator('#case-picker').isVisible(),false);
  const pdf=await sheet.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
  assert.ok(pdf.subarray(0,8).toString('latin1').startsWith('%PDF-'));
  assert.ok(pdf.length>10000);
  const pdfRaw=pdf.toString('latin1');
  const count=[...pdfRaw.matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(count,1,'worksheet must print as exactly one A4 page');
  assert.match(pdfRaw,/\/MediaBox\s*\[\s*0\s+0\s+594\.\d+\s+841\.\d+\s*\]/);
  await sheet.close();
  console.log('A05 D104 PASS: 3 viewport widths x 3 text sizes, one-page A4 PDF, zero external requests');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
