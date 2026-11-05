import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appBase=new URL("../projects/kidp/life-design-lab/a05/",import.meta.url);
const read=(filename)=>readFileSync(new URL(filename,appBase),"utf8");

test("D-53 prototype HTML remains explicitly noindex and disclaims unvalidated assessment",()=>{
  const html=read("index.html");
  assert.match(html,/<meta\s+name="robots"\s+content="noindex,nofollow">/);
  assert.match(html,/A05\s*·\s*DEVELOPMENT/);
  assert.match(html,/研究・開発段階の自己理解ツール/);
  assert.match(html,/測定・診断するものではありません/);
  assert.match(html,/外部サーバーへの回答送信はありません/);
});

test("D-53 production module imports stay inside A05, never import research protocols",()=>{
  const names=["app.mjs","engine.mjs","storage.mjs","export.mjs",
    "backup-inspect.mjs","restore-review.mjs","format.mjs","questions.mjs","types.mjs"];
  const available=new Set(names);
  for(const name of names) {
    const source=read(name);
    const matches=[...source.matchAll(/\b(?:import|export)\s+[^;]*?\s+from\s+["']([^"']+)["']/g)];
    for(const [,moduleName] of matches){
      assert.ok(moduleName.startsWith("./"),name+" unexpected import "+moduleName);
      assert.ok(available.has(moduleName.slice(2)),name+" unknown import "+moduleName);
      assert.ok(!/\bresearch\b/i.test(moduleName),name+" research module linked");
    }
  }
});

test("D-53 backup review modules remain incapable of performing storage/network actions",()=>{
  for(const name of ["backup-inspect.mjs","restore-review.mjs"]){
    const source=read(name).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,"");
    assert.doesNotMatch(source,/\b(?:indexedDB|localStorage|sessionStorage|fetch|XMLHttpRequest|sendBeacon)\b/,name);
    assert.doesNotMatch(source,/\.\s*(?:put|delete|clear|open|setItem)\s*\(/,name);
    assert.doesNotMatch(source,/\b(?:eval|Function)\s*\(/,name);
  }
});

test("D-53 provisional scored-question versions are still draft, not validated claims",()=>{
  const q=read("questions.mjs"),e=read("engine.mjs"),t=read("types.mjs");
  assert.match(q,/QUESTION_SET_VERSION\s*=\s*"A05-Q-[^"]+-draft"/);
  assert.match(e,/SCORING_VERSION\s*=\s*"A05-S-[^"]+-draft"/);
  assert.match(t,/TYPE_VERSION\s*=\s*"A05-T-[^"]+-draft"/);
  assert.match(t,/CONTENT_VERSION\s*=\s*"A05-C-[^"]+-draft"/);
});
