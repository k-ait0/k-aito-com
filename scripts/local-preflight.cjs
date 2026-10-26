"use strict";
/**
 * Local-first, no-GitHub-Actions QA for KAITO.
 * Usage: node scripts/local-preflight.cjs
 * Does not deploy or change the checked-out site.
 *
 * Browser QA and live-origin checks are separate manual release gates.
 */
const path = require("node:path");
const cp = require("node:child_process");

const CHECKS = [
  ["GitHub Actions manual-only audit", "scripts/check-actions-manual-only.cjs"],
  ["GitHub Actions policy regression", "scripts/test-actions-manual-only-policy.cjs"],
  ["Local preflight regression", "scripts/test-local-preflight.cjs"],
  ["Manual-sync workflow policy", "scripts/test-manual-sync-policy.cjs"],
  ["Generation guard regression", "scripts/test-check-generated-content.cjs"],
  ["Generated content matches checked-in files", "scripts/check-generated-content.cjs"],
  ["Published article regression", "scripts/test-published-content.cjs"],
  ["Article navigation", "scripts/test-article-navigation.cjs"],
  ["Site shell", "scripts/test-site-shell.cjs"],
  ["Breadcrumbs", "scripts/test-site-breadcrumbs.cjs"],
  ["Search core", "scripts/test-site-search-core.cjs"],
  ["Search UI", "scripts/test-site-search-ui.cjs"],
  ["Static references and metadata", "scripts/site-static-check.cjs"],
  ["SEO static audit", "scripts/audit-seo.cjs"]
];

function runPreflight({
  root = path.resolve(__dirname, ".."),
  checks = CHECKS,
  exec = cp.spawnSync,
  output = console
} = {}) {
  let failures = 0;
  for (const [label, script] of checks) {
    output.log("\n[KAITO LOCAL QA] " + label);
    const result = exec(process.execPath, [path.join(root, script)], {
      cwd: root,
      stdio: "inherit",
      timeout: 120000,
      env: process.env,
      windowsHide: true
    });
    if (result.error || result.status !== 0 || result.signal) {
      failures++;
      output.error("FAIL " + label + ": " +
        (result.error ? result.error.message : (result.signal || "exit " + result.status)));
    } else {
      output.log("PASS " + label);
    }
  }
  output.log("\nKAITO LOCAL QA RESULT: " +
    (checks.length - failures) + "/" + checks.length + " passed; " + failures + " failed.");
  output.log("This is NOT production verification or browser QA.");
  return failures ? 1 : 0;
}

if (require.main === module) process.exitCode = runPreflight();
module.exports = {CHECKS, runPreflight};
