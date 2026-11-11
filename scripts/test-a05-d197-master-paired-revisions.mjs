import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const parse=path=>JSON.parse(load(path));
const gitBlob=path=>{const s=load(path);return createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex");};
const study=parse("research/a05/d197-ten-priority-questions-paired-revisions.json");
const master=load("docs/A05_ALL_QUESTION_TEXTS_AND_EDITORIAL_ASSESSMENTS_20261111.md");
const corpus=["A","B","C","D"].flatMap(a=>parse("research/a05/d"+({A:186,B:187,C:188,D:189}[a])+"-broad-patterns-axis-"+a+".json").questions);
const old=parse("research/a05/d146-50slot-before-after-quality-proposals.json");
const recent=parse("research/a05/d183-twentyfour-new-content-question-drafts.json");
const cognitive=parse("research/a05/d168-eleven-hypothesis-cognitive-probe-questions.json");
const risk=parse("research/a05/d192-ninetysix-multilens-risk-register.json");
test("Exactly ten prioritized families: six first and four second",()=>{
 assert.equal(study.cases.length,10);
 assert.equal(new Set(study.cases.map(c=>c.case_id)).size,10);
 assert.equal(new Set(study.cases.map(c=>c.family_id)).size,10);
 assert.equal(study.cases.filter(c=>c.priority===1).length,6);
 assert.equal(study.cases.filter(c=>c.priority===2).length,4);
});
test("All original question texts are preserved exactly from the 96-draft pool",()=>{
 for(const c of study.cases){
  const q=corpus.find(q=>q.id===c.source_question_id);
  assert.ok(q,c.case_id);
  assert.equal(q.axis,c.axis);
  assert.equal(q.family_id,c.family_id);
  assert.deepEqual(c.source_original,{stem:q.stem,left:q.left,right:q.right});
 }
});
test("Comparison texts exactly match their historical versions",()=>{
 for(const c of study.cases){
  const a=c.existing_comparator;let expected,source;
  const o=old.items.find(x=>x.old_id===a.source_id),n=recent.drafts.find(x=>x.id===a.source_id),r=cognitive.items.find(x=>x.id===a.source_id);
  if(o){expected=o.new_proposal;source="D146_REVISED";}
  else if(n){expected={stem:n.stem,left:n.left,right:n.right};source="D183_DRAFT";}
  else if(r){expected=r.prompt;source="D168_RESEARCH";}
  else assert.fail("Unknown comparative source: "+a.source_id);
  assert.deepEqual(a.text,expected,c.case_id);
  assert.equal(a.source_version,source,c.case_id);
  if(r)assert.deepEqual(a.independent_ratings,r.independent_rating_statements);
 }
});
test("Two B questions are separate 7-point ratings, not false forced choices",()=>{
 const b=study.cases.filter(x=>x.axis==="B");
 assert.equal(b.length,2);
 for(const c of b){
  assert.equal(c.proposed_revision.format,"TWO_INDEPENDENT_7_POINT_RATINGS");
  assert.equal(c.proposed_revision.left,null);assert.equal(c.proposed_revision.right,null);
  assert.equal(c.proposed_revision.independent_rating_statements.length,2);
  assert.equal(new Set(c.proposed_revision.independent_rating_statements.map(x=>x.id)).size,2);
  assert.ok(c.proposed_revision.independent_rating_statements.every(r=>r.label.length>10));
 }
 assert.ok(study.protocol.B_axis.includes("do not force"));
});
test("All eight non-B questions have two substantive competing options",()=>{
 const arr=study.cases.filter(x=>x.axis!=="B");
 assert.equal(arr.length,8);
 for(const c of arr){
  assert.equal(c.proposed_revision.format,"BIPOLAR_RESEARCH_ONLY");
  assert.ok(c.proposed_revision.stem.length>24);
  assert.ok(c.proposed_revision.left.length>8);
  assert.ok(c.proposed_revision.right.length>8);
  assert.notEqual(c.proposed_revision.left,c.proposed_revision.right);
  assert.ok(c.proposed_revision.response_options.includes("both"));
  assert.ok(c.proposed_revision.response_options.includes("neither"));
  assert.ok(c.proposed_revision.response_options.includes("not_applicable"));
 }
});
test("Concrete discriminating probes and stop conditions exist for every case",()=>{
 for(const c of study.cases){
  assert.ok(c.discriminating_question.length>25);
  assert.ok(c.stop_condition.length>25);
  assert.ok(c.research_focus.length>15);
  assert.equal(c.approved_to_score,false);
  assert.equal(c.research_only,true);
 }
 assert.equal(study.summary.new_scored_items,0);
 assert.equal(study.summary.real_participants,0);
});
test("Priority grouping agrees with earlier multi-lens family audit",()=>{
 for(const c of study.cases){
  const f=risk.family_decisions.find(x=>x.family_id===c.family_id);
  assert.ok(f,c.family_id);
  assert.equal(f.priority_for_cognitive_pretest,c.priority);
  assert.equal(f.reference_question_id,c.source_question_id);
 }
});
test("Recorded source blob digests match the unchanged archival files",()=>{
 for(const [path,sha] of Object.entries(study.sources))assert.equal(sha,gitBlob(path),path);
});
test("Master has all ten new revisions and their exact historical comparators",()=>{
 for(const c of study.cases){
  assert.ok(master.includes("### "+c.case_id+"｜"),c.case_id+" heading");
  assert.ok(master.includes(c.source_original.stem),c.case_id+" original");
  assert.ok(master.includes(c.proposed_revision.stem),c.case_id+" revision");
  assert.ok(master.includes(c.existing_comparator.text.stem),c.case_id+" comparator");
  assert.ok(master.includes(c.discriminating_question),c.case_id+" research gate");
  assert.ok(master.includes(c.stop_condition),c.case_id+" stop gate");
  if(c.proposed_revision.independent_rating_statements){
   for(const p of c.proposed_revision.independent_rating_statements)assert.ok(master.includes(p.label),p.id);
  }else{
   assert.ok(master.includes(c.proposed_revision.left));
   assert.ok(master.includes(c.proposed_revision.right));
  }
 }
});
test("Master retains all ten historical sections plus explicit appended review",()=>{
 for(let i=1;i<=10;i++)assert.ok(master.includes("## I-"+i+"．"),"I-"+i);
 for(let i=1;i<=8;i++)assert.ok(master.includes("## II-"+i+"．"),"II-"+i);
 assert.ok(master.includes("## I-11．D-197"));
 assert.ok(master.includes("## II-9．D-197"));
 assert.equal((master.match(/^### D197-P\d{2}｜/gm)||[]).length,10);
 assert.equal((master.match(/^\*\*D197-P\d{2}（/gm)||[]).length,10);
 assert.doesNotMatch(master,/undefined|\[object Object\]/);
});
test("No production scoring or approved survey question is changed",()=>{
 assert.equal(study.status,"EDITORIAL_RESEARCH_NOT_APPROVED");
 assert.equal(study.summary.new_scored_items,0);
 assert.ok(master.includes("正式な得点用50問では意味の完全重複不可"));
 assert.ok(master.includes("現時点で新版50問バンクの正式内容承認は0問"));
});
