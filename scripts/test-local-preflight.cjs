"use strict";
const assert = require("node:assert/strict");
const {CHECKS, runPreflight} = require("./local-preflight.cjs");

const expected = ["check-actions-manual-only.cjs", "test-actions-manual-only-policy.cjs",
  "test-check-generated-content.cjs", "check-generated-content.cjs",
  "test-published-content.cjs", "test-article-navigation.cjs",
  "site-static-check.cjs", "audit-seo.cjs"];
for (const name of expected) {
  assert.ok(CHECKS.some(([,script]) => script.endsWith("/" + name)),
    "Required local check missing: " + name);
}
assert.ok(!CHECKS.some(([,script]) => /live-production|browser-smoke/.test(script)),
  "Local preflight must not invoke expensive live/browser workflows");
const notes = [];
const output = {log: value => notes.push(value), error: value => notes.push(value)};
const cases = [
  ["all-pass", [0,0,0], 0],
  ["partial-fail", [0,1,0], 1],
  ["exception", [0,null,0], 1]
];
for (const [name, statuses, expectedExit] of cases) {
  const seen = [];
  let index = 0;
  const result = runPreflight({
    root: "/tmp/kaito-fixture",
    checks: [["A","a.cjs"],["B","b.cjs"],["C","c.cjs"]],
    output,
    exec: (node, args, opts) => {
      seen.push({node, script:args[0], cwd:opts.cwd});
      const status = statuses[index++];
      return status === null ? {error:new Error("mock failure"),status:null} : {status,signal:null};
    }
  });
  assert.equal(result, expectedExit, name);
  assert.equal(seen.length, 3, name + " should check all steps");
  assert.ok(seen.every(entry => entry.cwd === "/tmp/kaito-fixture"));
}
console.log("PASS KAITO local preflight: required checks, no live/browser, failure aggregation");
