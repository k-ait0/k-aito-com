import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TYPES } from "../projects/kidp/life-design-lab/a05/types.mjs";
import { COMPATIBILITY_PAIRS, getTypeAxisProfile } from
  "../projects/kidp/life-design-lab/a05/compatibility.mjs";
import { EVIDENCE_SOURCE_RECORDS, EVIDENCE_DECISIONS } from
  "../projects/kidp/life-design-lab/a05/compatibility-evidence.mjs";
import { LITERATURE_CANDIDATES, SOURCE_BY_ID } from
  "../projects/kidp/life-design-lab/a05/compatibility-literature-candidates.mjs";
import { EDITORIAL_DISPLAY_VERSION, EDITORIAL_PAIRS, EDITORIAL_GENERAL_SOURCES,
  STRUCTURAL_LABELS, getEditorialPair } from
  "../projects/kidp/life-design-lab/a05/compatibility-editorial.mjs";

const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("C03 preserves 136 ordered-independent pairs with 16 same-type entries", () => {
  assert.equal(EDITORIAL_DISPLAY_VERSION, "A05-COMPAT-C03-0.1.0-unapproved");
  assert.equal(EDITORIAL_PAIRS.length, 136);
  assert.deepEqual(EDITORIAL_PAIRS.map(x=>x.id), COMPATIBILITY_PAIRS.map(x=>x.id));
  assert.equal(new Set(EDITORIAL_PAIRS.map(x=>x.id)).size,136);
  assert.equal(EDITORIAL_PAIRS.filter(x=>x.typeIds[0]===x.typeIds[1]).length,16);
  for(const a of TYPES) for(const b of TYPES)
    assert.equal(getEditorialPair(a.id,b.id),getEditorialPair(b.id,a.id));
});

test("C03 distance counts are structural, not compatibility scores", () => {
  assert.deepEqual(STRUCTURAL_LABELS, ["同型","近接","混合","対照","反対頂点"]);
  const bins=[0,0,0,0,0];
  for(const p of EDITORIAL_PAIRS){
    assert.equal(p.facts.tier,"A_DRAFT_DEFINITION_FACT");
    assert.equal(p.facts.sharedAxesCount+p.facts.differentAxesCount,4);
    bins[p.facts.differentAxesCount]++;
    assert.equal(p.facts.structure,STRUCTURAL_LABELS[p.facts.differentAxesCount]);
    assert.equal(p.compatibilityScore,null);
    assert.equal(p.compatibilityRank,null);
    assert.equal(p.predictedSuccess,null);
    assert.equal(p.directPairValidation,false);
    assert.equal(p.sourcePairsValidated,0);
    assert.equal(p.productionApproved,false);
    assert.equal(p.original136WorkbookReconciled,false);
    assert.ok(Object.isFrozen(p));
    assert.ok(Object.isFrozen(p.facts));
    assert.ok(Object.isFrozen(p.editorial));
    assert.ok(Object.isFrozen(p.generalResearch));
  }
  assert.deepEqual(bins,[16,32,48,32,8]);
});

test("C03 A facts reflect immutable C01 type bits and no respondent data", () => {
  for(const p of EDITORIAL_PAIRS){
    const left=getTypeAxisProfile(p.typeIds[0]),right=getTypeAxisProfile(p.typeIds[1]);
    const axes=[...p.facts.shared.map(x=>x.axis),...p.facts.differences.map(x=>x.axis)].sort();
    assert.deepEqual(axes,["A","B","C","D"]);
    for(const x of p.facts.shared)assert.equal(left[x.axis],right[x.axis]);
    for(const x of p.facts.differences)assert.notEqual(left[x.axis],right[x.axis]);
  }
  const sample=getEditorialPair("T02","T11");
  assert.deepEqual(sample.facts.shared.map(x=>x.axis),["B"]);
  assert.deepEqual(sample.facts.differences.map(x=>x.axis),["A","C","D"]);
  assert.equal(sample.facts.sharedAxesCount,1);
  assert.equal(sample.facts.differentAxesCount,3);
  assert.equal(getEditorialPair("T01","T01").facts.differentAxesCount,0);
  assert.equal(getEditorialPair("T01","T16").facts.differentAxesCount,4);
  assert.throws(()=>getEditorialPair("T00","T01"),TypeError);
});

test("C03 general research is not credited as pair-specific validation", () => {
  assert.equal(EDITORIAL_GENERAL_SOURCES.length,4);
  assert.deepEqual(EDITORIAL_GENERAL_SOURCES.map(x=>x.id),
    ["LIT-R001","LIT-R002","LIT-R003","LIT-R004"]);
  assert.deepEqual(EVIDENCE_SOURCE_RECORDS,[]);
  assert.equal(EVIDENCE_DECISIONS.productionPublication,"BLOCKED");
  for(const p of EDITORIAL_PAIRS){
    assert.equal(p.generalResearch.tier,"B_GENERAL_RESEARCH_NOT_A05_VALIDATION");
    assert.equal(p.generalResearch.citationsApprovedForProduction,false);
    assert.deepEqual(p.generalResearch.sourceIds,
      ["LIT-R001","LIT-R002","LIT-R003","LIT-R004"]);
    assert.match(p.generalResearch.note,/A05のタイプ/);
    assert.equal(p.editorial.tier,"C_EDITORIAL_HYPOTHESIS");
    assert.match(p.editorial.caveat,/B軸/);
    assert.ok(p.editorial.conversationPrompts.length>=1);
    assert.ok(p.editorial.title.includes(" × "));
  }
});

test("C03 bibliography contains 7 internal candidate abstracts, no adopted evidence",()=>{
  assert.equal(LITERATURE_CANDIDATES.length,7);
  assert.equal(Object.keys(SOURCE_BY_ID).length,7);
  assert.equal(LITERATURE_CANDIDATES.filter(x=>x.id==="LIT-R001")[0].sample,"339 articles");
  assert.equal(LITERATURE_CANDIDATES.filter(x=>x.id==="LIT-R002")[0].sample,
    "3,674 heterosexual couples; Wave 2: 2,820");
  for(const source of LITERATURE_CANDIDATES){
    assert.equal(source.fullTextReviewed,false);
    assert.equal(source.directlyValidatesA05,false);
    assert.equal(source.directlyValidatesAnyA05Pair,false);
    assert.equal(source.publishedClaimApproved,false);
    assert.equal(source.claimTier,"B_GENERAL_RESEARCH_CANDIDATE");
    assert.ok(source.url.startsWith("https://"));
    assert.ok(source.doi.startsWith("10."));
    assert.ok(Object.isFrozen(source));
  }
});

test("C03 preview is separate/noindex, has no personal storage, analytics or XSS sinks", () => {
  const paths=[
    "projects/kidp/life-design-lab/a05/compatibility-editorial.mjs",
    "projects/kidp/life-design-lab/a05/compatibility-editorial-preview.mjs",
    "projects/kidp/life-design-lab/a05/compatibility-editorial-preview.html"
  ];
  const [engine,js,html]=paths.map(read);
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/A｜仕様事実/);
  assert.match(html,/B｜一般研究/);
  assert.match(html,/C｜編集仮説/);
  assert.match(js,/textContent/);
  assert.match(js,/getEditorialPair/);
  assert.match(html,/id="first"/);
  assert.match(html,/id="second"/);
  assert.match(html,/id="nearby"/);
  for(const forbidden of ["localStorage","sessionStorage","indexedDB",
    "fetch(","XMLHttpRequest","sendBeacon","innerHTML","navigator.serviceWorker",
    "eval(","new Function(","import("])
    assert.equal([engine,js,html].some(x=>x.includes(forbidden)),false,forbidden);
  assert.equal(js.includes("fetch("),false);
  assert.equal(js.includes("window.location"),false);
  assert.match(js,/noopener noreferrer/);
});
