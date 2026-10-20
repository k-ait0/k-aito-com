"use strict";
// Read-only diagnostic for a single deployed HTML mismatch.
// Usage: node scripts/diagnose-live-page.cjs /notes/kidp-002-whynot/
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const route = process.argv[2] || "/notes/kidp-002-whynot/";
if (!/^\/[a-z0-9/-]+\/$/.test(route) || route.includes("//") || route.includes("..")) {
  console.error("Expected a canonical local route ending in /");
  process.exit(2);
}
const root = path.resolve(__dirname, "..");
const filename = path.resolve(root, "." + route, "index.html");
if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename)) {
  console.error("Local HTML does not exist:", filename);
  process.exit(2);
}
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const expected = fs.readFileSync(filename);
const url = "https://k-aito.com" + route;
(async () => {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "KAITO-ReadOnly-Deploy-Diagnostic/1.0", "Cache-Control": "no-cache" }
  });
  if (response.status !== 200 || new URL(response.url).host !== "k-aito.com") {
    throw Error("Unexpected response: " + response.status + " " + response.url);
  }
  const actual = Buffer.from(await response.arrayBuffer());
  console.log(JSON.stringify({
    route, url: response.url, status: response.status,
    expected: { bytes: expected.length, sha256: hash(expected) },
    actual: { bytes: actual.length, sha256: hash(actual) },
    headers: Object.fromEntries(["etag","last-modified","cache-control","age","via","x-cache","content-type"].map(k => [k,response.headers.get(k)])),
    matches: expected.equals(actual)
  }, null, 2));
  if (expected.equals(actual)) return;
  const a = expected.toString("utf8").split(/\r?\n/);
  const b = actual.toString("utf8").split(/\r?\n/);
  const first = Array.from({length:Math.max(a.length,b.length)}, (_,i) => i)
    .find(i => a[i] !== b[i]);
  const safe = value => String(value ?? "<missing>").slice(0, 300);
  console.log("First differing line:", (first ?? 0) + 1);
  console.log("Local :", safe(a[first]));
  console.log("Public:", safe(b[first]));
  process.exitCode = 1;
})().catch(err => { console.error(err.message); process.exitCode = 2; });
