"use strict";
/** Fail-closed, local-only GitHub Actions trigger policy audit. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function triggerEvents(source, filename = "workflow") {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const locations = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^on\s*:/.test(lines[i])) locations.push(i);
    if (/^["']on["']\s*:/.test(lines[i]))
      throw new Error(filename + ": quoted on mapping is unsupported");
  }
  if (locations.length !== 1) throw new Error(filename + ": expected one top-level on mapping");
  if (!/^on:\s*(?:#.*)?$/.test(lines[locations[0]]))
    throw new Error(filename + ": inline trigger declarations are forbidden");
  const events = [];
  for (let i = locations[0] + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^[^\s]/.test(line)) break;
    const event = line.match(/^  ([a-z][a-z0-9_-]*):(?:\s*(?:#.*)?)?$/);
    if (event) { events.push(event[1]); continue; }
    if (/^ {2}\S/.test(line)) throw new Error(filename + ": unrecognized trigger at line " + (i + 1));
    if (!/^ {4,}\S/.test(line)) throw new Error(filename + ": invalid trigger indentation at line " + (i + 1));
  }
  if (events.length !== 1 || events[0] !== "workflow_dispatch")
    throw new Error(filename + ": only workflow_dispatch is allowed; found " + (events.join(",") || "none"));
  return events;
}
function audit(rootDir = root) {
  const policy = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/GITHUB_ACTIONS_POLICY.json"), "utf8"));
  if (policy.schema !== "KAITO-ACTIONS-MANUAL-ONLY-1" ||
      JSON.stringify(policy.allowedTriggers) !== JSON.stringify(["workflow_dispatch"]) ||
      !Array.isArray(policy.automatedTriggerExceptions) ||
      policy.automatedTriggerExceptions.length !== 0)
    throw new Error("Policy relaxation is forbidden; no automatic trigger exceptions are authorized");
  const dir = path.join(rootDir, ".github", "workflows");
  const names = fs.readdirSync(dir).filter(n => /\.ya?ml$/i.test(n)).sort();
  if (!Array.isArray(policy.expectedWorkflowFiles) ||
      JSON.stringify(policy.expectedWorkflowFiles) !== JSON.stringify(names))
    throw new Error("Unknown workflow added or removed without inventory review");
  for (const name of names) triggerEvents(fs.readFileSync(path.join(dir,name), "utf8"), name);
  return names;
}
function main() {
  try {
    const names = audit();
    console.log("PASS GitHub Actions manual-only: " + names.length + "/" + names.length + " workflows; no auto triggers");
    return 0;
  } catch (err) {
    console.error("FAIL GitHub Actions manual-only policy: " + err.message);
    return 1;
  }
}
if (require.main === module) process.exitCode = main();
module.exports = { triggerEvents, audit, main };
