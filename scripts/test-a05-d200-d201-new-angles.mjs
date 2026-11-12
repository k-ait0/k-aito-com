import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const json=p=>JSON.parse(read(p));
const gitBlob=p=>{const s=read(p);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex")};
const d=json("research/a05/d200-six-more-angles-13-to-18-twelve-questions.json");
const md=read("docs/A05_ALL_QUESTION_TEXTS_AND_EDITORIAL_ASSESSMENTS_20261111.md");
const report=read("docs/A05_V2_D201_METHODS_13_TO_18_REVIEW_20261112.md");
const old=json("research/a05/d146-50slot-before-after-quality-proposals.json");
const previous=json("research/a05/d179-six-alternative-elicitation-angles-review.json");
const more=json("research/a05/d181-six-more-elicitation-methods-twelve-ideas.json");
const shortlist=json("research/a05/d198-ten-to-four-editorial-shortlist.json");
const wide=["A","B","C","D"].flatMap(a=>json("research/a05/d"+({A:186,B:187,C:188,D:189}[a])+"-broad-patterns-axis-"+a+".json").questions);
const new24=json("research/a05/d183-twentyfour-new-content-question-drafts.json");
const valid=new Set([...old.items.map(x=>x.old_id),...previous.items.map(x=>x.id),...more.items.map(x=>x.id),...wide.map(x=>x.id),...new24.drafts.map(x=>x.id)]);
test("New methods 13–18 have exactly two complete original items each",()=>{
 assert.equal(d.cases.length,12);
 assert.equal(new Set(d.cases.map(x=>x.id)).size,12);
 for(const n of [13,14,15,16,17,18])assert.equal(d.cases.filter(x=>x.angle===n).length,2);
 assert.equal(d.counts.originals,12);
 assert.equal(d.counts.revised_experimental_prompts,12);
});
test("Original wording and original response format are preserved in full markdown",()=>{
 for(const c of d.cases){
  assert.ok(c.original.length>28,c.id);
  assert.ok(c.original_format,c.id);
  assert.ok(md.includes(c.original),c.id);
  assert.ok(report.includes(c.original),c.id);
  assert.ok(md.includes(c.original_format),c.id);
 }
});
test("Every research stimulus has complete textual prompts and candidate choices",()=>{
 for(const c of d.cases){
  assert.ok(c.revision.stem.length>24,c.id);
  assert.ok(["SINGLE_SCENE_CATEGORICAL","TWO_INDEPENDENT_7_POINT_RATINGS","TWO_CONSENT_CONDITIONS","TWO_PRESENT_MODES_PAIRED","PAIRED_C_CONTEXT","FRAME_COMPARISON_ONLY","FULL_2_BY_2_FOUR_OPTIONS"].includes(c.revision.format),c.id);
  assert.ok((c.revision.choices?.length||0)+(c.revision.statements?.length||0)+(c.revision.conditions?.length||0)>=2,c.id);
  assert.ok(md.includes(c.revision.stem),c.id);
  assert.ok(report.includes(c.revision.stem),c.id);
 }
});
test("No invented, ungrounded old question comparison ID",()=>{
 for(const c of d.cases)for(const id of c.comparison)assert.ok(valid.has(id),c.id+" missing comparator "+id);
});
test("Priority is 3 lead, 4 reserve and 5 held",()=>{
 assert.equal(d.cases.filter(x=>x.priority.startsWith("P1")).length,3);
 assert.equal(d.cases.filter(x=>x.priority.startsWith("P2")).length,4);
 assert.equal(d.cases.filter(x=>x.priority.startsWith("P3")).length,5);
 assert.deepEqual(d.cases.filter(x=>x.priority.startsWith("P1")).map(x=>x.id),["D200-13A","D200-14B","D200-15C1"]);
});
test("Technique change never silently creates new approved scoring families",()=>{
 assert.equal(d.counts.approved_scoring,0);
 assert.equal(d.real_respondent_records,0);
 assert.equal(d.production_changed,false);
 assert.ok(d.principles.do_not_enlarge_axes_without_evidence);
 assert.ok(d.principles.do_not_infer_semantic_independence_from_method);
 assert.ok(d.principles.retain_originals_for_comparison);
});
test("Existing four priority questions and the old 16 remain unchanged",()=>{
 assert.deepEqual(d.principles.preserve_PILOT_FIRST_4,shortlist.pilot_design.lead_4);
 assert.equal(d.principles.hold_previous_16,true);
 assert.ok(md.includes("重点4問（A-X10／B-X12／C-X07／D-X05）"));
});
test("Passive leisure vs active leisure are not miscast as a directly scorable C pole",()=>{
 const a=d.cases.find(c=>c.id==="D200-15C1"),b=d.cases.find(c=>c.id==="D200-15C2");
 assert.equal(a.revision.format,"TWO_PRESENT_MODES_PAIRED");
 assert.equal(a.revision.statements.length,2);
 assert.equal(b.revision.format,"PAIRED_C_CONTEXT");
 assert.equal(b.revision.conditions.length,2);
 assert.ok(b.revision.conditions[0].stem.includes("将来の準備"));
 assert.ok(b.revision.conditions[1].stem.includes("将来の準備"));
 assert.ok(a.stop.includes("補助研究"));
});
test("Advice about an associate respects agency and request for help",()=>{
 const c=d.cases.find(c=>c.id==="D200-14B");
 assert.equal(c.revision.format,"TWO_CONSENT_CONDITIONS");
 assert.deepEqual(c.revision.conditions.map(x=>x.id),["asked","not_asked"]);
 assert.ok(c.revision.conditions.every(x=>x.choices.length>=4));
});
test("Independent autonomy/consultation is not forced into bipolar scoring",()=>{
 for(const id of ["D200-13B","D200-14D"]){
 const c=d.cases.find(x=>x.id===id);assert.equal(c.revision.format,"TWO_INDEPENDENT_7_POINT_RATINGS");
 assert.equal(c.revision.statements.length,2);
 assert.equal(new Set(c.revision.statements.map(x=>x.id)).size,2);
 }
});
test("All cross-axis tradeoffs expose full 2x2 choices, not bundled extremes",()=>{
 for(const id of ["D200-17AB","D200-17CD"]){
 const c=d.cases.find(x=>x.id===id);
 assert.equal(c.revision.format,"FULL_2_BY_2_FOUR_OPTIONS");
 assert.equal(c.revision.choices.length,5);
 assert.equal(c.classification,"CROSS_AXIS_INTERACTION_NONSCORING");
 assert.ok(c.stop.includes("得点")||c.stop.includes("採点"));
 }
});
test("Historical A-BK14 exclusion is reflected in 18-axis caution",()=>{
 for(const id of ["D200-18A1","D200-18A2"]){
 const c=d.cases.find(x=>x.id===id);
 assert.ok(c.comparison.includes("A-BK14"));
 assert.ok(c.risk.includes("規範")||c.risk.includes("権限"));
 }
 assert.ok(report.includes("研究専用"));
});
test("All primary research source blobs remain the same as at creation",()=>{
 for(const [path,sha] of Object.entries(d.sources))assert.equal(gitBlob(path),sha,path);
});
test("All 12 assessments are in master appendix; legacy portions still exist",()=>{
 assert.equal((md.match(/^### D200-[A-Z0-9]+｜/gm)||[]).length,12);
 assert.equal((md.match(/^\*\*D200-[A-Z0-9]+｜/gm)||[]).length,12);
 for(let i=1;i<=11;i++)assert.ok(md.includes("## I-"+i+"．"),"I-"+i);
 for(let i=1;i<=10;i++)assert.ok(md.includes("## II-"+i+"．"),"II-"+i);
 assert.ok(md.includes("## I-12．"));
 assert.ok(md.includes("## II-11．"));
 for(const c of d.cases){assert.ok(md.includes(c.test),c.id);assert.ok(md.includes(c.stop),c.id);}
 assert.doesNotMatch(md,/undefined|\[object Object\]/);
 assert.doesNotMatch(report,/undefined|\[object Object\]/);
});
