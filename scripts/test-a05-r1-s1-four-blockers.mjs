import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const json=path=>JSON.parse(read(path).toString("utf8"));
const b=json("docs/A05_S1_FOUR_BLOCKED_ITEMS_DISPOSITION_V01_20261030.json");
const source=json(b.source.file);
test("S1 four previously BLOCK items remain blocked and source-frozen",()=>{
 const buf=read(b.source.file);
 const digest=createHash("sha1").update("blob "+buf.length+"\0").update(buf).digest("hex");
 assert.equal(digest,b.source.sha);
 assert.equal(b.status,"FOUR_BLOCKERS_STILL_BLOCKED");
 assert.equal(b.total,4);
 assert.deepEqual(b.rows.map(x=>x.id),["A04","A05","C04","D03"]);
 for(const x of b.rows){
  const item=source.items.find(y=>y.id===x.id);
  assert.ok(item);
  assert.equal(item.editorialStatus,"BLOCK");
  assert.equal(x.sourceStatus,"BLOCK");
  assert.deepEqual(x.original,item.current);
  assert.deepEqual(x.previouslyProposedAndUnapproved,item.candidate);
  assert.equal(x.recommendation,"KEEP_BLOCKED_UNTIL_MEASUREMENT_CONSTRUCT_SELECTED");
  assert.equal(x.ownerApproval,"PENDING");
  assert.equal(x.independentReview,"PENDING");
  assert.equal(x.sourceDraftModified,false);
  assert.equal(x.readyForSurvey,false);
  assert.equal(x.readyForR1TypeAssignment,false);
  assert.ok(x.conditionalDecisionPaths.includes("REMOVE_IF_REDUNDANT") ||
            x.conditionalDecisionPaths.includes("REMOVE_IF_REDUNDANT"));
 }
});
test("S1-four proposed copy is conditional and never changes existing Q/S/T/C",()=>{
 assert.equal(b.anyBlockResolved,false);
 assert.equal(b.noExistingQuestionChange,true);
 assert.equal(b.noRealPersonStudy,true);
 assert.equal(b.release,"NO_GO");
 assert.equal(b.finalOwnerDecision,"PENDING");
 assert.ok(b.validationChecklist.length>=6);
});
