"use strict";
// Local-only guard against accidental manual Actions that can write to main.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "..");
const EXPECTED = Object.freeze({
  "build-notebook-photo.yml": "BUILD_NOTEBOOK_TO_MAIN",
  "sync-published-content.yml": "SYNC_PUBLISHED_TO_MAIN"
});

function verifyMainWriter(source, file, token) {
  assert.match(source, /\bon:\s*\n[\s\S]*?  workflow_dispatch:\s*\n    inputs:\s*\n/, file + ": requires explicit dispatch inputs");
  assert.match(source, /      confirm:\s*\n[\s\S]*?        required: true/, file + ": confirmation must be required");
  assert.match(source, /      expected_main_sha:\s*\n[\s\S]*?        required: true/, file + ": SHA must be required");
  assert.ok(source.includes("github.ref == 'refs/heads/main'"), file + ": only main ref may be dispatched");
  assert.ok(source.includes("inputs.confirm == '" + token + "'"), file + ": confirmation token mismatch");
  assert.ok(source.includes("EXPECTED_MAIN_SHA: ${{ inputs.expected_main_sha }}"), file + ": must use explicit reviewed SHA");
  assert.ok(source.includes("^[a-f0-9]{40}$"), file + ": SHA format check absent");
  assert.ok(source.includes('actual="$(git rev-parse HEAD)"') && source.includes('"$actual" == "$EXPECTED_MAIN_SHA"'), file + ": SHA match check absent");
  assert.match(source, /ref: main\s*(?:\n|$)/, file + ": must checkout main");
  const verifyAt = source.indexOf("Verify reviewed main SHA before any write-capable step");
  const pushAt = source.indexOf("git push origin HEAD:main");
  assert.ok(verifyAt >= 0 && pushAt > verifyAt, file + ": main write must follow verification");
  assert.doesNotMatch(source, /\bgit rebase\b/, file + ": rebase onto unreviewed main is forbidden");
  assert.match(source, /contents: write/, file + ": permissions must be declared");
  return true;
}
function audit(base=ROOT) {
  const dir = path.join(base, ".github", "workflows");
  const files = fs.readdirSync(dir).filter(n => /\.ya?ml$/i.test(n)).sort();
  const actualWriters = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    if (/contents:\s*write|\bgit push\b|actions:\s*write/.test(source)) actualWriters.push(file);
  }
  assert.deepEqual(actualWriters.sort(), Object.keys(EXPECTED).sort(), "Unknown or missing GitHub write-capable workflow");
  for (const [file,token] of Object.entries(EXPECTED)) {
    verifyMainWriter(fs.readFileSync(path.join(dir,file), "utf8"),file,token);
  }
  return {workflows: files.length, guardedWriters: Object.keys(EXPECTED).length};
}
function main() {
  try {console.log("PASS main-write manual guard: "+JSON.stringify(audit()));return 0;}
  catch(error){console.error("FAIL main-write manual guard: "+error.message);return 1;}
}
if(require.main === module)process.exitCode=main();
module.exports={audit,verifyMainWriter,main};
