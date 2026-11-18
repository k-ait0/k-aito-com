import test from "node:test";
import assert from "node:assert/strict";

const origin="https://a05-mobile-review-preview.up.railway.app";
async function request(path,opts={}){
 let last;
 for(let i=0;i<12;i++){
  try{
   const r=await fetch(origin+path,{signal:AbortSignal.timeout(12000),...opts});
   if(r.status===502||r.status===503||r.status===504){
    last=new Error("HTTP "+r.status);
   }else{return r;}
  }catch(e){last=e;}
  await new Promise(resolve=>setTimeout(resolve,2500));
 }
 throw new Error("A05 external preview unreachable: "+(last?.message||"unknown"));
}
test("Unauthenticated public URL serves the real simple 30-question app",async()=>{
 const r=await request("/");
 assert.equal(r.status,200,"Preview root must not return 401/404");
 assert.match(r.headers.get("content-type")||"",/text\/html/);
 assert.match(r.headers.get("x-robots-tag")||"",/noindex/);
 assert.equal(r.headers.get("www-authenticate"),null);
 const body=await r.text();
 assert.match(body,/A05｜かんたん価値観診断（試作）/);
 assert.match(body,/A05-D219-UNVALIDATED-DEMO-1/);
 assert.match(body,/診断を始める/);
 assert.doesNotMatch(body,/__D219_DATA__/);
});
test("Research route is accessible without login and POST answers are rejected",async()=>{
 const research=await request("/research");
 assert.equal(research.status,200);
 assert.match(await research.text(),/A05-D210-RESEARCH-FORM-DATA-1/);
 const health=await request("/health");
 assert.equal(health.status,200);
 const post=await request("/",{method:"POST",body:"answers=not-for-server"});
 assert.equal(post.status,405);
});
