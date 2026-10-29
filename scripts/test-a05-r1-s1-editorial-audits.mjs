import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const bytes=path=>readFileSync(new URL("../"+path,import.meta.url));
const json=path=>JSON.parse(bytes(path).toString("utf8"));
const b1=json("docs/A05_S1_B2_ITEM_PROTOTYPES_V01_20261030.json");
const bAudit=json("docs/A05_S1_B2_12ITEM_CRITICAL_AUDIT_V01_20261030.json");
const d73=json("docs/A05_D73_ITEM_CONSTRUCT_CROSSWALK_20261026.json");
const acd=json("docs/A05_S1_ACD_18ITEM_CROSS_AXIS_AUDIT_V01_20261030.json");
const ledger=json("docs/A05_R1_RELEASE_GATE_LEDGER_V01_20261029.json");
const gitBlobSha=buf=>createHash("sha1").update("blob "+buf.length+"\0").update(buf).digest("hex");

test("S1 B2 review follows the exact draft source and contains all 12 items",()=>{
 assert.equal(bAudit.sourceGitBlobSha,gitBlobSha(bytes(bAudit.sourcePath)));
 assert.equal(bAudit.itemPairs.length,6);
 assert.equal(bAudit.counts.originalItems,12);
 assert.equal(bAudit.counts.criticallyFlaggedPairs,6);
 assert.equal(bAudit.counts.approvedRevisedItems,0);
 assert.equal(bAudit.state,"EDITING_AUDIT_NOT_HUMAN_VALIDATION");
 for (let i=0;i<6;i++) {
   const row=bAudit.itemPairs[i],prior=b1.scenarios[i];
   assert.equal(row.id,prior.id);
   assert.equal(row.source.self,prior.self.text);
   assert.equal(row.source.others,prior.others.text);
   assert.ok(row.editorialFindings.length>0);
   assert.equal(row.revisionCandidate.bothUseSameConstruct,true);
   assert.equal(row.revisionCandidate.status,"DRAFT_REWRITE_NOT_APPROVED");
   assert.match(row.revisionCandidate.self,/自分の希望/);
   assert.match(row.revisionCandidate.others,/関係する人の希望/);
   assert.equal(row.humanApproved,false);
   assert.equal(row.scientificallyValidated,false);
   assert.equal(row.productionApproved,false);
 }
});
test("S1 A/C/D editorial review preserves original 18 records and statuses",()=>{
 assert.equal(acd.sourceGitBlobSha,gitBlobSha(bytes(acd.sourcePath)));
 assert.equal(acd.rows.length,18);
 assert.deepEqual(acd.counts.byOriginalStatus,{BLOCK:4,REVISE:7,TRIAL:7});
 assert.equal(acd.counts.currentlyApproved,0);
 const source=d73.items.filter(x=>["A","C","D"].includes(x.axis));
 for(let i=0;i<18;i++){
  const row=acd.rows[i],from=source[i];
  assert.equal(row.id,from.id);
  assert.equal(row.sourceEditorialStatus,from.editorialStatus);
  assert.deepEqual(row.original,from.current);
  assert.deepEqual(row.previousUnapprovedCandidate,from.candidate);
  assert.ok(row.reviewerCritique.riskIds.length>=2);
  assert.equal(row.sourceCandidateApproved,false);
  assert.equal(row.reviewerApproved,false);
  assert.equal(row.scientificallyValidated,false);
 }
});
test("S1 editorial audits are not silently treated as psychometric/owner/publication approvals",()=>{
 assert.equal(ledger.stages[0].acceptedCount,6);
 assert.equal(ledger.stages[1].acceptedCount,2);
 assert.equal(ledger.overallReleaseStatus,"NO_GO");
 assert.equal(ledger.releaseDecisionGranted,false);
 assert.equal(bAudit.publishStatus,"BLOCKED");
 assert.equal(acd.evidenceGates.ownerS1ModelApproved,false);
 assert.equal(acd.evidenceGates.publicationApproved,false);
 assert.equal(acd.evidenceGates.realParticipantsStudied,false);
});
