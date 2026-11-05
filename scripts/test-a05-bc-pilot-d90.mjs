import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
  D87_SCHEMA,D90_SCHEMA,D90_SCORING_VERSION,D90_CHANGED_IDS,
  compareBCPilotBanks,scoreD90Pilot
} from "../projects/kidp/life-design-lab/a05/bc-pilot-d90-comparison.mjs";
import {scoreBCPilot} from "../projects/kidp/life-design-lab/a05/bc-pilot-engine.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const oldText=read("docs/A05_D87_BC_PILOT_20261105.json");
const old=JSON.parse(oldText);
const next=JSON.parse(read("docs/A05_D90_BC_PILOT_0_2_20261105.json"));
const clone=o=>structuredClone(o);
function answersFor(fixture,bank) {
  const values={};
  for(const f of bank.facets) {
    const qs=bank.items.filter(q=>q.facet===f.id);
    qs.forEach((q,i)=>values[q.id]=fixture.by_facet[f.id][i]);
  }
  return values;
}
const means=out=>Object.fromEntries(out.scales.map(scale=>[scale.id,scale.mean]));
const gitBlob=text => createHash("sha1")
  .update("blob "+Buffer.byteLength(text)+"\0").update(text).digest("hex");

test("D90 predecessor preserved: Git blob hash and schema",()=>{
  assert.equal(old.schema,D87_SCHEMA);
  assert.equal(next.schema,D90_SCHEMA);
  assert.equal(next.scoring.version,D90_SCORING_VERSION);
  assert.equal(gitBlob(oldText),"6d40051a202ae5852c280be0067d7afdfb290848");
  assert.equal(next.revision.predecessor_git_blob_sha,gitBlob(oldText));
  assert.equal(old.items.length,12);
  assert.equal(next.items.length,12);
});

test("D90 comparison has exactly 6 intended wording revisions and 6 unchanged items",()=>{
  const result=compareBCPilotBanks(old,next);
  assert.equal(result.changed,6);
  assert.equal(result.unchanged,6);
  assert.deepEqual(result.rows.filter(row=>row.status==="REVISED").map(row=>row.id),D90_CHANGED_IDS);
  assert.deepEqual(result.rows.filter(row=>row.status==="UNCHANGED").map(row=>row.id),
    ["B-S01","B-S02","B-R02","C-F01","C-F02","C-P01"]);
  assert.ok(result.rows.every(row=>row.before && row.after && row.id));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.rows));
  assert.ok(result.rows.every(Object.isFrozen));
});

test("D90 scoring contract unchanged but version equivalence explicitly withheld",()=>{
  const result=compareBCPilotBanks(old,next);
  assert.equal(result.scoringFormulaUnchanged,true);
  assert.equal(result.psychometricEquivalence,"NOT_ESTABLISHED");
  assert.equal(result.historicalResultsMigrated,false);
  assert.equal(result.typeId,null);
  assert.equal(result.groupId,null);
  assert.equal(result.classificationStatus,"WITHHELD");
  assert.equal(result.productionApproved,false);
});

test("D90 old/v2 synthetic fixtures compute same arithmetic values, not psychometric equivalence",()=>{
  assert.equal(next.fixtures.length,4);
  for(const fixture of next.fixtures){
    const a=answersFor(fixture,next);
    const oldResult=scoreBCPilot(old,a);
    const nextResult=scoreD90Pilot(next,a);
    assert.deepEqual(means(oldResult),fixture.expected,fixture.id+" previous");
    assert.deepEqual(means(nextResult),fixture.expected,fixture.id+" revised");
    assert.equal(nextResult.typeId,null);
    assert.equal(nextResult.classificationStatus,"WITHHELD");
    assert.equal(nextResult.oldResultCompatible,false);
    assert.equal(nextResult.persisted,false);
    assert.equal(nextResult.measurementValidity,"UNVALIDATED");
  }
});

test("D90 one null or omitted answer withholds that scale, not other scales",()=>{
  const full=answersFor(next.fixtures[0],next);
  const nullAnswers={...full,"B-S03":null};
  let result=scoreD90Pilot(next,nullAnswers);
  assert.equal(result.selectedCount,12);
  assert.equal(result.completeAll,false);
  assert.equal(result.scales[0].mean,null);
  assert.equal(result.scales[0].cannotJudge,1);
  assert.equal(result.scales[0].unselected,0);
  assert.equal(result.scales[1].mean,7);
  const missing={...full};
  delete missing["B-S03"];
  result=scoreD90Pilot(next,missing);
  assert.equal(result.selectedCount,11);
  assert.equal(result.scales[0].mean,null);
  assert.equal(result.scales[0].cannotJudge,0);
  assert.equal(result.scales[0].unselected,1);
  assert.equal(result.scales[3].mean,7);
});

test("D90 wrong version, invalid answers, and unauthorized seventh change rejected",()=>{
  assert.throws(()=>scoreD90Pilot(old,{}),TypeError);
  for(const invalid of [8,0,3.5,"7",undefined,NaN,Infinity,{},true])
    assert.throws(()=>scoreD90Pilot(next,{"B-S01":invalid}),TypeError);
  for(const invalid of [null,[],4,"abc",Object.create({x:1})])
    assert.throws(()=>scoreD90Pilot(next,invalid),TypeError);
  assert.throws(()=>scoreD90Pilot(next,{X01:4}),TypeError);
  const corrupt=clone(next);
  corrupt.items[0].text="Unauthorized extra change";
  assert.throws(()=>compareBCPilotBanks(old,corrupt),TypeError);
  const corruptScoring=clone(next);
  corruptScoring.scoring.aggregation="sum";
  assert.throws(()=>compareBCPilotBanks(old,corruptScoring),TypeError);
  const swapped=clone(next);
  [swapped.items[0],swapped.items[1]]=[swapped.items[1],swapped.items[0]];
  assert.throws(()=>compareBCPilotBanks(old,swapped),TypeError);
});

test("D90 read-only preview is noindex and has no answer or persistence code",()=>{
  const html=read("projects/kidp/life-design-lab/a05/bc-pilot-d90-preview.html");
  const ui=read("projects/kidp/life-design-lab/a05/bc-pilot-d90-preview.mjs");
  const engine=read("projects/kidp/life-design-lab/a05/bc-pilot-d90-comparison.mjs");
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/id="filter"/);
  assert.match(html,/id="matrix"/);
  assert.match(html,/未承認/);
  assert.match(ui,/compareBCPilotBanks/);
  assert.match(ui,/D90_BC_PILOT_0_2_20261105.json/);
  assert.match(ui,/D87_BC_PILOT_20261105.json/);
  assert.match(ui,/credentials:"omit"/);
  for(const forbidden of [
    "localStorage","sessionStorage","indexedDB","sendBeacon",
    "XMLHttpRequest","navigator.serviceWorker","innerHTML",
    "http://","https://","typeId=", "document.cookie"
  ]) assert.equal([html,ui,engine].some(text=>text.includes(forbidden)),false,forbidden);
});
