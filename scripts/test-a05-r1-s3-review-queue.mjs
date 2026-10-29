import test from "node:test";
import assert from "node:assert/strict";
import { COMPATIBILITY_PAIRS, getCompatibilityPair } from "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { EDITORIAL_PAIRS, getEditorialPair } from "../projects/kidp/life-design-lab/a05/compatibility-editorial.mjs";
import { COPY_REVIEW_QUEUE, COPY_AUDIT_SUMMARY } from "../projects/kidp/life-design-lab/a05/compatibility-copy-audit.mjs";
import { S3_REVIEW_QUEUE, S3_REVIEW_SUMMARY } from "../projects/kidp/life-design-lab/a05/r1-s3-review-queue.mjs";

test("S3 all 136 pair rows reconcile C01/C03/C05 IDs, 4 draft axis labels and risk gates",()=>{
  assert.equal(S3_REVIEW_QUEUE.length,136);
  assert.equal(new Set(S3_REVIEW_QUEUE.map(x=>x.pairId)).size,136);
  assert.equal(EDITORIAL_PAIRS.length,136);
  assert.equal(COPY_REVIEW_QUEUE.length,136);
  assert.equal(COPY_AUDIT_SUMMARY.humanReviewedPairs,0);
  for(const row of S3_REVIEW_QUEUE){
    const c01=getCompatibilityPair(...row.typeIds);
    const c03=getEditorialPair(...row.typeIds);
    assert.equal(row.pairId,c01.id);
    assert.equal(row.pairId,c03.id);
    assert.deepEqual(row.sharedAxes,c01.agreements.map(x=>x.axis));
    assert.deepEqual(row.differentAxes,c01.differences.map(x=>x.axis));
    assert.equal(row.sharedAxes.length+row.differentAxes.length,4);
    assert.equal(row.sameType,c01.sameType);
    assert.equal(row.draftStructuralDistance,c01.differences.length);
    assert.equal(row.issueCodes.includes("S3_V1_WORKBOOK_ORIGINAL_UNAVAILABLE"),true);
    assert.equal(row.issueCodes.includes("S2_GENERAL_LITERATURE_NOT_A05_PAIR_EVIDENCE"),true);
    assert.equal(row.firstHumanReview,"PENDING");
    assert.equal(row.secondIndependentReview,"PENDING");
    assert.equal(row.firstReviewer,null);
    assert.equal(row.secondReviewer,null);
    assert.equal(row.draftTextApproved,false);
    assert.equal(row.sourcesApproved,false);
    assert.equal(row.originalWorkbookV10Reconciled,false);
    assert.equal(row.scientificPairValidation,false);
    assert.equal(row.publicationApproved,false);
    assert.equal(Object.isFrozen(row),true);
  }
});
test("S3 fixed mathematical priority distribution includes every same-type and all-opposite pairing",()=>{
  assert.deepEqual(S3_REVIEW_SUMMARY.byPriority,{
    P0_SAME_TYPE:16,P1_ALL_FOUR_DIFFERENT:8,P2_B1_DIFFERENCE:56,P3_OTHER:56
  });
  assert.deepEqual(S3_REVIEW_SUMMARY.byDraftAxisDistance,{
    "0":16,"1":32,"2":48,"3":32,"4":8
  });
  for(const row of S3_REVIEW_QUEUE){
    if(row.sameType){
      assert.equal(row.priority,"P0_SAME_TYPE");
      assert.ok(row.issueCodes.includes("SAME_TYPE_FRICTION_HYPOTHESES_ABSENT"));
    }else{
      assert.ok(row.issueCodes.includes("STORY_DESCRIBES_ONLY_FIRST_DIFFERING_AXIS"));
      if(row.draftStructuralDistance===4){
        assert.equal(row.priority,"P1_ALL_FOUR_DIFFERENT");
        assert.ok(row.issueCodes.includes("FOUR_AXIS_OPPOSITION_NOT_BAD_MATCH"));
      }else if(row.differentAxes.includes("B")){
        assert.equal(row.priority,"P2_B1_DIFFERENCE");
      }else{
        assert.equal(row.priority,"P3_OTHER");
      }
    }
  }
});
test("S3 preparation must not increment human reviews or final publication approvals",()=>{
  assert.equal(S3_REVIEW_SUMMARY.records,136);
  assert.equal(S3_REVIEW_SUMMARY.firstHumanApproved,0);
  assert.equal(S3_REVIEW_SUMMARY.independentSecondApproved,0);
  assert.equal(S3_REVIEW_SUMMARY.originalWorkbookV10Reconciled,false);
  assert.equal(S3_REVIEW_SUMMARY.sourceApprovedForPublication,0);
  assert.equal(S3_REVIEW_SUMMARY.sourceS1ModelFinalized,false);
  assert.equal(S3_REVIEW_SUMMARY.currentPublicationAllowed,false);
});
