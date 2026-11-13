import test from "node:test";
import assert from "node:assert/strict";
import {BANK,validateBank,drawResearchManifest,verifyResearchManifest,validateResearchAnswers,makeResearchCheckpoint,restoreResearchCheckpoint,previewCompletion} from "./a05-d208-research-sampler.mjs";
import {validateQuestions,resolveAxis} from "../projects/kidp/life-design-lab/a05/engine.mjs";
const AXES=["A","B","C","D","E"];
const targets={A:7,B:7,C:7,D:7,E:2};
const pool={A:12,B:12,C:12,D:12,E:2};
const copy=x=>JSON.parse(JSON.stringify(x));
const none=p=>Object.fromEntries(p.questions.map(x=>[x.id,null]));

test("50 item bank guard and adversarial mutations",()=>{
 assert.equal(validateBank(),true);
 const mutations=[
  b=>b.items.pop(),
  b=>b.items[2].bank_id=b.items[1].bank_id,
  b=>b.items[1].slot=300,
  b=>b.items[1].axis="E",
  b=>b.items[0].stem="",
  b=>b.items[0].left=b.items[0].right,
  b=>b.items[0].left="",
  b=>b.items[0].selected_source_id="",
  b=>b.items[0].decision_reason="",
  b=>b.items[0].production_scoring_approved=true,
  b=>b.items[0].user_formally_approved=true,
  b=>b.items[12].proposed_semantic_family="INVALID_FAMILY",
  b=>b.items[30].proposed_semantic_family="C_OPPORTUNITY_TIMING"
 ];
 for(const mutate of mutations){const x=copy(BANK);mutate(x);assert.throws(()=>validateBank(x));}
});
test("seed input guard and Unicode determinism",()=>{
 for(const invalid of [null,1,false,{},[], "","x".repeat(129)])assert.throws(()=>drawResearchManifest(invalid));
 for(const seed of ["0","1","abc","🔬診断-試験-🌓","a\nb","x".repeat(128)]){
  const a=drawResearchManifest(seed),b=drawResearchManifest(seed);
  assert.deepEqual(a,b);assert.equal(verifyResearchManifest(a),true);
 }
});
test("mass 200,000 manifests: quotas, no adjacent same-axis, pair integrity and fair inclusion",()=>{
 const N=200000, frequency=Object.fromEntries(BANK.items.map(x=>[x.bank_id,0]));
 const first=new Set(),last=new Set(),familyCoverage={A:100,B:100,C:100,D:100};
 const patterns=new Set();let paired=0;
 for(let i=0;i<N;i++){
  const m=drawResearchManifest("mass-"+i);
  const q=m.questions,ids=new Set(q.map(x=>x.id));
  assert.equal(q.length,30);assert.equal(ids.size,30);
  assert.equal(q[0].position,1);assert.equal(q[29].position,30);
  first.add(q[0].axis);last.add(q[29].axis);
  for(let j=1;j<q.length;j++){
   assert.equal(q[j].position,j+1);
   assert.notEqual(q[j-1].axis,q[j].axis,"same-axis adjacency");
  }
  for(const axis of AXES){
   const group=q.filter(x=>x.axis===axis);
   assert.equal(group.length,targets[axis]);
   if(axis!=="E"){
    const f={};for(const x of group)f[x.provisionalFamily]=(f[x.provisionalFamily]||0)+1;
    assert.ok(Object.values(f).every(n=>n<=2));
    if(axis==="B")assert.equal(Object.keys(f).length,6);
    familyCoverage[axis]=Math.min(familyCoverage[axis],Object.keys(f).length);
   }
  }
  const n=q.filter(x=>x.provisionalFamily==="C_OPPORTUNITY_TIMING").length;
  assert.ok(n===0||n===2);
  if(n===2)paired++;
  assert.equal(m.classification,null);assert.equal(m.productionEligible,false);
  for(const x of q)frequency[x.id]++;
  if(i<10000)patterns.add(q.map(x=>x.id).join(","));
 }
 assert.deepEqual([...first].sort(),AXES);
 assert.deepEqual([...last].sort(),AXES);
 assert.ok(patterns.size>=9900,"sampling has poor diversity");
 assert.ok(paired/N>0.56&&paired/N<0.61,"C paired exposure unreasonable");
 for(const x of BANK.items){
  const p=frequency[x.bank_id]/N;
  assert.ok(Math.abs(p-targets[x.axis]/pool[x.axis])<0.01,x.bank_id+" "+p);
 }
 for(const a of ["A","C","D"])assert.ok(familyCoverage[a]>=5,a);
});
test("50,000 response and checkpoint scenarios: complete, partial, skipped and resume",()=>{
 const value=[1,2,3,4,5,6,7,null];
 for(let i=0;i<50000;i++){
  const manifest=drawResearchManifest("cp-"+i),answers={};
  const length=i%31;
  for(let j=0;j<length;j++)answers[manifest.questions[j].id]=value[(i+j)%value.length];
  assert.equal(validateResearchAnswers(manifest,answers),true);
  const checkpoint=makeResearchCheckpoint(manifest,answers);
  assert.deepEqual(restoreResearchCheckpoint(copy(checkpoint)),checkpoint);
  assert.equal(checkpoint.nextPosition,length===30?31:length+1);
  const preview=previewCompletion(manifest,answers);
  assert.equal(preview.typeId,null);assert.equal(preview.classification,null);
  assert.equal(Object.values(preview.axes).reduce((n,x)=>n+x.answered+x.skipped,0),length);
  assert.equal(Object.values(preview.axes).reduce((n,x)=>n+x.unanswered,0),30-length);
 }
});
test("invalid answer types/IDs and checkpoint corruptions are rejected",()=>{
 const manifest=drawResearchManifest("invalid-answers");
 const id=manifest.questions[0].id;
 const invalid=[-1,0,8,1.5,NaN,Infinity,-Infinity,"7",true,{},[],undefined];
 for(const x of invalid)assert.throws(()=>validateResearchAnswers(manifest,{[id]:x}));
 for(const answers of [null,[],{Z99:4},JSON.parse('{"__proto__":{"polluted":true}}')])
  assert.throws(()=>validateResearchAnswers(manifest,answers));
 const cp=makeResearchCheckpoint(manifest,{[id]:4});
 for(const mutate of [
  x=>x.answers[id]=7,
  x=>x.nextPosition=30,
  x=>x.checksum="a".repeat(64),
  x=>x.manifest.questions[0].left="tampered",
  x=>x.manifest.seed="wrong",
  x=>x.mode="PRODUCTION"
 ]){const x=copy(cp);mutate(x);assert.throws(()=>restoreResearchCheckpoint(x));}
 assert.equal(verifyResearchManifest(manifest),true);
 for(const mutate of [x=>x.questions.pop(),x=>x.questions[0].id="BAD",x=>x.checksum="0".repeat(64)]){
  const x=copy(manifest);mutate(x);assert.throws(()=>verifyResearchManifest(x));
 }
});
test("current production scoring engine must NOT accept the new 7/7/7/7/2 bank",()=>{
 const manifest=drawResearchManifest("compatibility");
 assert.throws(()=>validateQuestions(manifest.questions.map(x=>({id:x.id,axis:x.axis,direction:1,left:x.left,right:x.right}))));
 assert.throws(()=>resolveAxis(7,7),"current per-axis maximum remains six");
 assert.equal(resolveAxis(2,6).status,"withheld","two E answers cannot produce current-engine axis classification");
});
// No live browser tests or real human responses in this suite.
