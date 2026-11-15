/**
 * A05 D244: reproducible high-volume research-only D243 protocol stress.
 * Neither creates actual human data nor changes public D242 scoring.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {analyzeMidpointResearch,emptyYNState,nextYNBatch,summarizeYN} from "./a05-d243-midpoint-yn-research.mjs";
const N=12800,AXES=["A","B","C","D"];
const forms=Array.from({length:128},(_,i)=>drawResearchHoldFilteredManifest("D244-mass-"+String(i).padStart(3,"0")));
function prng(seed=20261116){
 let x=seed>>>0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};
}
const rand=prng();
function generate(form,kind){
 const answers=Object.fromEntries(form.questions.map(q=>[
  q.id,kind===0?7:kind===1?1:kind===2?4:kind===3?null:kind===7?
  (rand()%7+1):kind===8?(rand()%3===0?4:(rand()%7)+1):kind===9?
  (rand()%3===0?null:4):7
 ]));
 const set=(axis,mid,skip)=>{
  const q=form.questions.filter(x=>x.axis===axis).slice(0,7);
  for(let i=0;i<mid;i++)answers[q[i].id]=4;
  for(let i=mid;i<mid+skip;i++)answers[q[i].id]=null;
 };
 if(kind===4)set("B",5,0);
 if(kind===5)set("C",3,2);
 if(kind===6)for(const a of AXES)set(a,4,0);
 return answers;
}
export function stressMidpoint({cases=N}={}){
 assert.ok(Number.isInteger(cases)&&cases>=1&&cases<=N);
 const out={
  schema:"A05-D244-MIDPOINT-YN-SYNTHETIC-1",
  scope:"RESEARCH_ONLY_NO_HUMAN_PARTICIPANTS",
  inputFormVariants:128,syntheticFullFormCases:cases,
  axisChecks:0,heavyAxisTriggers:0,heldFewDirectional:0,
  nonScoringYNAnswered:0,independentYNOffers:0,optionalContextOffers:0,
  cappedSessions:0,unchangedTypeSets:0,stopsWithoutMoreProbes:0,
  zeroDirectionCases:0,
  casePatterns:["all_7","all_1","all_4","all_skip","B_five_4","C_three_4_two_skip",
   "all_axes_four_4","uniform_random_1_to_7","midpoint_random","mostly_mid_or_skip"],
  caveat:"Synthetic arithmetic/invariant stress only; no evidence that 1.5 power or Y/N is psychometrically valid."
 };
 for(let k=0;k<cases;k++){
  const form=forms[k%forms.length],answers=generate(form,k%10);
  const analysis=analyzeMidpointResearch(form,answers);
  out.axisChecks+=4;
  for(const a of analysis.axes){
   if(a.independentYNRecommended)out.heavyAxisTriggers++;
   if(a.status==="FEW_DIRECTIONAL")out.heldFewDirectional++;
   if(a.status==="DIRECTIONAL")assert.ok(a.directionalCurrent>=4);
   if(a.combinedOnInitial>=5){
    assert.ok(a.directionalOnInitial<=2);
    assert.ok(a.status!=="DIRECTIONAL"||a.directionalCurrent>=4);
   }
  }
  if(k%10===2||k%10===3){
   assert.equal(analysis.numberOfCandidateTypes,16);
   out.zeroDirectionCases++;
  }
  if(k%10===0)assert.deepEqual(analysis.possibleTypes,["T16"]);
  if(k%10===1)assert.deepEqual(analysis.possibleTypes,["T01"]);
  const state=emptyYNState();
  let loops=0;
  while(loops++<7){
   const offer=nextYNBatch(form,answers,state);
   if(offer.kind==="NONE"){
    out.stopsWithoutMoreProbes++;
    if(offer.reason==="GLOBAL_8_QUESTION_CAP")out.cappedSessions++;
    break;
   }
   assert.equal(offer.kind,"OFFER_YN");
   assert.ok(offer.questions.length>=1&&offer.questions.length<=2);
   assert.ok(offer.optional&&offer.canStop);
   assert.equal(offer.scoreEffect,"NONE");
   if(offer.stage==="INDEPENDENT_POLES"){
    out.independentYNOffers++;
    state.reasons[offer.axis]=k%2?"CONTEXT_DEPENDENT":"BOTH_STRONG";
   }else{
    assert.equal(offer.stage,"OPTIONAL_CONTEXT");
    out.optionalContextOffers++;
   }
   for(const question of offer.questions){
    const v=["YES","NO","UNSURE"][rand()%3];
    assert.ok(!Object.hasOwn(state.responses,question.id));
    state.responses[question.id]=v;
    out.nonScoringYNAnswered++;
   }
  }
  if(loops>=8)throw Error("Offer loop failed to finish");
  const outcome=summarizeYN(form,answers,state);
  assert.equal(outcome.numberOfCandidateTypes,analysis.numberOfCandidateTypes);
  assert.deepEqual(outcome.possibleTypes,analysis.possibleTypes);
  assert.ok(outcome.completedYN<=8);
  assert.ok(outcome.axisInterpretations.every(x=>x.contributesToType===false));
  out.unchangedTypeSets++;
 }
 out.passed=true;
 return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=stressMidpoint();
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const path=resolve(root,"research/a05/generated/d244-midpoint-yn-stress.json");
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(report,null,2)+"\n");
 console.log("D244_MIDPOINT_MASS_REPORT "+JSON.stringify(report));
}
