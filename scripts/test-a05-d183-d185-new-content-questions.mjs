import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=path=>JSON.parse(read(path));
const hash=path=>{const s=read(path);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex")};
const d183=json("research/a05/d183-twentyfour-new-content-question-drafts.json");
const d184=json("research/a05/d184-collision-audit-twentyfour-new-question-drafts.json");
const d146=json("research/a05/d146-50slot-before-after-quality-proposals.json");
const report=read("docs/A05_V2_D185_TWENTYFOUR_ACTUAL_NEW_QUESTIONS_AND_DEDUP_20261111.md");
test("Exactly 24 newly authored A-D question stems have nonidentical poles",()=>{
 assert.equal(d183.drafts.length,24);
 assert.equal(new Set(d183.drafts.map(x=>x.id)).size,24);
 assert.equal(new Set(d183.drafts.map(x=>[x.stem,x.left,x.right].join("\0"))).size,24);
 for(const x of d183.drafts)assert.ok(x.stem.length>=25&&x.left.length>6&&x.right.length>6&&x.left!==x.right,x.id);
});
test("Six new drafts per axis, not mixed into E",()=>{
 for(const a of ["A","B","C","D"])assert.equal(d183.drafts.filter(x=>x.axis===a).length,6);
 assert.equal(d183.drafts.filter(x=>x.axis==="E").length,0);
});
test("All 24 new IDs have one review decision",()=>{
 assert.equal(d184.cases.length,24);
 assert.deepEqual(new Set(d184.cases.map(x=>x.new_id)),new Set(d183.drafts.map(x=>x.id)));
});
test("Six possible new content questions are separate from strong duplicates",()=>{
 assert.equal(d184.counts.NEW_CONTENT_POSSIBILITY,6);
 assert.equal(d184.counts.HIGH_OVERLAP_HOLD,3);
 assert.equal(d184.counts.DUPLICATE_REJECT,10);
 assert.equal(d184.counts.RESEARCH_ONLY,5);
 assert.deepEqual(d184.most_promising_ids,["A-N02","A-N03","B-N03","C-N01","C-N03","D-N02"]);
});
test("Every collision reference points to a real historical source or recorded probe",()=>{
 const allowed=new Set([...d146.items.map(x=>x.old_id),"D181-10C","D181-8C","B-G1"]);
 for(const row of d184.cases)assert.ok(allowed.has(row.closest_historical_id),row.new_id+" bad reference");
});
test("All new drafts and audit rows map to the same axis",()=>{
 const map=new Map(d183.drafts.map(x=>[x.id,x]));
 for(const row of d184.cases)assert.equal(row.axis,map.get(row.new_id)?.axis);
});
test("No new draft is mistaken for an approved or independent score item",()=>{
 assert.equal(d183.approved_new_scored_items,0);
 assert.equal(d183.confirmed_new_semantic_families,0);
 assert.equal(d184.approved_new_scored_items,0);
 assert.equal(d184.confirmed_new_families,0);
 assert.ok(d183.drafts.every(x=>!x.scored_approved&&!x.standalone_semantic_distinctness_confirmed&&!x.respondent_evidence));
 assert.ok(d184.cases.every(x=>!x.add_to_bank&&!x.semantic_family_established));
});
test("The old 50/30, 16 type and two-per-family contract is unmodified",()=>{
 assert.equal(d183.user_rule.fixed_pool,50);
 assert.equal(d183.user_rule.fixed_draw,30);
 assert.equal(d183.user_rule.E_fixed,2);
 assert.equal(d183.user_rule.types,16);
 assert.equal(d183.user_rule.exact_duplicates,0);
 assert.equal(d183.user_rule.maximum_per_semantic_family,2);
 assert.equal(d183.baseline_unresolved_main_axis_slots,32);
 assert.equal(d184.baseline_unresolved_slots,32);
});
test("Source Git blob references are exact",()=>{
 for(const [p,sha] of Object.entries(d183.source_sha))assert.equal(sha,hash(p),p);
 for(const [p,sha] of Object.entries(d184.source_shas))assert.equal(sha,hash(p),p);
});
test("All 24 full new stems and sides appear in the human-readable report",()=>{
 for(const q of d183.drafts){
  assert.ok(report.includes(q.stem),q.id+" stem");
  assert.ok(report.includes(q.left),q.id+" left");
  assert.ok(report.includes(q.right),q.id+" right");
 }
});
test("Review statuses and closest IDs appear for all 24",()=>{
 for(const row of d184.cases){
  assert.ok(report.includes(row.new_id),row.new_id);
  assert.ok(report.includes(row.closest_historical_id),row.new_id+" anchor");
  assert.ok(report.includes(row.reason),row.new_id+" reason");
 }
});
test("Research manuscript makes no unsupported quantitative completion claim",()=>{
 assert.ok(report.includes("採用：0問")||report.includes("正式承認：0問"));
 assert.ok(report.includes("未充足32枠"));
 assert.ok(report.includes("新しい採点問として正式承認：0問"));
 assert.equal(d183.production_changed,false);
 assert.equal(d184.production_changed,false);
});
