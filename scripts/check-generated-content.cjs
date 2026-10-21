"use strict";
/**
 * Compare article-generator output in a disposable copy of the working site.
 * Read-only with respect to the real checkout; requires only Node.js 22.
 * Usage: node scripts/check-generated-content.cjs
 *
 * A passing result means the article generator would not change the checked-in
 * HTML, sitemap.xml, or content-index.js. It does NOT verify deployment.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const cp = require("node:child_process");

const SKIP = new Set([
  ".git", ".github", "node_modules", "qa-screenshots", "coverage", "dist",
  ".cache", ".venv", "__pycache__", "docs"
]);
const toRel = (root, filename) => path.relative(root, filename).split(path.sep).join("/");
const isManaged = rel => rel === "content-index.js" || rel === "sitemap.xml" || rel.endsWith(".html");
const digest = filename => crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");

function snapshot(root) {
  const result = new Map();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        const relative = toRel(root, full);
        if (isManaged(relative)) result.set(relative, digest(full));
      }
    }
  }
  visit(root);
  return result;
}

function checkGenerated(root, options = {}) {
  const originalRoot = path.resolve(root);
  const script = options.generator || "scripts/sync-published-content.cjs";
  if (path.isAbsolute(script) || script.split(/[\\/]/).includes("..")) {
    throw new Error("Generator path must be relative and inside the project");
  }
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "kaito-generated-check-"));
  const scratch = path.join(parent, "site");
  try {
    fs.cpSync(originalRoot, scratch, {
      recursive: true,
      filter: source => {
        const rel = toRel(originalRoot, source);
        if (!rel) return true;
        if (rel.split("/").some(part => SKIP.has(part))) return false;
        if (path.basename(source).startsWith(".env")) return false;
        return !fs.lstatSync(source).isSymbolicLink();
      }
    });
    const original = snapshot(originalRoot);
    const output = cp.execFileSync(process.execPath, [path.join(scratch, script)], {
      cwd: scratch,
      encoding: "utf8",
      timeout: options.timeout || 60000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: {...process.env, KAITO_SKIP_SITE_SHELL_SYNC: "0", ...options.env}
    });
    const after = snapshot(scratch);
    const changed = [...new Set([...original.keys(), ...after.keys()])]
      .filter(rel => original.get(rel) !== after.get(rel))
      .sort();
    return {ok: changed.length === 0, changed, output};
  } finally {
    fs.rmSync(parent, {recursive: true, force: true});
  }
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, "..");
    const result = checkGenerated(root);
    if (!result.ok) {
      console.error("FAIL generated article content is out of sync (" + result.changed.length + " file(s)):");
      for (const file of result.changed) console.error("  " + file);
      console.error("Run 'node scripts/sync-published-content.cjs', review the diff and commit the generated output in the same PR.");
      process.exitCode = 1;
    } else {
      console.log("PASS generated article HTML, sitemap and index are synchronized; working tree unchanged.");
    }
  } catch (error) {
    console.error("ERROR: generated-content check could not complete: " + error.message);
    process.exitCode = 2;
  }
}
module.exports = {checkGenerated};
