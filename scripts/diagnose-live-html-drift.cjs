"use strict";
/**
 * Read-only diagnosis of one KAITO production HTML mismatch.
 * Usage: node scripts/diagnose-live-html-drift.cjs
 * Optional: KAITO_LIVE_ORIGIN=https://k-aito.com
 * Does not deploy, write to files, or start GitHub Actions.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const route = "/notes/kidp-002-whynot/";
const origin = process.env.KAITO_LIVE_ORIGIN || "https://k-aito.com";
const root = path.resolve(__dirname, "..");
const expected = fs.readFileSync(path.join(root, route.slice(1), "index.html"));
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const expectedHash = hash(expected);
const endpoint = new URL(route, origin);
if (!(endpoint.protocol === "https:" || (endpoint.protocol === "http:" &&
  ["localhost", "127.0.0.1"].includes(endpoint.hostname)))) {
  throw new Error("Only HTTPS endpoints or localhost HTTP tests are supported");
}

const excerpt = (bytes, offset) => {
  const text = bytes.toString("utf8");
  // Byte offsets and UTF-8 character offsets differ.
  const pos = bytes.subarray(0, offset).toString("utf8").length;
  return JSON.stringify(text.slice(Math.max(0, pos - 95), pos + 160));
};
const firstDifference = (a, b) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
};
const headerNames = ["cache-control", "age", "etag", "last-modified", "via", "x-cache", "cf-cache-status"];

async function probe(name, bypass) {
  const url = new URL(endpoint);
  if (bypass) url.searchParams.set("__kaito_diag", String(Date.now()));
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "KAITO-HTML-Drift-Diagnostics/1.0",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    }
  });
  if (response.status !== 200 || new URL(response.url).origin !== endpoint.origin) {
    throw new Error(name + ": unexpected HTTP " + response.status + " or redirect: " + response.url);
  }
  const live = Buffer.from(await response.arrayBuffer());
  const found = hash(live);
  const match = found === expectedHash;
  console.log("\n[" + name + "] " + url.pathname + url.search);
  console.log("HTTP " + response.status + " | live bytes " + live.length + " | SHA-256 " + found);
  console.log("expected bytes " + expected.length + " | SHA-256 " + expectedHash + " | " + (match ? "MATCH" : "MISMATCH"));
  for (const field of headerNames) {
    const value = response.headers.get(field);
    if (value) console.log(field + ": " + value.slice(0, 160));
  }
  if (!match) {
    const offset = firstDifference(expected, live);
    console.log("first differing byte offset: " + offset);
    console.log("EXPECTED excerpt: " + excerpt(expected, offset));
    console.log("LIVE excerpt:     " + excerpt(live, offset));
    console.log("EXPECTED has '次に見る': " + expected.includes(Buffer.from("次に見る")));
    console.log("LIVE has '次に見る':     " + live.includes(Buffer.from("次に見る")));
    console.log("LIVE has /projects/kidp/whynot/: " + live.includes(Buffer.from("/projects/kidp/whynot/")));
  }
  return { name, match, sha256: found };
}

(async () => {
  const results = [];
  for (const [name, bypass] of [["canonical-no-cache", false], ["query-bypass", true]]) {
    try {
      results.push(await probe(name, bypass));
    } catch (error) {
      console.error(name + ": " + error.message);
      process.exitCode = 2;
      return;
    }
  }
  const [canonical, bypass] = results;
  console.log("\nDIAGNOSIS:");
  if (canonical.match && bypass.match) {
    console.log("Both URLs match checked-out HTML. Re-run full 62-file production verification.");
  } else if (!canonical.match && bypass.match) {
    console.log("Only cache-bypass matches. Investigate CDN/HTTP caching before redeploying.");
  } else if (!canonical.match && !bypass.match && canonical.sha256 === bypass.sha256) {
    console.log("Both responses return identical outdated bytes. Check XServer deploy history, branch, document root and server-side cache; cause is not yet proven.");
  } else {
    console.log("Responses differ across probes. Inspect cache and routing configuration before modifying files.");
  }
  if (!canonical.match || !bypass.match) process.exitCode = 1;
})().catch(error => { console.error(error.stack || String(error)); process.exitCode = 2; });
