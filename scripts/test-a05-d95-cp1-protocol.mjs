import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateD95Protocol,D95_SCHEMA,D95_DOMAINS,D95_DECISIONS}
 from "../projects/kidp/life-design-lab/a05/cp1-domain-protocol-d95.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const sources=[
 "docs/A05_D94_CP1_CONTENT_COVERAGE_20261105.json",
 "docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json",
 "docs/A05_D90_BC_PILOT_0_2_20261105.json"
];
const raws=sources.map(read);
const [d94,d93,d90]=raws.map(JSON.parse);
const protocol=JSON.parse(read("docs/A05_D95_CP1_DOMAIN_PROTOCOL_20261106.json"));
const sha=t=>createHash("sha1").update("blob "+Buffer.byteLength(t)+"\0").update(t).digest("hex");
const blobRefs=sources.map((path,i)=>({path,sha:sha(raws[i])}));
const check=x=>validateD95Protocol(x,d94,d93,d90,blobRefs);
const modify=fn=>{const x=structuredClone(protocol);fn(x);return x;};
test("D95 is bound to frozen D94, D93 and D90 Git blobs",()=>{
 assert.deepEqual(blobRefs.map(x=>x.sha),[
  "b9728ed847ec9c509df7c696413ed5204b2094ef",
  "7bd5d652217cdd58c64c5dd99a9f266b3db40e88",
  "69fd5e3d31cc40a54f6e9e63dade60c65ffcbf38"
 ]);
 assert.equal(protocol.schema,D95_SCHEMA);
 assert.deepEqual(protocol.sources.map(x=>x.git_blob_sha),blobRefs.map(x=>x.sha));
});
test("D95 covers two distinctness hypotheses without issuing a new bank",()=>{
 const result=check(protocol);
 assert.deepEqual(protocol.domains.map(d=>d.id),D95_DOMAINS);
 assert.equal(result.proposedDomains,2);
 assert.ok(protocol.domains.every(x=>x.distinctness_status==="NOT_ESTABLISHED"));
 assert.ok(protocol.domains.every(x=>x.status==="NOT_A_BANK_ITEM"));
 for(const d of protocol.domains){
  const original=d94.draft_editorial_prompts.find(p=>p.id===d.prompt_id);
  assert.equal(d.draft_prompt,original.text);
 }
 assert.equal(result.numericalScoresAllowed,false);
});
test("D95 synthetic contrasting cases contain no fake results",()=>{
 assert.equal(protocol.contrast_cases.length,8);
 assert.ok(protocol.contrast_cases.every(x=>x.evidence==="SYNTHETIC_ONLY"));
 assert.equal(protocol.limitations.estimated_population_prevalence,false);
 assert.equal(protocol.limitations.case_scores_generated,false);
});
test("D95 cognitive-interview plan is ordered and has nine distinct probes",()=>{
 assert.equal(protocol.interview_protocol.status,"TEMPLATE_ONLY_NO_RECRUITMENT");
 assert.equal(protocol.interview_protocol.recruitment_state,"NOT_STARTED");
 assert.equal(protocol.interview_protocol.participant_count,0);
 assert.equal(protocol.interview_protocol.session_steps.length,8);
 assert.equal(protocol.interview_protocol.probes.length,9);
 assert.deepEqual(protocol.interview_protocol.probes.map(x=>x.id),
  ["P01","P02","P03","P04","P05","P06","P07","P08","P09"]);
});
test("D95 no consent or participant records are fabricated",()=>{
 assert.equal(protocol.limitations.consent_obtained,false);
 assert.equal(protocol.limitations.actual_interviews_conducted,false);
 assert.equal(protocol.limitations.personal_data_collected,false);
 assert.equal(protocol.coding_template.actual_records.length,0);
 assert.equal(protocol.coding_template.field_schema_approved,false);
 assert.ok(protocol.coding_template.fields_not_to_collect_by_default.includes("氏名"));
});
test("D95 interpretation outcomes are mutually explicit and all need human decision",()=>{
 const result=check(protocol);
 assert.deepEqual(protocol.interpretation_decision_tree.map(x=>x.id),D95_DECISIONS);
 assert.equal(new Set(protocol.interpretation_decision_tree.map(x=>x.next)).size,4);
 assert.ok(protocol.interpretation_decision_tree.every(x=>x.numeric_scoring===false&&x.approval==="PENDING"));
 assert.equal(result.humanGatesPending,5);
 assert.ok(protocol.gate_checklist.every(x=>x.status==="PENDING"));
 assert.equal(result.psychometricEvidence,"NONE");
});
test("D95 fail-closed rejects unsupported approvals, scores and personal data",()=>{
 for(const patch of [
  x=>x.limitations.actual_interviews_conducted=true,
  x=>x.limitations.content_validity_evidence="VALIDATED",
  x=>x.limitations.personal_data_collected=true,
  x=>x.interview_protocol.participant_count=1,
  x=>x.interview_protocol.recruitment_state="STARTED",
  x=>x.coding_template.actual_records.push({name:"fictitious"}),
  x=>x.coding_template.field_schema_approved=true,
  x=>x.interpretation_decision_tree[0].numeric_scoring=true,
  x=>x.interpretation_decision_tree[1].approval="APPROVED",
  x=>x.gate_checklist[0].status="APPROVED",
  x=>x.guardrails.no_recruitment=false,
  x=>x.guardrails.no_two_item_mean=false,
  x=>x.guardrails.no_type_id=false,
  x=>x.guardrails.no_production_publication=false,
  x=>x.domains[0].status="APPROVED_ITEM",
  x=>x.domains[0].draft_prompt="無断で質問を書き換える",
  x=>x.contrast_cases[0].evidence="ACTUAL",
  x=>x.sources[0].git_blob_sha="invalid"
 ]) assert.throws(()=>check(modify(patch)),TypeError);
});
test("D95 no storage, network, collection, type engine or time based side effects",()=>{
 const code=read("projects/kidp/life-design-lab/a05/cp1-domain-protocol-d95.mjs");
 for(const banned of [
  "localStorage","sessionStorage","indexedDB","fetch(",
  "sendBeacon","XMLHttpRequest","document.cookie","scoreBCPilot(",
  "Date.now(","setTimeout(","Math.random("
 ]) assert.equal(code.includes(banned),false,banned);
 const summary=check(protocol);
 assert.equal(summary.studyApproved,false);
 assert.equal(summary.studyConducted,false);
 assert.equal(summary.interviewsCollected,0);
 assert.equal(summary.typeId,null);
 assert.equal(summary.nextStage,"HUMAN_REVIEW_BEFORE_RESEARCH");
});
