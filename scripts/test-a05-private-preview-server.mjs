import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
const script=new URL("../preview/a05/server.mjs",import.meta.url);
async function launch(){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script.pathname],{
   cwd:process.cwd(),env:{...process.env,PORT:"0",A05_PREVIEW_SECRET:""},
   stdio:["ignore","pipe","pipe"]
  });
  let seen="",stderr="",settled=false;
  child.stdout.on("data",chunk=>{
   seen+=String(chunk);
   const match=seen.match(/A05_PUBLIC_PREVIEW_READY port=(\d+)/);
   if(match&&!settled){settled=true;resolve({child,port:Number(match[1])});}
  });
  child.stderr.on("data",chunk=>{stderr+=String(chunk);});
  child.on("exit",code=>{
   if(!settled){settled=true;reject(new Error("Server exited "+code+": "+stderr));}
  });
  child.on("error",err=>{if(!settled){settled=true;reject(err);}});
 });
}
async function close(child){
 if(child.exitCode!==null)return;
 child.kill();
 await once(child,"exit");
}
test("Public preview requires no login, serves diagnosis and research, and never accepts responses",async()=>{
 const {child,port}=await launch();
 try{
  const base="http://127.0.0.1:"+port;
  const r=await fetch(base+"/");
  assert.equal(r.status,200);
  assert.match(r.headers.get("content-type"),/text\/html/);
  assert.match(r.headers.get("cache-control"),/no-store/);
  assert.match(r.headers.get("x-robots-tag"),/noindex/);
  assert.equal(r.headers.get("www-authenticate"),null);
  const html=await r.text();
  assert.match(html,/A05｜かんたん価値観診断（試作）/);
  assert.match(html,/A05-D219-UNVALIDATED-DEMO-1/);
  assert.doesNotMatch(html,/__D219_DATA__/);
  assert.doesNotMatch(html,/A05_PREVIEW_SECRET/);
  const variants=["/index.html","/diagnosis","/diagnosis/","/?source=phone"];
  for(const path of variants){
   const x=await fetch(base+path);
   assert.equal(x.status,200,path);
   assert.match(await x.text(),/A05-D219-UNVALIDATED-DEMO-1/);
  }
  const research=await fetch(base+"/research");
  assert.equal(research.status,200);
  assert.match(await research.text(),/A05-D210-RESEARCH-FORM-DATA-1/);
  const researchSlash=await fetch(base+"/research/");
  assert.equal(researchSlash.status,200);
  const head=await fetch(base+"/",{method:"HEAD"});
  assert.equal(head.status,200);
  assert.equal((await head.text()).length,0);
  const health=await fetch(base+"/health");
  assert.equal(health.status,200);
  assert.equal(await health.text(),"ok");
  const robots=await fetch(base+"/robots.txt");
  assert.equal(robots.status,200);
  assert.match(await robots.text(),/Disallow: \//);
  const post=await fetch(base+"/",{method:"POST",body:"answers=secret"});
  assert.equal(post.status,405);
  const unknown=await fetch(base+"/wrong-path");
  assert.equal(unknown.status,404);
 }finally{await close(child);}
});
