"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {audit,verifyMainWriter} = require("./check-main-write-workflows.cjs");
const root = path.resolve(__dirname,"..");
const writers = {
  "build-notebook-photo.yml": "BUILD_NOTEBOOK_TO_MAIN",
  "sync-published-content.yml": "SYNC_PUBLISHED_TO_MAIN"
};
const result = audit(root);
assert.equal(result.workflows,11);
assert.equal(result.guardedWriters,2);
for(const [name,token] of Object.entries(writers)){
  const content = fs.readFileSync(path.join(root,".github","workflows",name),"utf8");
  assert.equal(verifyMainWriter(content,name,token),true);
  for(const variant of [
    content.replace("inputs.confirm == '"+token+"'", "inputs.confirm == 'UNAPPROVED'"),
    content.replace("EXPECTED_MAIN_SHA: ${{ inputs.expected_main_sha }}","EXPECTED_MAIN_SHA: unreviewed"),
    content.replace("git rev-parse HEAD","git rev-parse HEADS"),
    content.replace('"$actual" == "$EXPECTED_MAIN_SHA"','"$actual" == "$UNKNOWN_SHA"'),
    content.replace("ref: main","ref: feature"),
    content.replace("git push origin HEAD:main","git push origin HEAD:feature"),
    content.replace("contents: write","contents: read"),
    content.replace("github.ref == 'refs/heads/main'","github.ref != 'refs/heads/main'"),
    content + "\n          git rebase origin/main\n"
  ]){
    assert.throws(()=>verifyMainWriter(variant,name,token),Error,
      name+": policy relaxation or unreviewed write must be rejected");
  }
}
console.log("PASS manual main-write SHA/token policy + mutation regression ("+
 Object.keys(writers).length+" writers)");
