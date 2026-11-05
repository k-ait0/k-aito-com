import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EDITORIAL_ITEMS, EDITORIAL_ACTIONS } from "../projects/kidp/life-design-lab/a05/editorial-preview-data.mjs";
import { QUESTIONS, QUESTION_SET_VERSION } from "../projects/kidp/life-design-lab/a05/questions.mjs";
import { SCORING_VERSION } from "../projects/kidp/life-design-lab/a05/engine.mjs";
import { TYPE_VERSION, CONTENT_VERSION } from "../projects/kidp/life-design-lab/a05/types.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const data=p=>JSON.parse(read(p));
const d73=data("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json");
const d80=data("docs/A05_D80_PILOT_CANDIDATES_20261026.json");
const d84=data("docs/A05_D84_AB_EDITORIAL_DISPOSITION_20261026.json");
const actions=["RETAIN_FOR_REVIEW","REWRITE_FOR_REVIEW","DROP_CANDIDATE"];
test("D84 exact 12 item editorial triage is non-adoptive and matches source items",()=>{
 assert.equal(d84.schema,"A05-D84-AB-EDITORIAL-DISPOSITION-1");
 assert.equal(d84.state,"EDITORIAL_TRIAGE_ONLY");
 assert.equal(d84.items.length,12);
 assert.deepEqual(d84.items.map(x=>x.id),EDITORIAL_ITEMS.map(x=>x.id));
 assert.deepEqual(d84.actionCounts,{RETAIN_FOR_REVIEW:4,DROP_CANDIDATE:4,REWRITE_FOR_REVIEW:4});
 const counts=Object.fromEntries(actions.map(k=>[k,0]));
 for(const x of d84.items){
  const old=d73.items.find(i=>i.id===x.id),pilot=d80.items.find(i=>i.id===x.id);
  assert.ok(old&&pilot,x.id);
  assert.equal(x.axis,old.axis);
  assert.equal(x.sourceVerdict,old.editorialStatus);
  assert.deepEqual(x.currentCandidateR,pilot.candidateR);
  assert.deepEqual(x.linkedItems,pilot.linkedDuplicates);
  assert.ok(x.rationale.length>=15 && x.disconfirmingQuestion.length>=15 && x.revisionBrief.length>=12,x.id);
  assert.equal(x.approval,"NOT_APPROVED");
  assert.equal(x.basis,"EDITORIAL_HYPOTHESIS_NO_HUMAN_DATA");
  assert.equal(x.mayOverrideSourceBlock,false);
  assert.equal(x.psychometricEvidenceAvailable,false);
  assert.ok(actions.includes(x.proposedAction),x.id);
  counts[x.proposedAction]++;
  assert.deepEqual(EDITORIAL_ACTIONS[x.id],{
   proposedAction:x.proposedAction,rationale:x.rationale,
   disconfirmingQuestion:x.disconfirmingQuestion,revisionBrief:x.revisionBrief
  },x.id);
 }
 assert.deepEqual(counts,d84.actionCounts);
 assert.deepEqual(Object.keys(EDITORIAL_ACTIONS),d84.items.map(x=>x.id));
});
test("D84 original BLOCK remains unchanged for 7 questions, including proposed drops",()=>{
 const blocked=d73.items.filter(x=>x.editorialStatus==="BLOCK").map(x=>x.id);
 assert.deepEqual(blocked,["A04","B02","C04","D03","E04","A05","E05"].sort((a,b)=>d73.items.findIndex(z=>z.id===a)-d73.items.findIndex(z=>z.id===b)));
 assert.equal(blocked.length,7);
 assert.deepEqual(d84.items.filter(x=>x.sourceVerdict==="BLOCK").map(x=>x.id),["A04","A05","B02"]);
 assert.equal(d84.items.find(x=>x.id==="A05").proposedAction,"DROP_CANDIDATE");
 assert.equal(d84.items.find(x=>x.id==="A05").mayOverrideSourceBlock,false);
 assert.equal(QUESTIONS.length,30);
 assert.deepEqual(d73.frozenVersions,{
  question:QUESTION_SET_VERSION,scoring:SCORING_VERSION,type:TYPE_VERSION,content:CONTENT_VERSION
 });
});
test("D84 overlap priority hypotheses are references, not observed statistics",()=>{
 assert.equal(d84.overlapHypotheses.length,7);
 const ids=new Set(d84.items.map(x=>x.id));
 const pairs=new Set();
 for(const edge of d84.overlapHypotheses){
  assert.ok(ids.has(edge.left)&&ids.has(edge.right));
  assert.notEqual(edge.left,edge.right);
  const key=[edge.left,edge.right].sort().join("/");
  assert.equal(pairs.has(key),false,key);
  pairs.add(key);
  assert.ok(["HIGH","MEDIUM"].includes(edge.risk));
  assert.equal(edge.empiricallyConfirmed,false);
  assert.ok(edge.claim.length>=15);
 }
 assert.equal(pairs.has("A02/B04"),true,"cross-axis overlap must be explicitly reviewed");
 assert.equal(d84.bipolarity.axis,"B");
 assert.equal(d84.bipolarity.state,"UNRESOLVED");
 assert.equal(d84.bipolarity.decision,"PENDING");
});
test("D84 no study, owner choice, scores, adoption or public release allowed",()=>{
 const gate=d84.decisionGate;
 assert.equal(gate.constructA,"PENDING");
 assert.equal(gate.constructB,"PENDING");
 assert.equal(gate.approvedItems,0);
 assert.equal(gate.blockedItems,7);
 assert.deepEqual(gate.ABBlocked,["A04","A05","B02"]);
 for(const key of ["ownerSelection","published","studyAuthorized","legacyRescoringAllowed",
                   "mergeAuthorized","productionReleaseAuthorized"])
  assert.equal(gate[key],false,key);
 const doc=read("docs/A05_D84_AB_EDITORIAL_DECISION_20261026.md");
 assert.match(doc,/採用未承認/);
 assert.match(doc,/残す候補4/);
 assert.match(doc,/改訂履歴/);
 const html=read("projects/kidp/life-design-lab/a05/editorial-preview.html");
 const js=read("projects/kidp/life-design-lab/a05/editorial-preview.mjs");
 assert.match(html,/id="editorial-advice"/);
 assert.match(html,/正式採用なし/);
 assert.match(js,/EDITORIAL_ACTIONS\[x.id\]/);
 assert.match(js,/dataset.proposedAction/);
 assert.equal(js.includes("innerHTML"),false);
 for(const term of ["fetch(","localStorage","indexedDB","XMLHttpRequest","sendBeacon"])
  assert.equal(js.includes(term),false,term);
});
