import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../docs/",import.meta.url);
const get=filename=>JSON.parse(readFileSync(new URL(filename,root),"utf8"));
const proposals=get("A05_S4_V05_P2P3_EIGHT_SEMANTIC_ALTERNATES_20261030.json");
const master=get("A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json");
const byId=new Map(master.rows.map(row=>[row.pairId,row]));
const forbidden=["同じ日に考えるなら","どんな問い方が適切ですか","暫定4軸で異なる表示は","設定上の相違の一つは","共通する暫定ラベルは"];

test("eight P2/P3 unapproved alternatives are unique and complete",()=>{
  assert.equal(proposals.proposals.length,8);
  assert.equal(proposals.publication,"NO_GO");
  assert.equal(new Set(proposals.proposals.map(p=>p.pairId)).size,8);
  assert.equal(proposals.proposals.filter(x=>x.priority==="P2_B1_DIFFERENCE").length,4);
  assert.equal(proposals.proposals.filter(x=>x.priority==="P3_OTHER").length,4);
  const descriptions=proposals.proposals.map(x=>x.candidateDescription);
  const questions=proposals.proposals.flatMap(x=>x.candidatePrompts);
  assert.equal(new Set(descriptions).size,8);
  assert.equal(questions.length,24);
  assert.equal(new Set(questions).size,24);
});
test("every alternate matches the v0.4 immutable pair and has zero human approvals",()=>{
  for(const p of proposals.proposals){
    const original=byId.get(p.pairId);
    assert.ok(original,p.pairId);
    assert.deepEqual(p.typeIds,original.typeIds);
    assert.deepEqual(p.sharedAxes,original.sharedAxes);
    assert.deepEqual(p.differentAxes,original.differentAxes);
    assert.equal(p.priority,original.priority);
    assert.equal(p.sourceCopyVersion,original.copyVersion);
    assert.equal(p.sourceDescription,original.draftDescription);
    assert.deepEqual(p.sourcePrompts,original.draftConversationQuestions);
    assert.notEqual(p.candidateDescription,original.draftDescription);
    assert.equal(p.firstReviewStatus,"PENDING");
    assert.equal(p.secondReviewStatus,"PENDING");
    assert.equal(p.approved,false);
    assert.equal(p.publicationApproved,false);
    assert.equal(p.scientificValidation,false);
    assert.deepEqual(Object.values(p.rubric),[null,null,null,null,null,null,null]);
    for(const sentence of [p.candidateDescription,...p.candidatePrompts]){
      for(const f of forbidden)assert.equal(sentence.includes(f),false,p.pairId+": "+f);
    }
  }
});
