import test from "node:test";
import assert from "node:assert/strict";
import {scoreResponse,compareExponents,POWERS,VERSION} from "./a05-d226-answer-intensity-comparison.mjs";
test("D226 signed-power curves are symmetric, monotone and normalized",()=>{
 assert.deepEqual(POWERS,[1,1.5,2]);
 for(const p of POWERS){
  assert.equal(scoreResponse(4,p),0);
  assert.equal(scoreResponse(1,p),-1);
  assert.equal(scoreResponse(7,p),1);
  let prev=-Infinity;
  for(let x=1;x<=7;x++){
   const v=scoreResponse(x,p);
   assert.ok(v>=prev);
   prev=v;
   assert.ok(Math.abs(scoreResponse(8-x,p)+v)<1e-12);
  }
 }
 assert.ok(scoreResponse(6,2)<scoreResponse(6,1.5));
 assert.ok(scoreResponse(6,1.5)<scoreResponse(6,1));
 for(const x of [0,8,-1,2.1,null,"7",NaN])assert.throws(()=>scoreResponse(x,1.5));
 assert.throws(()=>scoreResponse(7,0.9));
});
test("D226 outlier trade-off: one opposite extreme can reverse B but not A",()=>{
 const scores=[7,5,5,5,5,5,5];
 const a=scores.reduce((sum,x)=>sum+scoreResponse(x,1.5),0);
 const b=scores.reduce((sum,x)=>sum+scoreResponse(x,2),0);
 assert.ok(a>0&&b>0);
 const wrong=[1,5,5,5,5,5,5];
 assert.ok(wrong.reduce((sum,x)=>sum+scoreResponse(x,1.5),0)>0);
 assert.ok(wrong.reduce((sum,x)=>sum+scoreResponse(x,2),0)<0);
});
test("D226 stress tests compare the same 30-question bundles and respondents across powers",()=>{
 const report=compareExponents({forms:12,repeats:2});
 const again=compareExponents({forms:12,repeats:2});
 assert.deepEqual(report,again);
 assert.equal(report.schema,VERSION);
 assert.equal(report.result.length,16);
 for(const row of report.result){
  assert.equal(row.methods.linear.scored_form_count,384);
  for(const method of Object.values(row.methods)){
   for(const key of ["axis_direction_wrong_fraction","strict_type_wrong_fraction",
    "strict_type_abstained_fraction","all_forms_same_strict_type_fraction",
    "people_with_multiple_strict_types_fraction","borderline_form_fraction",
    "latent_type_in_candidates_fraction"]){
    assert.ok(method[key]>=0&&method[key]<=1,key+" "+method[key]);
   }
   assert.ok(method.mean_candidate_types>=1&&method.mean_candidate_types<=16);
  }
 }
 const stable=report.result.filter(x=>x.scenario==="coherent_strong");
 for(const row of stable)for(const method of Object.values(row.methods)){
  assert.equal(method.axis_direction_wrong_fraction,0);
  assert.equal(method.strict_type_wrong_fraction,0);
  assert.equal(method.all_forms_same_strict_type_fraction,1);
 }
});
