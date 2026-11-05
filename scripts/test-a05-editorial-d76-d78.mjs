import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
import {
 E_EXPERIMENT_VERSION, experimentalE, validateExperimentalE,
 isLegacyWealthCompatible
} from "../projects/kidp/life-design-lab/a05/e-experiment.mjs";
import { experimentalEDisplay } from "../projects/kidp/life-design-lab/a05/e-display.mjs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const d73=JSON.parse(read("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json"));
const d74=JSON.parse(read("docs/A05_D74_AB_ALTERNATIVES_20261026.json"));
const d76=JSON.parse(read("docs/A05_D76_BLOCKER_DISPOSITION_20261026.json"));
const d77=JSON.parse(read("docs/A05_D77_CD_ITEM_REVIEW_20261026.json"));
const d78=JSON.parse(read("docs/A05_D78_E_MODE_DECISION_MATRIX_20261026.json"));

const orderedBlocked=["A04","A05","B02","C04","D03","E04","E05"];
const blocked= d73.items.filter(i=>i.editorialStatus==="BLOCK").map(i=>i.id);

test("D76 all and only seven original BLOCK items retain the ban",()=>{
 assert.equal(d76.schema,"A05-D76-BLOCKER-DISPOSITION-1");
 assert.equal(d76.state,"TRIAGE_COMPLETE_ADOPTION_PENDING");
 assert.deepEqual(blocked,orderedBlocked);
 assert.deepEqual(d76.items.map(x=>x.id),orderedBlocked);
 assert.equal(d76.globalGuards.blockCount,7);
 assert.equal(d76.globalGuards.blockRemovedCount,0);
 for (const [k,v] of Object.entries(d76.globalGuards)) {
  if (typeof v==="boolean") assert.equal(v,false,k);
 }
 for(const item of d76.items){
  const ref=d73.items.find(x=>x.id===item.id);
  assert.ok(ref && ref.editorialStatus==="BLOCK");
  assert.equal(item.axis,ref.axis);
  assert.deepEqual(item.current,ref.current,item.id);
  assert.deepEqual(item.sourceCandidate,ref.candidate,item.id);
  assert.equal(item.originalVerdict,"BLOCK");
  assert.equal(item.approvalStatus,"NOT_APPROVED");
  assert.equal(item.triage.priority,"P0");
  assert.ok(item.triage.reason.length>12);
  assert.ok(item.triage.reviewQuestion.length>12);
  assert.equal(item.triage.comparison.includes("DROP") ||
   item.triage.comparison.includes("E_C"),true,item.id);
  assert.equal(item.experimentGate.studyAuthorized,false);
  assert.equal(item.experimentGate.realResponsesCollected,false);
  assert.equal(item.experimentGate.scoringVersionChangeAuthorized,false);
  assert.equal(item.experimentGate.resultsAvailable,false);
  if("AB".includes(item.axis)){
   const alt=d74.items.find(x=>x.id===item.id);
   assert.ok(alt);
   assert.deepEqual(item.alternativeL,alt.candidateL,item.id);
  }else assert.equal(item.alternativeL,null,item.id);
 }
 assert.match(read("docs/A05_D76_BLOCKER_DECISION_20261026.md"),/BLOCK解除なし/);
});

test("D77 C/D review has exact 12 item crosswalk and editorial dispositions",()=>{
 assert.equal(d77.schema,"A05-D77-CD-ITEM-REVIEW-1");
 const expected=d73.items.filter(i=>i.axis==="C"||i.axis==="D");
 assert.equal(expected.length,12);
 assert.deepEqual(d77.items.map(x=>x.id),expected.map(x=>x.id));
 assert.equal(d77.bounds.items,12);
 assert.deepEqual([d77.bounds.blockCount,d77.bounds.rewriteCount,d77.bounds.trialCount],[2,5,5]);
 const map={BLOCK:"BLOCK_STAYS",REVISE:"NEEDS_REWRITE",TRIAL:"TRIAL_CANDIDATE_NOT_ADOPTED"};
 for(const i of d77.items) {
  const ref=expected.find(x=>x.id===i.id);
  assert.equal(i.editorialStatus,ref.editorialStatus);
  assert.equal(i.triage,map[i.editorialStatus],i.id);
  assert.deepEqual(i.candidate,ref.candidate,i.id);
  assert.deepEqual(i.crossCheck,ref.competingWith,i.id);
  assert.ok(i.risk.length>10 && i.failureAction.length>10,i.id);
  assert.equal(i.adoption,"NOT_APPROVED");
  assert.equal(i.validation,"NO_EMPIRICAL_EVIDENCE");
 }
 assert.deepEqual(d77.items.filter(i=>i.editorialStatus==="BLOCK").map(i=>i.id),["C04","D03"]);
 for(const key of ["studyAuthorized","mergeAuthorized","productionReleaseAuthorized","legacyRescoringAllowed"])
  assert.equal(d77.bounds[key],false,key);
 assert.match(read("docs/A05_D77_CD_REVIEW_DECISION_20261026.md"),/採用前/);
});

test("D78 three comparison modes are not release decisions",()=>{
 assert.equal(d78.schema,"A05-D78-E-MODE-COMPARISON-1");
 assert.equal(d78.state,"DECISION_PENDING_NO_PARTICIPANTS");
 assert.deepEqual(d78.modes.map(x=>x.id),["E-A","E-B","E-C"]);
 assert.deepEqual(d78.modes.map(x=>x.runtimeMode),["relative","independent","omitted"]);
 assert.equal(d78.modes[2].role,"SAFETY_BASELINE");
 for(const item of d78.modes) {
  assert.equal(item.adoption,"NOT_APPROVED");
  assert.ok(item.unresolved.length>=2 && item.requiredEvidence.length>=2);
 }
 assert.equal(d78.guards.modeSelected,false);
 assert.equal(d78.guards.realParticipantRecords,0);
 for(const key of ["studyAuthorized","releaseAuthorized","mergeAuthorized","legacyWealthCompatible","legacyRescoringAllowed","oldRuntimeModified"])
  assert.equal(d78.guards[key],false,key);
 assert.match(read("docs/A05_D78_E_DECISION_PROTOCOL_20261026.md"),/採用決定ではない/);
});

test("D78 eight synthetic fixtures obey isolated E experimental and display contracts",()=>{
 assert.equal(d78.syntheticFixtures.length,8);
 assert.equal(new Set(d78.syntheticFixtures.map(x=>x.id)).size,8);
 for(const f of d78.syntheticFixtures) {
  assert.equal(validateExperimentalE(f.input),true);
  const actual=experimentalE(f.input);
  assert.equal(actual.schema,E_EXPERIMENT_VERSION);
  const shallow=Object.fromEntries(Object.entries(actual).filter(([key])=>key!=="schema"));
  assert.deepEqual(shallow,f.expected,f.id);
  assert.equal(isLegacyWealthCompatible(actual),false,f.id);
  const display=experimentalEDisplay(f.input);
  assert.ok(display.title && display.description);
  if(f.input.mode==="omitted"){
   assert.equal(display.items.length,0);
   assert.match(display.description,/分類しません/);
  }else if(f.input.mode==="relative"){
   assert.equal(display.items.length,1);
  }else{
   assert.equal(display.items.length,2);
   assert.match(display.description,/両方を同時に重視/);
  }
 }
 assert.throws(()=>validateExperimentalE({mode:"omitted",answer:4}),TypeError);
 assert.throws(()=>validateExperimentalE({mode:"independent",money:7,time:null}),TypeError);
});

test("D76-D78 versions and unapproved status preserve current A05 runtime",()=>{
 assert.equal(QUESTIONS.length,30);
 assert.deepEqual(d73.frozenVersions,{
  question:QUESTION_SET_VERSION,scoring:SCORING_VERSION,type:TYPE_VERSION,content:CONTENT_VERSION
 });
 assert.deepEqual(d78.modes.filter(x=>x.adoption!=="NOT_APPROVED"),[]);
 for(const src of ["docs/A05_D76_BLOCKER_DECISION_20261026.md",
  "docs/A05_D77_CD_REVIEW_DECISION_20261026.md",
  "docs/A05_D78_E_DECISION_PROTOCOL_20261026.md"]) {
  const document=read(src);
  assert.match(document,/改訂履歴/);
  assert.ok(document.includes("2026-10-26"),src);
 }
});
