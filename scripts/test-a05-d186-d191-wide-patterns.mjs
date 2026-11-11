import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const path={
  a:"research/a05/d186-broad-patterns-axis-A.json",
  b:"research/a05/d187-broad-patterns-axis-B.json",
  c:"research/a05/d188-broad-patterns-axis-C.json",
  d:"research/a05/d189-broad-patterns-axis-D.json",
  audit:"research/a05/d190-ninetysix-pattern-cross-family-audit.json",
  old:"research/a05/d146-50slot-before-after-quality-proposals.json",
  prev:"research/a05/d183-twentyfour-new-content-question-drafts.json",
  extra:"research/a05/d168-eleven-hypothesis-cognitive-probe-questions.json",
  angles:"research/a05/d181-six-more-elicitation-methods-twelve-ideas.json",
  report:"docs/A05_V2_D191_96PATTERN_BREADTH_FIRST_ANALYSIS_20261111.md"
};
const raw=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const json=p=>JSON.parse(raw(p));
const blob=p=>{const b=raw(p);return createHash("sha1").update("blob "+Buffer.byteLength(b)+"\0").update(b).digest("hex");};
const qs=[json(path.a),json(path.b),json(path.c),json(path.d)].flatMap(d=>d.questions),audit=json(path.audit),report=raw(path.report),old=json(path.old),prev=json(path.prev),extra=json(path.extra),angles=json(path.angles);
const statuses=new Set(["LEGACY_OVERLAP","CONTENT_HYPOTHESIS","CROSS_AXIS_RISK","BIPOLARITY_RISK","FORMAT_ONLY"]);
const norm=s=>s.normalize("NFKC").replace(/[\s　。、・？！?！,，():：（）「」『』　\/\-ー]/g,"").toLowerCase();
const full=q=>norm([q.stem,q.left,q.right].join(" "));
test("96 complete question patterns, 24 for each axis",()=>{
  assert.equal(qs.length,96);assert.equal(new Set(qs.map(q=>q.id)).size,96);
  for(const ax of "ABCD")assert.equal(qs.filter(q=>q.axis===ax).length,24);
  assert.equal(qs.filter(q=>q.axis==="E").length,0);
});
test("32 research-only provisional families with 3 wordings each",()=>{
  assert.equal(audit.families.length,32);
  for(const ax of "ABCD")assert.equal(audit.families.filter(f=>f.axis===ax).length,8);
  assert.ok(audit.families.every(f=>f.member_ids.length===3&&f.keep_all_three_for_research&&!f.established_as_distinct_family&&!f.measured_validity));
});
test("All research wordings have stem, two distinct poles, explanation and confounds",()=>{
  for(const q of qs){assert.ok(q.stem.length>25,q.id);assert.ok(q.left.length>5&&q.right.length>5,q.id);
    assert.notEqual(q.left,q.right,q.id);assert.ok(q.family_hypothesis&&q.confounds&&q.closest_prior_ids.length,q.id);
  }
});
test("All 96 IDs exactly match 32 family-member IDs",()=>{
  const all=audit.families.flatMap(f=>f.member_ids);
  assert.deepEqual(new Set(all),new Set(qs.map(q=>q.id)));
  assert.equal(new Set(all).size,96);
});
test("Every two same-family comparisons recorded; variants not prematurely excluded",()=>{
  const map=new Map(qs.map(q=>[q.id,q]));
  for(const q of audit.questions){assert.equal(q.same_family_variants.length,2,q.id);
    assert.ok(q.same_family_variants.every(x=>map.has(x.id)&&map.get(x.id).family_id===q.family_id&&x.score>=0&&x.score<=1),q.id);
  }
});
test("All 96 have a grounded editorial classification and interfamily overlap markers",()=>{
  const byId=new Map(audit.families.map(x=>[x.family_id,x]));
  assert.equal(audit.questions.length,96);
  for(const q of audit.questions){assert.ok(byId.has(q.family_id),q.id);assert.ok(statuses.has(q.provisional_classification),q.id);
    assert.equal(q.provisional_classification,byId.get(q.family_id).classification,q.id);
    assert.ok(q.related_provisional_families.every(x=>byId.has(x)),q.id);
  }
});
test("Editorial category counts remain explicit rather than inflating the selected item count",()=>{
  const n=Object.fromEntries([...statuses].map(x=>[x,audit.families.filter(f=>f.classification===x).length]));
  assert.deepEqual(n,{LEGACY_OVERLAP:17,CONTENT_HYPOTHESIS:10,CROSS_AXIS_RISK:2,BIPOLARITY_RISK:1,FORMAT_ONLY:2});
  assert.equal(Object.values(n).reduce((a,b)=>a+b,0),32);
});
test("All source references use exact Git blob hashes",()=>{
  for(const [p,ref] of Object.entries(audit.source_sha))assert.equal(ref,blob(p),p);
});
test("Historical corpus contains exactly 50 old and 24 earlier new drafts",()=>{
  assert.equal(old.items.length,50);assert.equal(prev.drafts.length,24);
  assert.equal(audit.summary.exact_text_duplicates_within_96,0);
  assert.equal(audit.summary.exact_text_duplicates_to_historical_74,0);
});
test("Recalculate normalized exact text duplicates against 74 historical drafts",()=>{
  const w=qs.map(full),pre=[...old.items.map(x=>x.new_proposal),...prev.drafts].map(full);
  assert.equal(new Set(w).size,96);
  assert.equal(w.filter(x=>pre.includes(x)).length,0);
});
test("Lexical similarity is explicitly a heuristic and not semantic validation",()=>{
  const ids=new Set([...old.items.map(x=>x.old_id),...prev.drafts.map(x=>x.id)]);
  for(const q of audit.questions){assert.ok(q.lexical_method.includes("NOT semantic equivalence"),q.id);
    assert.equal(q.lexical_nearest_historical.length,3);
    for(const p of q.lexical_nearest_historical){assert.ok(ids.has(p.id),q.id);assert.ok(p.score>=0&&p.score<=1,q.id);}
  }
});
test("Every closest prior ID originates in previous archives",()=>{
  const ids=new Set([...old.items.map(x=>x.old_id),...prev.drafts.map(x=>x.id),...extra.items.map(x=>x.id),...angles.items.map(x=>x.id)]);
  for(const q of qs)assert.ok(q.closest_prior_ids.every(id=>ids.has(id)),q.id+" unknown "+q.closest_prior_ids.filter(id=>!ids.has(id)));
});
test("Research pool 3-per-family does not override scoring maximum 2",()=>{
  assert.ok(audit.fixed_rules.research_variants_per_family_uncapped);
  assert.equal(audit.fixed_rules.scored_semantic_family_cap,2);
  assert.equal(audit.fixed_rules.exact_semantic_duplicates_allowed_in_scored_bank,0);
  assert.equal(audit.fixed_rules.bank_50,true);assert.equal(audit.fixed_rules.run_30,true);assert.equal(audit.fixed_rules.E_2,true);
});
test("No scored item or independent family has been empirically established",()=>{
  assert.equal(audit.summary.formal_scoring_items_added,0);
  assert.equal(audit.summary.independent_semantic_families_confirmed,0);
  assert.equal(audit.summary.previous_32_unresolved_slots_unchanged,32);
  assert.equal(audit.respondent_sessions,0);
  assert.ok(qs.every(q=>!q.scored_approved&&!q.semantic_distinctness_proven));
});
test("Full report publishes all 96 original question stems and both poles",()=>{
  for(const q of qs){assert.ok(report.includes(q.stem),q.id+" stem");assert.ok(report.includes(q.left),q.id+" left");
    assert.ok(report.includes(q.right),q.id+" right");assert.ok(report.includes("**"+q.id+"｜"),q.id+" header");
  }
});
test("Report includes all 32 families and conservative interpretation",()=>{
  for(const f of audit.families){assert.ok(report.includes("### "+f.family_id+"｜"),f.family_id);assert.ok(report.includes(f.rationale),f.family_id+" rationale");}
  assert.ok(report.includes("96問"));assert.ok(report.includes("未充足32枠"));
  assert.ok(report.includes("未確定0件"));assert.ok(report.includes("新系統"));
});
