#!/usr/bin/env node
"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const {SCHEMA,CASES,verify,summarize}=require("./a05-d175-participant-aggregate.cjs");
const create=(order="reference-first")=>({schema:SCHEMA,type:"research_only_not_scored",consent_confirmed:true,questions_from:"D168",presentation_order:order,
 responses:CASES.map(id=>({case_id:id,axis:id[0],anchor:{response:"both",paraphrase:"Synthetic private paraphrase",reason:"Synthetic private anchor reason"},
  probe:id==="B-G1"?{independent_1:"7",independent_2:"6",paraphrase:"Synthetic private statement",reason:"Synthetic private B reason"}:
    {response:"neither",paraphrase:"Synthetic private probe",reason:"Synthetic private probe reason"},
  comparison:"partly",comparison_note:"Synthetic private comparison"}))});
test("Valid four-case D175 form accepted",()=>assert.equal(verify(create()).length,4));
test("Duplicate and wrong axis are rejected",()=>{
 const x=create();x.responses[1].case_id=x.responses[0].case_id;assert.throws(()=>verify(x),/Invalid/);
 const y=create();y.responses[1].axis="A";assert.throws(()=>verify(y),/Invalid/);
});
test("Consent, type and presentation order are required",()=>{
 for(const field of ["consent_confirmed","type","presentation_order"]){
  const x=create();x[field]="bad";assert.throws(()=>verify(x),/Invalid/);
 }
});
test("Both, neither and neutral midpoint remain distinct",()=>{
 const x=create();x.responses[0].anchor.response="4";
 const r=summarize([x]);assert.equal(r.cases["A-G2"].anchor["4"],1);
 assert.equal(r.cases["A-G2"].probe.neither,1);
 assert.equal(r.cases["C-G1"].anchor.both,1);
});
test("Independent B ratings preserve coexistence without score inference",()=>{
 const x=create(),y=create("probe-first");
 y.responses.find(q=>q.case_id==="B-G1").probe.independent_2="2";
 const r=summarize([x,y]);
 assert.equal(r.cases["B-G1"].both_high_B,1);
 assert.equal(r.cases["B-G1"].probe["autonomy:7"],2);
 assert.equal(r.cases["B-G1"].probe["connection:6"],1);
 assert.equal(r.orders["probe-first"],1);
 assert.equal(r.orders["reference-first"],1);
 assert.equal(r.people_distinct_not_verified,true);
});
test("No free text or file names in aggregate output",()=>{
 const result=JSON.stringify(summarize([create()]));
 assert.doesNotMatch(result,/Synthetic private/);
 assert.doesNotMatch(result,/Synthetic private|comparison_note|paraphrase/);
});
test("Invalid choice and indep rating are rejected",()=>{
 const x=create();x.responses[0].probe.response="middle";assert.throws(()=>verify(x),/Invalid/);
 const y=create();y.responses[1].probe.independent_2="8";assert.throws(()=>verify(y),/Invalid/);
});
test("Unexpected or nonstring data fields cannot leak into summaries",()=>{
 const x=create();x.responses[2].probe.unexpected="email@example.com";assert.throws(()=>verify(x),/Invalid/);
 const y=create();y.responses[2].probe.reason={private:"test"};assert.throws(()=>verify(y),/Invalid/);
});
test("CLI processes synthetic local session without printing raw answers",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"a05-tier1-"));
 try{
  const file=path.join(dir,"synthetic.json");fs.writeFileSync(file,JSON.stringify(create()));
  const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,"a05-d175-participant-aggregate.cjs"),file],{encoding:"utf8"}));
  assert.equal(result.files,1);
  assert.equal(result.cases["B-G1"].both_high_B,1);
  assert.doesNotMatch(JSON.stringify(result),/Synthetic private/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
