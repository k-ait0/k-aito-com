import test from "node:test";
import assert from "node:assert/strict";
import {makeBlankFieldworkBundle,outputInstructions} from "./a05-d239-build-fieldwork-bundle.mjs";
import {summarizeInterviewCodes} from "./a05-d238-blind-coding-aggregator.mjs";
test("D239 blank fieldwork kit contains 24 sheets and exactly 48 non-consented rater templates",()=>{
 const kit=makeBlankFieldworkBundle();
 assert.equal(kit.plan.slots.length,24);
 assert.equal(kit.blankRaters.length,48);
 assert.equal(kit.plan.counts.enrolledPeople,0);
 assert.equal(kit.plan.counts.completedInterviews,0);
 for(const s of kit.plan.slots){
  const r=kit.blankRaters.filter(x=>x.slot===s.slot);
  assert.deepEqual(r.map(x=>x.raterCode),["R1","R2"]);
  assert.ok(r.every(x=>x.consentConfirmed===false));
  assert.ok(r.every(x=>Object.keys(x.pairJudgments).length===8));
  assert.ok(r.every(x=>Object.values(x.pairJudgments).every(j=>j.code===null)));
  assert.ok(r.every(x=>Object.values(x.candidateJudgments).every(v=>v===null)));
 }
 assert.ok(kit.interviewMarkdown.includes("匿名"));
 assert.ok(kit.interviewMarkdown.length>50000);
});
test("D239 blank inputs are never mistaken for human cognitive data",()=>{
 const kit=makeBlankFieldworkBundle();
 const output=summarizeInterviewCodes(kit.blankRaters);
 assert.equal(output.pairedInterviewSlots,0);
 assert.equal(output.acceptedSheets,0);
 assert.equal(output.rejectedSheets,48);
 assert.equal(output.status,"NO_REAL_COGNITIVE_DATA");
});
test("D239 fieldwork instructions require private local handling and no public submission",()=>{
 const instructions=outputInstructions();
 for(const token of ["非公開","同意","GitHub","R1","R2","C36-R1","C36-R2","C36-R3","D210","S01"])
  assert.ok(instructions.includes(token),token);
 assert.ok(instructions.includes("1ファイル＝1 D210記録"));
 assert.equal(makeBlankFieldworkBundle().interviewMarkdown,makeBlankFieldworkBundle().interviewMarkdown);
});
