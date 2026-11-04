/**
 * A05 P3 editorial candidate contract. Node.js 22 local-only:
 * node --test scripts/test-a05-p3-overlay-20261104.mjs
 * Do not run GitHub Actions. Machine QA is NOT a human copy review.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  master: 'docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json',
  v05: 'docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json',
  v06: 'docs/A05_S4_V06_HIGH_REPEAT8_INDIVIDUAL_REWRITE_PILOT_20261030.json',
  pilot: 'docs/A05_P3_S4_PILOT16_INDEPENDENT_COPY_CANDIDATES_20261104.json',
  next: 'docs/A05_P3_S4_HIGH_REPEAT_NEXT8_EDITORIAL_CANDIDATES_20261104.json',
});
const content = Object.fromEntries(Object.entries(paths).map(([k,p]) => [k, readFileSync(new URL(p, root), 'utf8')]));
const data = Object.fromEntries(Object.entries(content).map(([k,v]) => [k,JSON.parse(v)]));
const sha = str => createHash('sha1').update('blob ' + Buffer.byteLength(str) + '\0' + str).digest('hex');
const map = a => new Map(a.map(x => [x.pairId,x]));

test('source file snapshots remain unchanged', () => {
 assert.equal(sha(content.master), '50e1ff7b1cc7fcae27c13b81fd33be46f8ff64a3');
 assert.equal(sha(content.v05), 'b21dd54ec11d4220ce93d603d43ee6c625d56d0a');
 assert.equal(sha(content.v06), '8ff9e770ef4d5e286a38e98fca0c428e8d7d0884');
 assert.equal(data.master.rows.length,136);
 assert.equal(data.v05.proposals.length,112);
 assert.equal(data.v06.rows.length,8);
});

test('pilot edits are 16 independent drafts, no human approval', () => {
 const actual = data.pilot.rows, base = map(data.master.rows);
 assert.equal(actual.length,16);
 assert.equal(new Set(actual.map(x=>x.pairId)).size,16);
 const groups = new Map;
 for (const item of actual) {
  const original = base.get(item.pairId);
  assert.ok(original,item.pairId);
  assert.equal(item.sourceOriginalDescription,original.draftDescription);
  assert.deepEqual(item.sharedAxes,original.sharedAxes);
  assert.deepEqual(item.differentAxes,original.differentAxes);
  assert.notEqual(item.proposedDescription, original.draftDescription);
  assert.equal(item.proposedConversationQuestions.length,3);
  assert.equal(item.publish,false);
  assert.equal(item.ownerApproval,false);
  assert.equal(item.firstHumanReview.reviewerId,null);
  assert.equal(item.secondIndependentReview.reviewerId,null);
  groups.set(item.priority,(groups.get(item.priority)||0)+1);
 }
 assert.deepEqual([...groups.values()].sort(),[4,4,4,4]);
 assert.equal(new Set(actual.flatMap(x=>x.proposedConversationQuestions)).size,48);
});

test('next eight rewrite only high-repeat unrevised v0.5 rows', () => {
 const old=map(data.v05.proposals), existing=new Set(data.v06.rows.map(x=>x.pairId));
 assert.equal(data.next.rows.length,8);
 assert.equal(new Set(data.next.rows.map(x=>x.pairId)).size,8);
 for(const item of data.next.rows){
  assert.ok(old.has(item.pairId));
  assert.ok(!existing.has(item.pairId));
  assert.ok(!data.pilot.rows.some(x=>x.pairId===item.pairId));
  assert.equal(item.previousV05Description,old.get(item.pairId).candidateDescription);
  assert.deepEqual(item.sharedAxes,old.get(item.pairId).sharedAxes);
  assert.deepEqual(item.differentAxes,old.get(item.pairId).differentAxes);
  assert.ok(item.previousRepeatFraction>=0.5);
  assert.notEqual(item.proposedDescription,item.previousV05Description);
  assert.equal(item.proposedQuestions.length,3);
  assert.equal(item.publish,false);
  assert.equal(item.firstHumanReviewer,null);
  assert.equal(item.independentHumanReviewer,null);
 }
});

function repeatedDescriptions(descByPair) {
 const rows=[...descByPair].map(([pairId,text])=>({pairId,text:text.replace(/\s+/g,'')}));
 const freq=new Map;
 for(const {text} of rows){
  const grams=new Set;
  for(let i=0;i<=text.length-14;i++) grams.add(text.slice(i,i+14));
  for(const g of grams)freq.set(g,(freq.get(g)||0)+1);
 }
 const fractions=new Map;
 for(const {pairId,text} of rows){
  const marked=new Uint8Array(text.length);
  for(let i=0;i<=text.length-14;i++) {
   if((freq.get(text.slice(i,i+14))||0)>=16)for(let j=i;j<i+14;j++)marked[j]=1;
  }
  fractions.set(pairId,Math.round(marked.reduce((s,v)=>s+v,0)/text.length*1000)/1000);
 }
 return {high:[...fractions.values()].filter(x=>x>=.5).length,fractions};
}
test('14-character repetition audit flags 104 -> 96 -> 88, not semantic approval',()=>{
 const base=new Map(data.v05.proposals.map(x=>[x.pairId,x.candidateDescription]));
 assert.equal(repeatedDescriptions(base).high,104);
 const withOld=new Map(base);
 for(const x of data.v06.rows)withOld.set(x.pairId,x.proposedV06Description);
 assert.equal(repeatedDescriptions(withOld).high,96);
 const withNew=new Map(withOld);
 for(const x of data.next.rows)withNew.set(x.pairId,x.proposedDescription);
 const result=repeatedDescriptions(withNew);
 assert.equal(result.high,88);
 for(const x of data.next.rows)assert.ok(result.fractions.get(x.pairId)<.5);
 assert.equal(data.pilot.counts.humanFirstApproved,0);
 assert.equal(data.pilot.counts.humanSecondApproved,0);
 assert.equal(data.next.counts.humanApproved,0);
});
