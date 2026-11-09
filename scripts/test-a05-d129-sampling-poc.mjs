/** Node-native D-129 PoC tests; run: node --test scripts/test-a05-d129-sampling-poc.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateSimulationBank, drawSimulationManifest, verifySimulationManifest,
  makeSimulationCheckpoint, restoreSimulationCheckpoint, routeSimulationFollowup
} from "./a05-d129-sampling-poc.mjs";

const bank = JSON.parse(readFileSync(new URL("../research/a05/d129-50bank-simulation-fixture.json", import.meta.url), "utf8"));
const manifest = drawSimulationManifest(bank, "seed-2026");

test("bank has 50 records and exactly eight unfilled drafting slots", () => {
  assert.equal(validateSimulationBank(bank), true);
  assert.equal(bank.items.length, 50);
  assert.equal(bank.items.filter(x=>x.source==="MISSING_UNWRITTEN_ITEM").length, 8);
});
test("draws 7/7/7/7/2 and keeps E out of the four classification axes", () => {
  assert.equal(manifest.questions.length, 30);
  for (const [axis,n] of Object.entries({A:7,B:7,C:7,D:7,E:2})) {
    assert.equal(manifest.questions.filter(q=>q.axis===axis).length,n);
  }
});
test("same seed and bank yield byte-identical manifest", () =>
  assert.deepEqual(drawSimulationManifest(bank,"seed-2026"),manifest));
test("manifest rebuild verifies", () => assert.equal(verifySimulationManifest(bank,manifest),true));
test("different seeds select diverse sets", () => {
  const selected = new Set();
  for (let i=0;i<50;i++) selected.add(drawSimulationManifest(bank,"sample-"+i).questions.map(q=>q.id).join(","));
  assert.ok(selected.size>=40);
});
test("known A02/D03 semantic overlap is suppressed for 250 seeds", () => {
  for (let i=0;i<250;i++) {
    const ids=new Set(drawSimulationManifest(bank,"rejectpair-"+i).questions.map(q=>q.id));
    assert.ok(!(ids.has("A02") && ids.has("D03")));
  }
});
test("reordering the source bank does not change same-seed output", () =>
  assert.deepEqual(drawSimulationManifest({...bank,items:[...bank.items].reverse()},"seed-2026"),manifest));
test("checkpoint retains the exact item IDs, answers and resume location", () => {
  const c=makeSimulationCheckpoint(bank,manifest,{[manifest.questions[0].id]:4,[manifest.questions[1].id]:null});
  assert.equal(restoreSimulationCheckpoint(bank,c).nextPosition,3);
});
test("neutral (4) is a valid response while null does not increase n", () => {
  const id=manifest.questions.find(q=>q.axis==="A").id;
  const result=routeSimulationFollowup(manifest,{[id]:4});
  assert.equal(result.axes.A.n,1);
  assert.equal(result.axes.A.action,"INSUFFICIENT_VALID_ANSWERS");
});
test("all-neutral synthetic answers are 45-55 borderline, not a type classification", () => {
  const x=routeSimulationFollowup(manifest,Object.fromEntries(manifest.questions.map(q=>[q.id,4])));
  for (const a of ["A","B","C","D"]) assert.equal(x.axes[a].action,"BORDERLINE_45_55");
  assert.equal(x.axes.E.action,"E_AUX_OPTIONAL");
  assert.equal(x.typeId,null);
  assert.equal(x.classification,"WITHHELD");
});
test("E comprises only two questions and remains non-classifying", () =>
  assert.equal(manifest.questions.filter(q=>q.axis==="E").length,2));
test("production and existing A05 persistence are rejected", () => {
  assert.throws(()=>drawSimulationManifest(bank,"x",{production:true}));
  assert.throws(()=>drawSimulationManifest(bank,"x",{persistToA05:true}));
});
test("answer to an unasked ID is rejected", () =>
  assert.throws(()=>makeSimulationCheckpoint(bank,manifest,{Q999:3})));
test("fixture cannot silently lose an item", () =>
  assert.throws(()=>validateSimulationBank({...bank,items:bank.items.slice(1)})));
test("mutated manifest is rejected on restore", () =>
  assert.throws(()=>verifySimulationManifest(bank,{...manifest,seed:"other"})));
