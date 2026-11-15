/**
 * A05 D234 editorial research-pack guards.
 * Protects against accidentally treating C36 candidates or human protocols
 * as an approved production question/scoring change.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
const base=new URL("../",import.meta.url);
const json=f=>JSON.parse(readFileSync(new URL(f,base),"utf8"));
const audit=json("research/a05/d232-content-triage-and-c36-candidates.json");
const prior=json("research/a05/d211-semantic-collision-triage.json");
const milestone=json("research/a05/d209-milestone-gates.json");
const selection=json("research/a05/d226-answer-intensity-selection.json");
const prereg=readFileSync(new URL("docs/A05_D233_HUMAN_RESEARCH_PREREG_PROTOCOL_20261116.md",base),"utf8");
const builder=readFileSync(new URL("scripts/a05-d210-build-offline-form.mjs",base),"utf8");
const bankById=new Map(BANK.items.map(x=>[x.bank_id,x]));
test("D232: all 50 bank items match original version and no scoring approvals",()=>{
 assert.equal(audit.schema,"A05-D232-CONTENT-TRIAGE-1");
 assert.equal(audit.source_bank,BANK.schema);
 assert.equal(audit.items.length,50);
 assert.equal(new Set(audit.items.map(x=>x.id)).size,50);
 for(const a of audit.items){
  const original=bankById.get(a.id);
  assert.ok(original,"Invalid bank item");
  assert.equal(a.axis,original.axis);
  assert.equal(a.family,original.proposed_semantic_family||"E_AUX");
  assert.equal(a.known_residual_risk,original.known_residual_risk||null);
  assert.equal(a.human_validation,"NOT_DONE");
  assert.equal(original.production_scoring_approved,false);
  assert.equal(original.user_formally_approved,false);
 }
});
test("D232: exactly 18 original collision pairs with specific independent interview contrasts",()=>{
 assert.equal(audit.targeted_pair_count,undefined); // count in counts, no redundant marker
 assert.equal(audit.counts.flagged_pairs,18);
 assert.equal(audit.pairs.length,prior.prioritized.length);
 assert.equal(audit.counts.flagged_unique_items,36);
 for(let i=0;i<audit.pairs.length;i++){
  const a=audit.pairs[i],b=prior.prioritized[i];
  assert.deepEqual(a.ids,b.ids);
  assert.equal(a.axis,b.axis);
  assert.equal(a.priority,b.priority);
  assert.equal(a.suspected_confusion,b.risk);
  assert.ok(a.distinction.length>6&&a.contrast_probe.length>7&&a.reject_if.length>6);
  assert.equal(a.human_cognitive_evidence,"NONE");
  assert.equal(a.independence_confirmed,false);
  assert.equal(a.scoring_approved,false);
  for(const id of a.ids)assert.ok(audit.items.find(q=>q.id===id).pair_ids.includes(a.pair));
 }
});
test("D232: three independent C36 replacement candidates remain out of production and sampled scoring",()=>{
 const candidates=audit.C36_replacement_candidates;
 assert.deepEqual(candidates.map(x=>x.id),["C36-R1","C36-R2","C36-R3"]);
 assert.equal(candidates.length,3);
 const original=bankById.get("A05-V1-36");
 for(const c of candidates){
  assert.ok(c.stem!==original.stem);
  assert.notEqual(c.stem,bankById.get("A05-V1-35").stem);
  assert.ok(c.left&&c.right&&c.left!==c.right);
  assert.ok(c.critical_competitors.length>0);
  assert.ok(c.accept_only_if.length>20);
  assert.ok(c.critical_competitors.every(id=>bankById.has(id)));
  assert.ok(!BANK.items.some(q=>q.bank_id===c.id));
 }
 for(let i=0;i<512;i++){
  const m=drawResearchHoldFilteredManifest("D234-stress-"+i);
  assert.ok(m.questions.every(q=>!["A05-V1-31","A05-V1-32","A05-V1-36","C36-R1","C36-R2","C36-R3"].includes(q.id)));
  assert.equal(m.questions.length,30);
 }
});
test("D232: B/C independent response probes are research-only and already represented in D210",()=>{
 assert.equal(audit.BC_independent_probes.length,4);
 const ids=["B_AUTONOMY","B_CONNECTION","C_FUTURE","C_PRESENT"];
 for(const id of ids)assert.ok(builder.includes('"'+id+'"'));
 assert.ok(audit.BC_independent_probes.every(x=>x.non_scoring===true));
 assert.deepEqual(audit.BC_independent_probes.map(x=>x.maps_to_existing_D210_id),ids);
 assert.ok(audit.pairs.find(p=>p.pair==="B14-15").contrast_probe.includes("1～7"));
 assert.ok(!audit.pairs.find(p=>p.pair==="B14-15").contrast_probe.includes("0～4"));
 assert.ok(audit.BC_independent_probes.every(x=>x.scale.startsWith("1-7")));
 for(const id of ids)assert.ok(prereg.includes(id));
});
test("D233: preregistration explicitly does not claim human results, or promote any gate",()=>{
 assert.ok(prereg.includes("実回答は未取得"));
 assert.ok(prereg.includes("対象：A05価値観"));
 for(const s of ["G1","G3","G4","G5","C36-R1","C36-R2","C36-R3","p=1.5","50問","18組","自動収集されない"])
  assert.ok(prereg.includes(s),s);
 assert.deepEqual(Object.fromEntries(milestone.gates.filter(x=>x.id!=="G0_TECHNICAL_BASELINE"&&x.id!=="G2_RESEARCH_INSTRUMENT")
  .map(x=>[x.id.split("_")[0],x.status])),{G1:"BLOCKED",G3:"AWAITING_DATA",G4:"AWAITING_DATA",G5:"BLOCKED"});
 assert.equal(milestone.release.allowed,false);
 assert.equal(selection.selected.power,1.5);
 assert.equal(selection.evaluation_status.passed,false);
 assert.equal(audit.immutability.live_scoring_changed,false);
 assert.equal(audit.immutability.UI_changed,false);
});
