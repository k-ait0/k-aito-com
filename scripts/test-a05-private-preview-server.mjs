import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
const script=new URL("../preview/a05/server.mjs",import.meta.url);
const secret="test-only-secret-value-over-32-chars-abcdef";
const user="review";
const auth="Basic "+Buffer.from(user+":"+secret).toString("base64");
function start(extra={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script.pathname],{
   cwd:process.cwd(),
   env:{...process.env,A05_PREVIEW_USER:user,A05_PREVIEW_SECRET:secret,PORT:"0",...extra},
   stdio:["ignore","pipe","pipe"]
  });
  let seen="",err="";
  child.stdout.on("data",d=>{seen+=d;if(seen.includes("A05_PRIVATE_PREVIEW_READY port=")){
    const port=Number(seen.match(/port=(\d+)/)[1]);resolve({child,port});
  }});
  child.stderr.on("data",d=>{err+=d;});
  child.on("exit",code=>{if(!seen.includes("A05_PRIVATE_PREVIEW_READY"))reject(new Error("Server exited "+code+": "+err));});
  child.on("error",reject);
 });
}
async function cleanup(child){if(!child.killed)child.kill();await once(child,"exit").catch(()=>{});}
test("Refuse to start without valid secret",async()=>{
 const child=spawn(process.execPath,[script.pathname],{
  env:{...process.env,A05_PREVIEW_SECRET:"",PORT:"0"},stdio:"ignore"
 });
 const [code]=await once(child,"exit");assert.equal(code,78);
});
test("Credentials, noindex, and zero-answer-collection preview",async()=>{
 const {child,port}=await start();
 try{
  const base="http://127.0.0.1:"+port;
  let r=await fetch(base+"/");
  assert.equal(r.status,401);
  assert.match(r.headers.get("www-authenticate"),/Basic realm/);
  assert.equal(r.headers.get("cache-control").includes("no-store"),true);
  assert.equal(r.headers.get("x-robots-tag").includes("noindex"),true);
  assert.doesNotMatch(await r.text(),/同じ2時間|価値観の設問を検証する/);
  for(const wrong of [
   "Basic "+Buffer.from("review:wrong").toString("base64"),
   "Bearer "+secret,"Basic *bad","Basic "+Buffer.from("wrong:"+secret).toString("base64")
  ]){r=await fetch(base+"/",{headers:{Authorization:wrong}});assert.equal(r.status,401);}
  r=await fetch(base+"/",{headers:{Authorization:auth}});
  assert.equal(r.status,200);
  assert.match(r.headers.get("content-type"),/text\/html/);
  assert.equal(r.headers.get("x-frame-options"),"DENY");
  const html=await r.text();
  assert.match(html,/A05｜かんたん価値観診断（試作）/);
  assert.match(html,/A05-D219-UNVALIDATED-DEMO-1/);
  assert.match(html,/A05-V1-49/);
  assert.doesNotMatch(html,/__D219_DATA__/);
  assert.doesNotMatch(html,/A05_PREVIEW_SECRET/);
  r=await fetch(base+"/research");
  assert.equal(r.status,401);
  r=await fetch(base+"/research",{headers:{Authorization:auth}});
  assert.equal(r.status,200);
  const researchHtml=await r.text();
  assert.match(researchHtml,/A05｜50問研究用回答フォーム/);
  assert.match(researchHtml,/A05-D210-RESEARCH-FORM-DATA-1/);
  assert.doesNotMatch(researchHtml,/__D210_EMBEDDED_DATA__/);
  r=await fetch(base+"/index.html",{headers:{Authorization:auth},method:"HEAD"});
  assert.equal(r.status,200);assert.equal((await r.text()).length,0);
  r=await fetch(base+"/unknown",{headers:{Authorization:auth}});
  assert.equal(r.status,404);
  r=await fetch(base+"/",{method:"POST",headers:{Authorization:auth},body:"answers=1"});
  assert.equal(r.status,405);
  r=await fetch(base+"/robots.txt");
  assert.equal(r.status,200);assert.match(await r.text(),/Disallow: \//);
 }finally{await cleanup(child);}
});
