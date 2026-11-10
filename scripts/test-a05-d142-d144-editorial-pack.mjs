/**
 * A05 D-142..144 editorial pack integrity tests.
 * Read-only; never edits a bank, scores answers or publishes content.
 * Run from any working directory:
 * node --test scripts/test-a05-d142-d144-editorial-pack.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const files = {
  bank: "../research/a05/d130-50item-editorial-candidate-bank.json",
  audit: "../research/a05/d131-full-50-editorial-screen.json",
  triage: "../research/a05/d142-full-50-item-content-disposition.json",
  rewrites: "../research/a05/d143-20-comparable-item-rewrite-drafts.json",
  gate: "../research/a05/d144-editorial-readiness-and-bank-gaps.json",
};
const raw = Object.fromEntries(Object.entries(files).map(([k,v]) => [k, readFileSync(new URL(v, import.meta.url),"utf8")]));
const parsed = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, JSON.parse(v)]));
const {bank,audit,triage,rewrites,gate} = parsed;
const unique = arr => new Set(arr).size === arr.length;
const count = (arr,fn) => arr.filter(fn).length;
function gitBlob(text) {
  return createHash("sha1").update("blob " + Buffer.byteLength(text) + "\0").update(text).digest("hex");
}
test("original 50 slots remain complete", () => assert.equal(bank.items.length,50));
test("original D131 audit still has all 50", () => assert.equal(audit.items.length,50));
test("D142 uniquely covers every original ID", () => {
  assert.equal(triage.items.length,50);
  assert.ok(unique(triage.items.map(x=>x.id)));
  assert.deepEqual(new Set(triage.items.map(x=>x.id)), new Set(bank.items.map(x=>x.id)));
});
test("50 original IDs are 12/12/12/12/2", () => {
  assert.deepEqual(Object.fromEntries("ABCDE".split("").map(a=>[a,count(triage.items,x=>x.axis===a)])),{A:12,B:12,C:12,D:12,E:2});
});
test("source bank/audit blob SHAs are unchanged", () => {
  assert.equal(gitBlob(raw.bank),triage.provenance.bank_sha);
  assert.equal(gitBlob(raw.audit),triage.provenance.audit_sha);
});
test("D142 original question text and axis match D130 and D131", () => {
  const bm = new Map(bank.items.map(x=>[x.id,x]));
  const am = new Map(audit.items.map(x=>[x.id,x]));
  for (const q of triage.items) {
    const b=bm.get(q.id),a=am.get(q.id);
    assert.equal(q.axis,b.axis);
    assert.equal(q.axis,a.axis);
    assert.equal(q.original_negative,b.negative);
    assert.equal(q.original_positive,b.positive);
    assert.equal(q.original_negative,a.negative);
    assert.equal(q.original_positive,a.positive);
  }
});
test("all six editorial dispositions cover exactly 50", () => {
  const expected={REWRITE:9,OUT_OF_CONSTRUCT:10,PROBE_ONLY:7,DUPLICATE_MERGE:11,PROVISIONAL_KEEP:11,STRUCTURE_HOLD:2};
  const actual=Object.fromEntries(Object.keys(expected).map(s=>[s,count(triage.items,q=>q.disposition===s)]));
  assert.deepEqual(actual,expected);
});
test("D143 uniquely covers exactly the 9 rewrite and 11 pilot-review IDs", () => {
  assert.equal(rewrites.items.length,20);
  assert.ok(unique(rewrites.items.map(x=>x.original_id)));
  const rset = new Set(triage.items.filter(x=>["REWRITE","PROVISIONAL_KEEP"].includes(x.disposition)).map(x=>x.id));
  assert.deepEqual(new Set(rewrites.items.map(x=>x.original_id)),rset);
});
test("D143 revisions retain original ID provenance, polarity format, balanced options", () => {
  const tm=new Map(triage.items.map(q=>[q.id,q]));
  for(const q of rewrites.items){
    const t=tm.get(q.original_id);
    assert.equal(q.axis,t.axis);
    assert.equal(q.original_negative,t.original_negative);
    assert.equal(q.original_positive,t.original_positive);
    assert.equal(q.format,"BIPOLAR_7_RESEARCH_DRAFT");
    assert.ok(q.stem.length>25 && q.negative.length>8 && q.positive.length>8);
    assert.notEqual(q.negative,q.positive);
  }
});
test("C-FU14 and C-FU15 stay an inseparable research context pair", () => {
  const pair=rewrites.items.filter(x=>x.relation_to_other_candidates==="PAIRED_CONTEXT_ONLY").map(x=>x.original_id).sort();
  assert.deepEqual(pair,["C-FU14","C-FU15"]);
});
test("E has no presumptively accepted rewrite", () => {
  assert.equal(count(rewrites.items,x=>x.axis==="E"),0);
  assert.equal(count(triage.items,x=>x.axis==="E"&&x.disposition==="STRUCTURE_HOLD"),2);
});
test("unapproved and unscored gates remain intact", () => {
  assert.equal(triage.production_eligible,false);
  assert.equal(rewrites.production_eligible,false);
  assert.equal(gate.guardrails.existing_30_question_form_unchanged,true);
  assert.equal(gate.guardrails.existing_random_draw_unchanged,true);
  assert.ok(rewrites.items.every(x=>x.approved===false&&x.scored===false&&x.independent_new_item===false));
  assert.equal(gate.currently_approved,0);
});
test("D144 reports optimistic editorial shortages but not approvals", () => {
  assert.deepEqual(gate.potential_editable_by_axis,{A:3,B:5,C:5,D:7,E:0});
  assert.deepEqual(gate.min_content_gaps_if_all_20_rewrites_become_conditional_pilot,{A:4,B:2,C:2,D:0,E:2});
  assert.equal(Object.values(gate.min_content_gaps_if_all_20_rewrites_become_conditional_pilot).reduce((a,b)=>a+b,0),10);
});
test("D144 references the current D142 and D143 blobs", () => {
  assert.equal(gitBlob(raw.triage),gate.verified_source_blob_shas["research/a05/d142-full-50-item-content-disposition.json"]);
  assert.equal(gitBlob(raw.rewrites),gate.verified_source_blob_shas["research/a05/d143-20-comparable-item-rewrite-drafts.json"]);
});
