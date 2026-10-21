"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {checkGenerated} = require("./check-generated-content.cjs");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "kaito-guard-test-"));
try {
  fs.mkdirSync(path.join(work, "scripts"));
  fs.mkdirSync(path.join(work, "notes", "example"), {recursive: true});
  const article = path.join(work, "notes", "example", "index.html");
  fs.writeFileSync(article, "<html>old</html>");
  fs.writeFileSync(path.join(work, "content-index.js"), "index");
  fs.writeFileSync(path.join(work, "sitemap.xml"), "site");
  fs.writeFileSync(path.join(work, "scripts", "sync-published-content.cjs"), [
    'const fs=require("node:fs");',
    'if(process.env.TEST_GENERATION_MODE==="drift") {',
    '  fs.writeFileSync("notes/example/index.html","<html>new</html>");',
    '}',
    'if(process.env.TEST_GENERATION_MODE==="broken") throw Error("generator failure");'
  ].join("\n"));

  let outcome = checkGenerated(work, {env:{TEST_GENERATION_MODE:"clean"}});
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.changed, []);

  outcome = checkGenerated(work, {env:{TEST_GENERATION_MODE:"drift"}});
  assert.equal(outcome.ok, false);
  assert.deepEqual(outcome.changed, ["notes/example/index.html"]);
  assert.equal(fs.readFileSync(article,"utf8"), "<html>old</html>", "original must never be modified");

  assert.throws(() => checkGenerated(work, {env:{TEST_GENERATION_MODE:"broken"}}));
  assert.equal(fs.readFileSync(article,"utf8"), "<html>old</html>");
  console.log("PASS generated-content guard: in-sync, drift, generator error; original unmodified");
} finally {
  fs.rmSync(work, {recursive:true, force:true});
}
