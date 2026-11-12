#!/usr/bin/env node
"use strict";
/**
 * Offline, read-only descriptive audit of D170 non-scoring research notes.
 * Usage: node scripts/a05-d170-research-aggregate.cjs SESSION1.json [SESSION2.json ...]
 * Outputs aggregate categorical counts only. Free-text fields are NEVER emitted.
 * Input files may contain personally identifying text, so store and delete them securely.
 * Results are NOT validity, reliability, factor analysis or participant deduplication.
 */
const fs = require("node:fs");
const { basename } = require("node:path");
const SCHEMA = "A05-D170-COGNITIVE-REVIEW-NOTES-0.1";
const CASES = ["A-G1","A-G2","B-G1","B-G2","B-G3","C-G1","C-G2","C-G3","D-G1","D-G2","D-G3"];
const CASE_SET = new Set(CASES);
const VERDICTS = new Set(["","meaningfully_different","same_meaning_merge","context_only","off_axis","cannot_determine"]);
const REASONS = new Set(["","value_priority","same_meaning","money_time","rights_duties","ability_skill","relationship","fairness_norm","time_discount","other","unclear"]);
const CHOICES = new Set(["","left","right","neutral","both","neither","middle","unknown","not_applicable"]);
const KEYS = new Set(["candidate_choice","anchor_choice","verdict","observation","anchor_paraphrase","candidate_paraphrase","choice_reason","reason_code","independent_1","independent_2","pair_C-FU14","pair_C-FU15","pair_D-FU07","pair_D-FU10"]);
const maximumFileBytes=262144;
function validate(json) {
  if(json?.schema!==SCHEMA||!Array.isArray(json.answers)||json.answers.length!==11)
    throw Error("Invalid D170 schema or answer count");
  const seen = new Set();
  for(const answer of json.answers) {
    if(!answer||!CASE_SET.has(answer.case_id)||seen.has(answer.case_id)||answer.axis!==answer.case_id[0])
      throw Error("Duplicate, unknown or mismatched case/axis");
    seen.add(answer.case_id);
    if(!answer.inputs||typeof answer.inputs!=="object"||Array.isArray(answer.inputs))
      throw Error("Invalid case inputs");
    for(const [key,val] of Object.entries(answer.inputs)) {
      if(!KEYS.has(key)||typeof val!=="string"||val.length>8000)throw Error("Unexpected or non-string data field");
      if((key==="verdict"&&!VERDICTS.has(val))||(key==="reason_code"&&!REASONS.has(val)))
        throw Error("Invalid verdict or reason code");
      if((key.endsWith("_choice")||key.startsWith("pair_"))&&!CHOICES.has(val))
        throw Error("Invalid categorical choice");
      if(key.startsWith("independent_")&&val!==""&&!/^[1-7]$/.test(val))
        throw Error("Invalid independent rating");
    }
    if(answer.case_id==="B-G1"){
      for(const key of ["independent_1","independent_2"]) if(!(key in answer.inputs))
        throw Error("Missing required independent rating field");
    }
  }
  return json.answers;
}
const count=(obj,key)=>obj[key]=(obj[key]||0)+1;
function summarize(rawFiles) {
  const summary={schema:"A05-D173-AGGREGATED-COGNITIVE-COUNTS-0.1",kind:"non_scoring_descriptive_counts",files_read:rawFiles.length,
    respondent_uniqueness_unverified:true,aggregated_case_records:rawFiles.length*11,
    by_case:Object.fromEntries(CASES.map(id=>[id,{sessions:0,reason_coded:0,verdict_recorded:0,complete_reasoned:0,
       verdicts:{},reason_codes:{},candidate_choices:{},anchor_choices:{},legacy_ambiguous_count:0,dual_high_b_5plus:0,
       paired_choices:{}}])),
    warning:"All counts are exploratory annotations. No automatic item acceptance, scoring, inferential statistics or proof of 2-item semantic distinctness. There is no participant identifier or cross-file deduplication."};
  for(const source of rawFiles)for(const a of validate(source)){
    const row=summary.by_case[a.case_id],v=a.inputs;
    row.sessions++;
    if(v.verdict){row.verdict_recorded++;count(row.verdicts,v.verdict);}
    if(v.reason_code){row.reason_coded++;count(row.reason_codes,v.reason_code);}
    if(v.candidate_choice){count(row.candidate_choices,v.candidate_choice);if(v.candidate_choice==="middle")row.legacy_ambiguous_count++;}
    if(v.anchor_choice){count(row.anchor_choices,v.anchor_choice);if(v.anchor_choice==="middle")row.legacy_ambiguous_count++;}
    for(const k of ["pair_C-FU14","pair_C-FU15","pair_D-FU07","pair_D-FU10"])
      if(v[k]){count(row.paired_choices,k+":"+v[k]);if(v[k]==="middle")row.legacy_ambiguous_count++;}
    if(a.case_id==="B-G1"&&Number(v.independent_1)>=5&&Number(v.independent_2)>=5)row.dual_high_b_5plus++;
    if(v.verdict&&v.reason_code&&(v.choice_reason||"").trim()&&(v.anchor_paraphrase||"").trim()&&(v.candidate_paraphrase||"").trim())
       row.complete_reasoned++;
  }
  return summary;
}
function readFiles(names) {
  if(!names.length)throw Error("Usage: node scripts/a05-d170-research-aggregate.cjs SESSION1.json [SESSION2.json ...]");
  return names.map(filename=>{
    const stat=fs.statSync(filename);
    if(!stat.isFile()||stat.size>maximumFileBytes)throw Error("Session file must be regular and <=256KB");
    try{return JSON.parse(fs.readFileSync(filename,"utf8"));}
    catch(e){throw Error("Invalid JSON in a session file");}
  });
}
if(require.main===module){
  try {
    const result=summarize(readFiles(process.argv.slice(2)));
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
  } catch(err) {
    // Do not print filenames, free-text answers, or third-party exception details.
    console.error("D170 data validation failed:",err.message.replace(/[\r\n]+/g," "));
    process.exitCode=1;
  }
}
module.exports={validate,summarize,CASES,CHOICES,SCHEMA};
