import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const read=relative=>JSON.parse(readFileSync(resolve(root,relative),"utf8"));
const manifest=read("docs/A05_D54_PR_REVIEW_MANIFEST_20261026.json");
const g1=read("docs/A05_D38_G1_APPROVAL_REGISTER_20261026.json");
const d42=read("docs/A05_D42_30DAY_ACCEPTANCE_REGISTER_20261026.json");

test("D-54+ manifest assigns every tracked PR file exactly once",()=>{
  assert.equal(manifest.schema,"A05-D54-PR-REVIEW-MANIFEST-1");
  assert.equal(manifest.prNumber,61);
  assert.equal(manifest.repository,"k-ait0/k-aito-com");
  assert.equal(manifest.base,"main");
  assert.equal(manifest.state,"DRAFT_REVIEW_NOT_SIGNED_OFF");
  assert.equal(manifest.baselineAtCreation.trackedDiffFiles,64);
  assert.ok(manifest.files.length>=69,"review inventory cannot lose baseline entries");
  assert.equal(new Set(manifest.files.map(x=>x.path)).size,manifest.files.length);
  const sorted=manifest.files.map(x=>x.path);
  assert.deepEqual(sorted,[...sorted].sort());
  assert.ok(manifest.files.every(x=>existsSync(resolve(root,x.path)),
    "manifest entry must name a tracked file"));
});

test("D-54 file paths map to known review owners; everything awaits a human review",()=>{
  const groupIds=manifest.groups.map(g=>g.id);
  assert.deepEqual(groupIds,[
    "A_UI_ACCESSIBILITY","B_STORAGE_BACKUP","C_PROVISIONAL_SCORING",
    "D_RESEARCH_HUMAN_APPROVAL","E_CROSSCUTTING_QA_AUDIT"
  ]);
  for(const group of manifest.groups){
    assert.equal(group.releaseApproved,false);
    assert.ok(group.reviewStatus !== "APPROVED");
    assert.ok(group.riskPriority?.startsWith("P0_")||
              group.riskPriority?.startsWith("P1_"));
    assert.ok(group.requiredSignoffRole?.length>5);
    assert.ok(manifest.files.some(f=>f.group===group.id));
  }
  for(const file of manifest.files){
    assert.ok(groupIds.includes(file.group),file.path);
    assert.ok(["NOT_REVIEWED","REVIEWED"].includes(file.reviewStatus),file.path);
    if(file.reviewStatus==="REVIEWED") {
      for(const key of ["reviewEvidenceRef","reviewerRole","reviewedAt"]){
        assert.ok(typeof file[key]==="string"&&file[key].trim().length>0,
          file.path+": missing human review field "+key);
      }
    } else {
      for(const key of ["reviewEvidenceRef","reviewerRole","reviewedAt"]){
        assert.equal(file[key],null,file.path+": unverifiable evidence field "+key);
      }
    }
    assert.equal(file.mergeAuthorized,false,file.path);
    assert.ok(!file.path.startsWith("/")&&!file.path.includes(".."),
      "no absolute or upward-traversing manifest paths");
  }
});

test("D-54 review proof slots are empty and risk-prioritized until real humans sign",()=>{
  assert.match(manifest.version,/^D(?:5[6-9]|6[0-9]|7[0-9])-\d{3}$/);
  assert.ok(manifest.files.some(file=>file.path==="docs/A05_D55_P0_BACKUP_REVIEW_AND_DOC_CI_GATE_20261026.md"));
  assert.ok(manifest.files.some(file=>file.path==="docs/A05_D56_CROSS_TAB_DRAFT_IDENTITY_GUARD_20261026.md"));
  assert.ok(manifest.files.every(file=>file.reviewStatus==="NOT_REVIEWED"));
  assert.ok(manifest.files.every(file=>file.reviewEvidenceRef===null &&
    file.reviewerRole===null && file.reviewedAt===null));
  assert.equal(manifest.groups.find(g=>g.id==="B_STORAGE_BACKUP").riskPriority,
    "P0_DATA_PROTECTION");
  assert.equal(manifest.groups.find(g=>g.id==="C_PROVISIONAL_SCORING").riskPriority,
    "P0_RESEARCH_VALIDATION_BLOCKED");
  assert.equal(manifest.groups.find(g=>g.id==="D_RESEARCH_HUMAN_APPROVAL").riskPriority,
    "P0_HUMAN_APPROVAL_REQUIRED");
  assert.equal(manifest.guards.productionReleaseAuthorized,false);
  assert.equal(manifest.guards.studyAuthorized,false);
});

test("D-54 complete G1 and D42 cannot be implied by a green software QA run",()=>{
  assert.equal(g1.operationalDecisions.length,12);
  assert.ok(g1.operationalDecisions.every(x=>x.status==="PENDING"));
  assert.equal(g1.finalSignoff.state,"PENDING");
  assert.equal(d42.acceptanceChecks.length,16);
  assert.ok(d42.acceptanceChecks.every(x=>x.status==="PENDING"));
  assert.equal(d42.approval.state,"PENDING");
  assert.equal(manifest.guards.g1DecisionsPending,12);
  assert.equal(manifest.guards.d42AcceptanceChecksPending,16);
  assert.equal(manifest.guards.studyAuthorized,false);
  assert.equal(manifest.guards.validationOfPsychometrics,false);
});

test("D-54 PR stays draft-only, non-release, never auto-merge",()=>{
  assert.equal(manifest.guards.draftOnly,true);
  assert.equal(manifest.guards.automaticMerge,false);
  assert.equal(manifest.guards.productionReleaseAuthorized,false);
  assert.equal(manifest.guards.noParticipantDataCollected,true);
  assert.ok(manifest.groups.find(x=>x.id==="C_PROVISIONAL_SCORING")
    .reviewStatus.includes("RESEARCH_VALIDATION_PENDING"));
  assert.ok(manifest.groups.find(x=>x.id==="D_RESEARCH_HUMAN_APPROVAL")
    .reviewStatus.includes("PENDING"));
});

test("D-54 production and private research domains remain separately classified",()=>{
  const byPath=new Map(manifest.files.map(x=>[x.path,x.group]));
  const a="projects/kidp/life-design-lab/a05/";
  for(const name of ["app.mjs","index.html","style.css","format.mjs"]){
    assert.equal(byPath.get(a+name),"A_UI_ACCESSIBILITY");
  }
  for(const name of ["storage.mjs","export.mjs","backup-inspect.mjs","restore-review.mjs"]){
    assert.equal(byPath.get(a+name),"B_STORAGE_BACKUP");
  }
  for(const name of ["questions.mjs","engine.mjs","types.mjs"]){
    assert.equal(byPath.get(a+name),"C_PROVISIONAL_SCORING");
  }
  for(const [p,id] of byPath) {
    if(p.startsWith("scripts/a05-research-") ||
      /^docs\/A05_D(?:2[8-9]|3[0-9]|4[0-3])_/.test(p))
      assert.equal(id,"D_RESEARCH_HUMAN_APPROVAL",p);
  }
});

test("D-54 on GitHub PR merge refs: manifest covers exact full PR diff",t=>{
  // Pull-request checkout defaults to refs/pull/N/merge, whose HEAD^1 is
  // the base commit. Do NOT use the last single commit in a normal branch.
  if(process.env.GITHUB_EVENT_NAME!=="pull_request" ||
    !/^refs\/pull\/\d+\/merge$/.test(process.env.GITHUB_REF||""))
    return t.skip("Full merge-ref diff available only for pull_request checkout");
  const changed=execFileSync("git",["diff","--name-only","HEAD^1","HEAD"],{
    cwd:root,encoding:"utf8",maxBuffer:1024*1024
  }).trim().split("\n").filter(Boolean).sort();
  const listed=manifest.files.map(x=>x.path);
  assert.deepEqual(listed,changed,
    "Every changed file must have an explicit human review owner; update manifest before adding files");
});
