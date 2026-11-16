/**
 * D249: independently confirm GitHub Pages serves byte-identical content to
 * the browser-tested D242 and D246 HTML. Deployment verification only.
 * Called after the workflow checks out gh-pages: pass the two /tmp HTML files.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
const sha=x=>createHash("sha256").update(x).digest("hex");
export const ENDPOINTS=[
 "https://k-ait0.github.io/k-aito-com/",
 "https://k-ait0.github.io/k-aito-com/preview/yn/"
];
function sourceCheck(buffer,i){
 const s=buffer.toString("utf8");
 const version=i===0?"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1":
  "A05-D246-ISOLATED-Y-N-PREVIEW-1";
 assert.ok(s.includes(version),"Missing expected version "+version);
 assert.ok(s.includes("noindex,nofollow,noarchive"),"Noindex required");
 assert.ok(s.includes("connect-src 'none'"),"No external connections allowed");
}
export async function checkLiveBytes(buffers,{attempts=36,intervalMs=5000,fetcher=fetch}={}){
 assert.equal(buffers.length,2);
 for(let i=0;i<2;i++)sourceCheck(buffers[i],i);
 const expected=buffers.map(sha);
 let last=[];
 for(let attempt=1;attempt<=attempts;attempt++){
  const failures=[],checks=[];
  for(let i=0;i<2;i++){
   try{
    const res=await fetcher(ENDPOINTS[i],{
     method:"GET",redirect:"follow",
     headers:{"Cache-Control":"no-cache","Accept":"text/html"},
     signal:AbortSignal.timeout(15000)
    });
    if(!res.ok)throw Error("HTTP "+res.status);
    if(!res.url.startsWith("https://k-ait0.github.io/k-aito-com/"))throw Error("Redirect origin");
    if(!String(res.headers.get("content-type")).toLowerCase().includes("text/html"))
     throw Error("Unexpected content-type");
    const bytes=Buffer.from(await res.arrayBuffer()),digest=sha(bytes);
    checks.push({target:i?"D246_YN":"D242_ROOT",
     bytes:bytes.length,sha256:digest,expectedSha256:expected[i],matches:digest===expected[i]});
    if(digest!==expected[i])failures.push("Byte mismatch on "+(i?"Y/N":"root"));
   }catch(err){
    failures.push((i?"Y/N":"root")+": "+String(err.message).slice(0,110));
   }
  }
  if(!failures.length)return {
   schema:"A05-D249-LIVE-PAGES-ATTESTATION-1",status:"SUCCESS",
   checkedAt:new Date().toISOString(),attempt,checks,
   note:"Public GitHub Pages HTML exactly matches two browser-tested builds. No personal responses transmitted."
  };
  last=failures;
  if(attempt<attempts)await new Promise(done=>setTimeout(done,intervalMs));
 }
 throw Error("D249 LIVE PAGE MISMATCH after "+attempts+" checks: "+last.join(" | "));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const paths=process.argv.slice(2);
 if(paths.length!==2)throw Error("Supply D242 root and D246 Y/N HTML paths");
 const report=await checkLiveBytes(paths.map(p=>readFileSync(p)));
 console.log("A05_D249_LIVE_SITE_VERIFIED "+JSON.stringify(report));
}
