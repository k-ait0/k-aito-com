#!/usr/bin/env node
"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {validate,summarize,CASES,SCHEMA}=require("./a05-d170-research-aggregate.cjs");
const filled=()=>({schema:SCHEMA,type:"non_scoring_research_notes",answers:CASES.map(id=>({
  case_id:id,axis:id[0],inputs:{
    anchor_choice:"neutral",candidate_choice:"both",verdict:"context_only",
    reason_code:"value_priority",choice_reason:"synthetic example — do not use for analysis",
    anchor_paraphrase:"synthetic A",candidate_paraphrase:"synthetic B",
    observation:"Secret: synthetic private text",
    ...(id==="B-G1"?{independent_1:"7",independent_2:"6"}:{})
  }
}))});
test("Eleven cases and unique axis IDs are required",()=>{
 assert.equal(validate(filled()).length,11);
 const d=filled();d.answers[1].case_id=d.answers[0].case_id;
 assert.throws(()=>validate(d),/Duplicate/);
 const d2=filled();d2.answers[0].axis="B";assert.throws(()=>validate(d2),/mismatched/);
});
test("Separate neutral, both, neither and old ambiguous middle values",()=>{
 const d=filled();d.answers[0].inputs.anchor_choice="neutral";d.answers[0].inputs.candidate_choice="both";
 d.answers[1].inputs.anchor_choice="neither";d.answers[1].inputs.candidate_choice="middle";
 const s=summarize([d]);
 assert.equal(s.by_case["A-G1"].anchor_choices.neutral,1);
 assert.equal(s.by_case["A-G1"].candidate_choices.both,1);
 assert.equal(s.by_case["A-G2"].anchor_choices.neither,1);
 assert.equal(s.by_case["A-G2"].legacy_ambiguous_count,1);
});
test("B-G1 simultaneously high independent answers are descriptively counted, not scored",()=>{
 const s=summarize([filled(),filled()]);
 assert.equal(s.by_case["B-G1"].dual_high_b_5plus,2);
 assert.equal(s.files_read,2);
 assert.equal(s.aggregated_case_records,22);
 assert.equal(s.respondent_uniqueness_unverified,true);
});
test("Missing paraphrase is marked incomplete, without inventing a verdict",()=>{
 const d=filled();d.answers[0].inputs.anchor_paraphrase="";
 const s=summarize([d]);
 assert.equal(s.by_case["A-G1"].complete_reasoned,0);
 assert.equal(s.by_case["A-G2"].complete_reasoned,1);
});
test("Raw free text is never emitted, including synthetic privacy warning",()=>{
 const result=JSON.stringify(summarize([filled()]));
 assert.doesNotMatch(result,/Secret: synthetic private text/);
 assert.doesNotMatch(result,/synthetic private/);
 assert.ok(!("raw_answers" in JSON.parse(result)));
});
test("Malformed or unexpected categorical fields are rejected",()=>{
 let d=filled();d.answers[0].inputs.candidate_choice="maybe";assert.throws(()=>validate(d),/categorical/);
 d=filled();d.answers[0].inputs.reason_code="injury";assert.throws(()=>validate(d),/Invalid verdict/);
 d=filled();d.answers[0].inputs.extra_field="test";assert.throws(()=>validate(d),/Unexpected/);
 d=filled();d.answers[0].inputs.candidate_choice={foo:"bar"};assert.throws(()=>validate(d),/Unexpected/);
});
test("B independent ratings must be 1 through 7",()=>{
 const d=filled();d.answers.find(x=>x.case_id==="B-G1").inputs.independent_1="8";
 assert.throws(()=>validate(d),/independent rating/);
});
test("CLI accepts files locally and emits only anonymized descriptive aggregate",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"a05-d170-test-"));
 try {
   const file=path.join(dir,"session.json");fs.writeFileSync(file,JSON.stringify(filled()));
   const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,"a05-d170-research-aggregate.cjs"),file],{encoding:"utf8"}));
   assert.equal(result.files_read,1);
   assert.equal(result.by_case["B-G1"].dual_high_b_5plus,1);
   assert.doesNotMatch(JSON.stringify(result),/Secret: synthetic private text/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
