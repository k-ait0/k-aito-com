import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { S3_REVIEW_QUEUE, S3_REVIEW_SUMMARY } from
  "../projects/kidp/life-design-lab/a05/r1-s3-review-queue.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const snapshot=JSON.parse(read("docs/A05_S3_136PAIR_REVIEW_QUEUE_V01_20261030.json").toString("utf8"));
const sha1GitBlob=buf=>createHash("sha1").update("blob "+buf.length+"\0").update(buf).digest("hex");

test("S3 136-item JSON snapshot pinned to exact source versions and source blobs",()=>{
  for(const [path,gitSha] of Object.entries(snapshot.sourceFiles)) {
    assert.equal(sha1GitBlob(read(path)),gitSha,path+" blob changed");
  }
  assert.equal(snapshot.schema,"A05-R1-S3-PENDING-136PAIR-REVIEW-QUEUE-0.1.0");
  assert.equal(snapshot.rows.length,136);
  assert.equal(new Set(snapshot.rows.map(x=>x.pairId)).size,136);
  assert.equal(snapshot.sourceOriginalWorkbookV10.status,"NOT_LOCATED");
  assert.equal(snapshot.sourceOriginalWorkbookV10.directReconciliation,false);
  assert.equal(snapshot.sourceOriginalWorkbookV01.structuralReconciliation,
    "PREVIOUSLY_REPORTED_IN_C04_NOT_NEWLY_BYTE_VERIFIED");
  assert.deepEqual(snapshot.priorityCounts,S3_REVIEW_SUMMARY.byPriority);
  assert.deepEqual(snapshot.axisDistanceCounts,S3_REVIEW_SUMMARY.byDraftAxisDistance);
});
test("S3 all rows correspond exactly to source read-only generator; human and publication states pending",()=>{
  for(let i=0;i<S3_REVIEW_QUEUE.length;i++){
    const row=S3_REVIEW_QUEUE[i],expected=snapshot.rows[i];
    assert.equal(expected.pairId,row.pairId);
    assert.deepEqual(expected.typeIds,row.typeIds);
    assert.equal(expected.sameType,row.sameType);
    assert.deepEqual(expected.sharedAxes,row.sharedAxes);
    assert.deepEqual(expected.differentAxes,row.differentAxes);
    assert.deepEqual(expected.issueCodes,row.issueCodes);
    assert.equal(expected.priority,row.priority);
    assert.equal(expected.reviews.first,"PENDING");
    assert.equal(expected.reviews.second,"PENDING");
    assert.equal(expected.reviews.firstReviewer,null);
    assert.equal(expected.reviews.secondReviewer,null);
    assert.equal(expected.publishedClaims.originalWorkbookV10Reconciled,false);
    assert.equal(expected.publishedClaims.draftTextApproved,false);
    assert.equal(expected.publishedClaims.scientificPairValidation,false);
    assert.equal(expected.publishedClaims.publicationApproved,false);
  }
  assert.equal(snapshot.reviewCounts.firstHumanApproved,0);
  assert.equal(snapshot.reviewCounts.secondIndependentApproved,0);
  assert.equal(snapshot.reviewCounts.publishable,0);
  assert.equal(snapshot.riskPolicy.release,"NO_GO");
});
