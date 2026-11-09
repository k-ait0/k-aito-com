/** D-131 content-screen native Node contract tests.
 * Run: node --test scripts/test-a05-d131-content-readiness.mjs
 * Research-only audit. Passing these tests does not validate the instrument.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateEditorialRecords, summarizeContentReadiness, requireReadyForScientificScoring}
  from "./a05-d131-content-readiness-gate.mjs";

const parse = file => JSON.parse(readFileSync(new URL("../research/a05/"+file,import.meta.url),"utf8"));
const bank=parse("d130-50item-editorial-candidate-bank.json");
const audit=parse("d131-full-50-editorial-screen.json");
const variants=parse("d131-six-rewrite-and-probe-alternatives.json");

test("covers original 50 items with exact content matching",()=>assert.equal(validateEditorialRecords(bank,audit),true));
test("all 50 items have a record",()=>assert.equal(audit.items.length,50));
test("no duplicate item IDs in audit",()=>assert.equal(new Set(audit.items.map(x=>x.id)).size,50));
test("review is not psychometric evidence",()=>assert.equal(audit.psychometricValidityEstablished,false));
test("source bank is nonproduction",()=>{assert.equal(bank.productionEligible,false);assert.equal(bank.questionBankValidated,false)});
test("editorial counts 15 conditional / 21 rewrite / 14 hold",()=>{
 const r=summarizeContentReadiness(bank,audit);
 assert.deepEqual([r.totals.conditionalPilot,r.totals.revisionRequired,r.totals.hold],[15,21,14]);
});
test("not even 7/7/7/7/2 conditional-trial item counts are available",()=>{
 const r=summarizeContentReadiness(bank,audit);
 assert.deepEqual(["A","B","C","D","E"].map(x=>r.axes[x].shortfallEvenForTrial),[4,4,3,2,2]);
 assert.equal(r.minimumTrialCountMissing,15);
 assert.equal(r.canDrawScoredThirty,false);
});
test("no types or calibrated score emission",()=>{
 const r=summarizeContentReadiness(bank,audit);
 assert.equal(r.automatedClassificationPermitted,false);
 assert.equal(r.psychometricValidityEstablished,false);
});
test("scientific scoring remains blocked",()=>assert.throws(()=>requireReadyForScientificScoring(bank,audit),/BLOCKED_NOT_VALIDATED/));
test("corrupt or omitted audit record is rejected",()=>assert.throws(()=>validateEditorialRecords(bank,{...audit,items:audit.items.slice(1)})));
test("stale wording is rejected",()=>{
 const altered={...audit,items:audit.items.map(x=>x.id==="D03"?{...x,positive:"different"}:x)};
 assert.throws(()=>validateEditorialRecords(bank,altered));
});
test("status cannot silently become approved",()=>{
 const altered={...audit,items:audit.items.map(x=>x.id==="D02"?{...x,approved:true}:x)};
 assert.throws(()=>validateEditorialRecords(bank,altered));
});
test("research content cannot falsely be promoted as a production bank",()=>assert.throws(()=>validateEditorialRecords({...bank,productionEligible:true},audit)));
test("six proposals are research comparisons only",()=>{
 assert.equal(variants.items.length,6);
 assert.equal(variants.items.filter(x=>x.status==="PROBE_ONLY_DO_NOT_SCORE").length,3);
 assert.equal(variants.items.filter(x=>x.status==="ALTERNATIVE_NEEDS_EDITORIAL_REVIEW").length,3);
 assert.equal(variants.items.every(x=>x.noAutomaticPromotion),true);
});
test("source ordering does not change readiness totals",()=>{
 assert.deepEqual(summarizeContentReadiness({...bank,items:[...bank.items].reverse()},audit),
  summarizeContentReadiness(bank,audit));
});
