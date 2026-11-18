import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ENDPOINTS,checkLiveBytes} from "./a05-d249-live-pages-audit.mjs";
const original=readFileSync(new URL("../research/a05/generated/d219-simple-diagnosis.html",import.meta.url));
const preview=readFileSync(new URL("../research/a05/generated/d246-isolated-midpoint-yn-preview.html",import.meta.url));
function mockFetch(contents){
 return async url=>{
  const i=ENDPOINTS.indexOf(url);
  assert.ok(i>=0);
  const buf=contents[i];
  return {ok:true,url,headers:{get:key=>key==="content-type"?"text/html; charset=utf-8":null},
   arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};
 };
}
test("D249 root and Y/N byte-perfect deployed responses pass, no personal info",async()=>{
 const out=await checkLiveBytes([original,preview],{
  fetcher:mockFetch([original,preview]),attempts:1,intervalMs:0
 });
 assert.equal(out.status,"SUCCESS");
 assert.equal(out.checks.length,2);
 assert.ok(out.checks.every(x=>x.matches===true));
 assert.equal(out.checks[0].target,"D242_ROOT");
 assert.equal(out.checks[1].target,"D246_YN");
});
test("D249 site with a stale or altered Y/N response is rejected",async()=>{
 const stale=Buffer.from(preview.toString("utf8").replace(
  "A05-D246-ISOLATED-Y-N-PREVIEW-1","STALE-Y-N-DATA"));
 await assert.rejects(
  checkLiveBytes([original,preview],{fetcher:mockFetch([original,stale]),attempts:1,intervalMs:0}),
  /LIVE PAGE MISMATCH/);
});
test("D249 root and Y/N cannot be swapped",async()=>{
 await assert.rejects(checkLiveBytes([preview,original],{
  fetcher:mockFetch([preview,original]),attempts:1,intervalMs:0}),/Missing expected version/);
});
test("D249 reject cross-origin redirect",async()=>{
 await assert.rejects(checkLiveBytes([original,preview],{
  fetcher:async url=>({ok:true,url:"https://example.invalid",
   headers:{get:()=>"text/html"},arrayBuffer:async()=>Buffer.from(original)}),
  attempts:1,intervalMs:0}),/Redirect origin/);
});
