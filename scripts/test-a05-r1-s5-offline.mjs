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

test("112-pair startup guard and browser QA assertions are version-aligned",()=>{
 const controller=readFileSync(new URL("../projects/kidp/life-design-lab/a05/r1-s5-offline-controller.js",import.meta.url),"utf8");
 const browserTest=readFileSync(new URL("qa_a05_r1_s5_offline_browser.cjs",import.meta.url),"utf8");
 assert.match(controller,/alternates\.proposals\.length===112&&byAlternative\.size===112/);
 assert.match(text,/alternates\.proposals\.length===112&&byAlternative\.size===112/);
 assert.doesNotMatch(text,/byAlternative\.size===8/);
 assert.match(browserTest,/variantPairs=new Set\(\)/);
 assert.match(browserTest,/variantPairs\.size,112/);
});

test("offline side-by-side review exposes both versions without approval",()=>{
 assert.match(text,/id="review-compare"/);
 assert.match(text,/id="compare-v04-description"/);
 assert.match(text,/id="compare-v05-description"/);
 assert.match(text,/id="compare-v04-prompts"/);
 assert.match(text,/id="compare-v05-prompts"/);
 assert.match(text,/review\.hidden=!alt/);
});

test("only P2/P3 have 112 reversible, unapproved v0.5 drafts",()=>{
 const master=jsonFromId("offline-master-data"),changes=jsonFromId("offline-alternates-data");
 const byId=new Map(master.rows.map(row=>[row.pairId,row]));
 const allowed=master.rows.filter(row=>row.priority==="P2_B1_DIFFERENCE"||row.priority==="P3_OTHER");
 assert.equal(allowed.length,112);
 let originalEight=0,programmatic104=0;
 for(const alt of changes.proposals){
   const row=byId.get(alt.pairId);
   assert.ok(row,alt.pairId);
   assert.ok(allowed.some(x=>x.pairId===alt.pairId),alt.pairId);
   assert.equal(alt.sourceDescription,row.draftDescription,alt.pairId);
   assert.deepEqual(alt.sourcePrompts,row.draftConversationQuestions,alt.pairId);
   assert.equal(alt.firstReviewStatus,"PENDING");
   assert.equal(alt.secondReviewStatus,"PENDING");
   assert.equal(alt.approved,false);
   assert.equal(alt.publicationApproved,false);
   if(alt.provenance==="PROGRAMMATIC_104_PAIR_EDITORIAL_DRAFT_NO_HUMAN_REVIEW")programmatic104++;
   else originalEight++;
 }
 assert.equal(originalEight,8);
 assert.equal(programmatic104,104);
 assert.equal(new Set(changes.proposals.map(x=>x.pairId)).size,112);
});
