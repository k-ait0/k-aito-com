#!/usr/bin/env node
"use strict";
/**
 * Privacy-minimal D175 local aggregate, no identifiers or raw text emitted.
 * node scripts/a05-d175-participant-aggregate.cjs notes1.json [notes2.json ...]
 * Descriptive counts only; repeated submissions are NOT deduplicated.
 */
const fs=require("node:fs");
const SCHEMA="A05-D175-TIER1-PARTICIPANT-NOTES-0.1";
const CASES=["A-G2","B-G1","C-G1","D-G1"];
const VALID_RESP=new Set(["","1","2","3","4","5","6","7","both","neither","unknown","na"]);
const MEANING=new Set(["","same","different","partly","unknown"]);
const ORDERS=new Set(["reference-first","probe-first"]);
const keys=["paraphrase","reason"];
function verify(obj){
 if(!obj||obj.schema!==SCHEMA||obj.type!=="research_only_not_scored"||obj.consent_confirmed!==true||
    !ORDERS.has(obj.presentation_order)||obj.questions_from!=="D168"||
    !Array.isArray(obj.responses)||obj.responses.length!==4)throw Error("Invalid D175 study schema");
 const seen=new Set();
 for(const q of obj.responses){
  if(!q||!CASES.includes(q.case_id)||seen.has(q.case_id)||q.axis!==q.case_id[0]||
     !q.anchor||!q.probe||typeof q.anchor!=="object"||typeof q.probe!=="object"||
     !MEANING.has(q.comparison)||typeof q.comparison_note!=="string"||q.comparison_note.length>2500)
    throw Error("Invalid study task");
  seen.add(q.case_id);
  for(const [arm,data] of [["anchor",q.anchor],["probe",q.probe]]){
   const allowed=new Set(arm==="probe"&&q.case_id==="B-G1"?[...keys,"independent_1","independent_2"]:[...keys,"response"]);
   if(Array.isArray(data)||Object.keys(data).some(k=>!allowed.has(k))||keys.some(k=>typeof data[k]!=="string"||data[k].length>2500))
     throw Error("Invalid task fields");
   if(allowed.has("response")&&!VALID_RESP.has(data.response))throw Error("Invalid choice response");
   if(allowed.has("independent_1")&&(typeof data.independent_1!=="string"||typeof data.independent_2!=="string"||![data.independent_1,data.independent_2].every(v=>v===""||/^[1-7]$/.test(v))))
     throw Error("Invalid independent rating");
  }
 }
 return obj.responses;
}
const tally=(obj,value)=>{obj[value]=(obj[value]||0)+1;};
function summarize(sessions){
 const output={schema:"A05-D176-TIER1-DESCRIPTIVE-COUNTS-0.1",research_only:true,files:sessions.length,
  people_distinct_not_verified:true,orders:{},cases:Object.fromEntries(CASES.map(id=>[id,{sessions:0,anchor:{},probe:{},comparison:{},answer_reason_present:0,
    both_high_B:0,reason_text_excluded:true}]))};
 for(const s of sessions){
  const qs=verify(s);
  tally(output.orders,s.presentation_order);
  for(const q of qs){
   const v=output.cases[q.case_id];v.sessions++;
   tally(v.comparison,q.comparison||"unanswered");
   tally(v.anchor,q.anchor.response||"unanswered");
   if(q.case_id==="B-G1"){
     tally(v.probe,"autonomy:"+(q.probe.independent_1||"unanswered"));
     tally(v.probe,"connection:"+(q.probe.independent_2||"unanswered"));
     if(Number(q.probe.independent_1)>=5&&Number(q.probe.independent_2)>=5)v.both_high_B++;
   }else tally(v.probe,q.probe.response||"unanswered");
   if(q.anchor.reason.trim()&&q.probe.reason.trim())v.answer_reason_present++;
  }
 }
 return output;
}
function read(names){
 if(!names.length)throw Error("One or more exported D175 JSON files are required");
 return names.map(name=>{
  const stat=fs.statSync(name);
  if(!stat.isFile()||stat.size>262144)throw Error("Invalid file size or format");
  return JSON.parse(fs.readFileSync(name,"utf8"));
 });
}
if(require.main===module){
 try {process.stdout.write(JSON.stringify(summarize(read(process.argv.slice(2))),null,2)+"\n");}
 catch(e){console.error("D175 aggregate rejected input (no answer text shown).");process.exitCode=1;}
}
module.exports={SCHEMA,CASES,verify,summarize};
