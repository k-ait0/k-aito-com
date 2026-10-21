"use strict";
// Guard KAITO's no-automatic-generation policy while retaining release checks.
// Node 22, no dependencies, no GitHub Actions invocation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sync = fs.readFileSync(path.join(root, ".github/workflows/sync-published-content.yml"), "utf8");
const live = fs.readFileSync(path.join(root, ".github/workflows/live-production-check.yml"), "utf8");
const browser = fs.readFileSync(path.join(root, ".github/workflows/browser-qa.yml"), "utf8");
function triggers(yml) {
  const begin = yml.indexOf("\non:\n");
  const end = yml.indexOf("\npermissions:", begin + 1);
  assert.ok(begin >= 0 && end > begin, "Expected top-level on and permissions fields");
  return yml.slice(begin + "\non:\n".length, end);
}
const syncEvents = triggers(sync);
assert.match(syncEvents, /^  workflow_dispatch:\s*$/m);
assert.doesNotMatch(syncEvents, /^  (?:push|pull_request|workflow_run|schedule|repository_dispatch):/m);
assert.match(sync, /^\s{2}contents: write$/m, "Emergency manual sync retains write capability");
assert.match(sync, /^\s{2}update-index:$/m, "Manual sync job must be retained");

const liveEvents = triggers(live);
assert.match(liveEvents, /^  push:$/m, "Production verification still reacts to published commits");
assert.match(liveEvents, /'\*\*\/\*\.html'/, "Production verification still covers article HTML");
assert.match(liveEvents, /^  workflow_dispatch:$/m, "Manual production recheck remains available");

const browserEvents = triggers(browser);
assert.match(browserEvents, /^  workflow_dispatch:$/m);
assert.doesNotMatch(browserEvents, /^  (?:push|pull_request):/m, "Expensive browser QA must stay opt-in");
console.log("PASS: manual sync policy, live release verification, on-demand browser QA");
