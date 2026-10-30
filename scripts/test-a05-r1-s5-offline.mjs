import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const text=readFileSync(new URL("../projects/kidp/life-design-lab/a05/r1-s5-offline.html",import.meta.url),"utf8");
const jsonFromId=id=>{
 const re=new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>');
 const match=text.match(re);
 assert.ok(match,"Missing "+id);
 return JSON.parse(match[1]);
};
test("offline page embeds complete source and 112 candidates",()=>{
 const m=jsonFromId("offline-master-data");
 const a=jsonFromId("offline-alternates-data");
 const t=jsonFromId("offline-types-data");
 assert.equal(m.rows.length,136);
 assert.equal(a.proposals.length,112);
 assert.equal(t.length,16);
 assert.equal(new Set(m.rows.map(x=>x.pairId)).size,136);
 assert.equal(m.release,"NO_GO");
 assert.ok(m.rows.every(r=>r.firstHumanReview==="PENDING"&&r.publicationApproved===false));
});
test("no network or external dependencies in standalone HTML",()=>{
 assert.match(text,/connect-src 'none'/);
 assert.match(text,/noindex,nofollow,noarchive/);
 assert.doesNotMatch(text,/<script[^>]*src\s*=/i);
 assert.doesNotMatch(text,/<link[^>]*href\s*=/i);
 assert.doesNotMatch(text,/fetch\s*\(/);
 assert.doesNotMatch(text,/XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
 assert.match(text,/offlineReady/);
 assert.match(text,/draft-variants/);
});
