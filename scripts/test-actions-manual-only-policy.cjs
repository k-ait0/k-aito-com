"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { triggerEvents, audit } = require("./check-actions-manual-only.cjs");
const valid = "name: Test\non:\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  check:\n    runs-on: ubuntu-latest\n";
assert.deepEqual(triggerEvents(valid), ["workflow_dispatch"]);
for (const invalid of [
  "name: X\non:\n  pull_request:\njobs:\n",
  "name: X\non:\n  workflow_dispatch:\n  push:\njobs:\n",
  "name: X\non:\n  workflow_dispatch:\n  workflow_run:\njobs:\n",
  "name: X\non:\n  schedule:\n    - cron: '0 1 * * *'\njobs:\n",
  "name: X\non: [workflow_dispatch, push]\njobs:\n",
  "name: X\non: *alias\njobs:\n",
  "name: X\non:\n - workflow_dispatch\njobs:\n",
  "name: X\non:\n  workflow_dispatch:\n  workflow_dispatch:\njobs:\n",
  "name: X\non:\n  workflow_dispatch:\njobs:\non:\n  workflow_dispatch:\n"
]) assert.throws(() => triggerEvents(invalid), Error);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kaito-ci-policy-"));
try {
  fs.mkdirSync(path.join(tmp, ".github/workflows"), {recursive:true});
  fs.mkdirSync(path.join(tmp, "docs"));
  const file = path.join(tmp, ".github/workflows/manual.yml");
  const policy = path.join(tmp, "docs/GITHUB_ACTIONS_POLICY.json");
  const base = {schema:"KAITO-ACTIONS-MANUAL-ONLY-1",allowedTriggers:["workflow_dispatch"],automatedTriggerExceptions:[],expectedWorkflowFiles:["manual.yml"]};
  fs.writeFileSync(file, valid);
  fs.writeFileSync(policy, JSON.stringify(base));
  assert.deepEqual(audit(tmp), ["manual.yml"]);
  fs.writeFileSync(file, valid.replace("  workflow_dispatch:", "  push:"));
  assert.throws(() => audit(tmp), /only workflow_dispatch/);
  fs.writeFileSync(file, valid);
  fs.writeFileSync(path.join(tmp, ".github/workflows/new.yml"), valid);
  assert.throws(() => audit(tmp), /Unknown workflow/);
  fs.unlinkSync(path.join(tmp, ".github/workflows/new.yml"));
  fs.writeFileSync(policy, JSON.stringify({...base, allowedTriggers:["push"]}));
  assert.throws(() => audit(tmp), /Policy relaxation/);
  fs.writeFileSync(policy, JSON.stringify({...base,automatedTriggerExceptions:["push"]}));
  assert.throws(() => audit(tmp), /Policy relaxation/);
} finally { fs.rmSync(tmp, {recursive:true,force:true}); }
console.log("PASS manual-only GitHub Actions guard regression and injection tests");
