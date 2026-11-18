/**
 * A05 D226 | Compare answer-intensity exponents p=1, p=1.5 (A), p=2 (B).
 * Synthetic, reproducible form-level stress test. NOT human validation.
 * Change neither source questions nor GitHub Pages.
 *
 * Same synthetic full-bank answer per "person" is evaluated using identical
 * D208/D224 manifests under all three score transforms. No cross-form
 * invariance or psychometric truth is assumed.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";

export const VERSION="A05-D226-ANSWER-INTENSITY-RESEARCH-1";
export const POWERS=[1,1.5,2];
const AXES=["A","B","C","D"];
const itemsByAxis=AXES.map(a=>BANK.items.filter(q=>q.axis===a));
assert.ok(itemsByAxis.every(x=>x.length===12));
const models=[
 {id:"D208_existing",draw:drawResearchManifest},
 {id:"D224_hold_filtered",draw:drawResearchHoldFilteredManifest}
];
const scenarios=[
 {id:"coherent_strong",meaning:"All answers point to the same preference, most strongly"},
 {id:"moderate_majority",meaning:"Most items favor target weakly/moderately; minority disagrees weakly"},
 {id:"near_midpoint",meaning:"Balanced mild conflict with neutral responses"},
 {id:"sparse_correct_extremes",meaning:"Two strong true answers against eight mild opposing answers"},
 {id:"single_false_extreme",meaning:"One opposite extreme against ten mild true answers"},
 {id:"double_false_extreme",meaning:"Two opposite extremes against ten mild true answers"},
 {id:"semantic_family_conflict",meaning:"One full semantic family answers opposite; remainder tends target"},
 {id:"matched_extreme_conflict",meaning:"One extreme for and one extreme against, with mild conflict"}
];
function h(str){let x=2166136261>>>0;for(let i=0;i<str.length;i++)x=Math.imul(x^str.charCodeAt(i),16777619)>>>0;return x>>>0;}
const rounded=(x,n=5)=>Number(x.toFixed(n));
export function scoreResponse(answer,power=1){
 if(!POWERS.includes(power))throw Error("Unknown exponent");
 if(!Number.isInteger(answer)||answer<1||answer>7)throw Error("Answer outside 1..7");
 const diff=answer-4;
 return diff===0?0:Math.sign(diff)*Math.pow(Math.abs(diff)/3,power);
}
function expectedSigns(type){
 const group=Math.floor(type/4),within=type%4;
 return [group>=2?1:-1,group%2===1?1:-1,within>=2?1:-1,within%2===1?1:-1];
}
function buildAnswers(type,rep,scenario){
 const signs=expectedSigns(type);
 const bag={};
 for(let a=0;a<4;a++){
  const axis=AXES[a],target=signs[a];
  const ordered=itemsByAxis[a].slice().sort((x,y)=>
   h("D226|"+type+"|"+rep+"|"+scenario+"|"+x.bank_id)-
   h("D226|"+type+"|"+rep+"|"+scenario+"|"+y.bank_id));
  const families=[...new Set(ordered.map(q=>q.proposed_semantic_family))].sort();
  const conflictFamily=families[h("family|"+axis+"|"+type+"|"+rep)%families.length];
  for(let k=0;k<12;k++){
   const q=ordered[k];let signed=0;
   switch(scenario){
    case "coherent_strong": signed=target*(k%3===0?3:2);break;
    case "moderate_majority": signed=k<9?target*(k%4===0?2:1):-target;break;
    case "near_midpoint": signed=k<4?target:k<8?-target:0;break;
    case "sparse_correct_extremes": signed=k<2?target*3:k<10?-target:0;break;
    case "single_false_extreme": signed=k===0?-target*3:k===11?0:target;break;
    case "double_false_extreme": signed=k<2?-target*3:target;break;
    case "semantic_family_conflict": signed=q.proposed_semantic_family===conflictFamily?-target*3:target*(k%5===0?2:1);break;
    case "matched_extreme_conflict": signed=k===0?target*3:k===1?-target*3:k<7?target:k<12?-target:0;break;
    default:throw Error("Unknown scenario "+scenario);
   }
   bag[q.bank_id]=4+signed;
  }
 }
 for(const q of BANK.items.filter(q=>q.axis==="E"))bag[q.bank_id]=4;
 return bag;
}
function evaluateProfile(idsByAxis,answers,p){
 const axes=idsByAxis.map(ids=>{
  const total=ids.reduce((s,id)=>s+scoreResponse(answers[id],p),0);
  const avg=total/ids.length;
  return {avg,sign:Math.abs(avg)<1e-10?0:Math.sign(avg),
   // Fixed, exploratory 1/3 normalized score threshold from D222.
   clear:Math.abs(avg)>1/3+1e-12,
   matchedClear:Math.abs(avg)>Math.pow(1/3,p)+1e-12};
 });
 const strict=axes.some(x=>x.sign===0)?null:
  ((axes[0].sign>0?2:0)+(axes[1].sign>0?1:0))*4+
  ((axes[2].sign>0?2:0)+(axes[3].sign>0?1:0));
 const nUnknown=axes.filter(x=>!x.clear).length;
 const matchedUnknown=axes.filter(x=>!x.matchedClear).length;
 return {axes,strict,ambiguous:nUnknown>0,candidates:2**nUnknown,
  matchedAmbiguous:matchedUnknown>0,matchedCandidates:2**matchedUnknown};
}
function summarize(perPerson,checks,profiles,forms){
 const total=checks.formCount;
 return {
  synthetic_people:profiles,
  form_sets_per_person:forms,
  scored_form_count:total,
  axis_direction_wrong_fraction:rounded(checks.wrongAxis/checks.axisCount),
  strict_type_wrong_fraction:rounded(checks.strictWrong/total),
  strict_type_abstained_fraction:rounded(checks.strictAbstained/total),
  strict_type_wrong_given_classified_fraction:total-checks.strictAbstained
   ?rounded(checks.strictWrong/(total-checks.strictAbstained)):null,
  matched_boundary_form_fraction:rounded(checks.matchedBorderline/total),
  matched_boundary_mean_candidate_types:rounded(checks.matchedCandidateTotal/total),
  matched_boundary_reference_covered_fraction:rounded(checks.matchedCovered/total),
  all_forms_same_strict_type_fraction:rounded(checks.allFormsStable/profiles),
  people_with_multiple_strict_types_fraction:rounded(checks.multipleStrictTypes/profiles),
  borderline_form_fraction:rounded(checks.borderline/total),
  mean_candidate_types:rounded(checks.candidateTotal/total),
  latent_type_in_candidates_fraction:rounded(checks.candidateCovered/total),
  "scope":"Synthetic-only, generated latent preferences are stipulated inputs, not actual truth or calibration."
 };
}
export function compareExponents({forms=128,repeats=8}={}){
 assert.ok(Number.isInteger(forms)&&forms>=8&&forms<=512);
 assert.ok(Number.isInteger(repeats)&&repeats>=1&&repeats<=32);
 const prepared=models.map(m=>{
  const manifests=Array.from({length:forms},(_,i)=>m.draw("D226-form-"+String(i).padStart(4,"0")));
  return {id:m.id,manifests:manifests.map(manifest=>AXES.map(axis=>
   manifest.questions.filter(q=>q.axis===axis).map(q=>q.id)))};
 });
 const result=[];
 for(const model of prepared){
  for(const scenario of scenarios){
   const totals=Object.fromEntries(POWERS.map(p=>[p,{
    formCount:0,axisCount:0,wrongAxis:0,strictWrong:0,strictAbstained:0,allFormsStable:0,
    multipleStrictTypes:0,borderline:0,candidateTotal:0,candidateCovered:0,
    matchedBorderline:0,matchedCandidateTotal:0,matchedCovered:0}]));
   for(let type=0;type<16;type++){
    const expected=expectedSigns(type);
    for(let rep=0;rep<repeats;rep++){
     const answers=buildAnswers(type,rep,scenario.id);
     const seen=Object.fromEntries(POWERS.map(p=>[p,new Set()]));
     const strictlyAll=Object.fromEntries(POWERS.map(p=>[p,true]));
     for(const manifest of model.manifests){
      for(const p of POWERS){
       const v=evaluateProfile(manifest,answers,p);
       const t=totals[p];t.formCount++;
       t.axisCount+=4;
       for(let i=0;i<4;i++)if(v.axes[i].sign!==expected[i])t.wrongAxis++;
       if(v.strict===null){t.strictAbstained++;strictlyAll[p]=false;}
       else{
        seen[p].add(v.strict);
        if(v.strict!==type)t.strictWrong++;
       }
       if(v.ambiguous)t.borderline++;
       t.candidateTotal+=v.candidates;
       if(v.axes.every((a,i)=>!a.clear||a.sign===expected[i]))t.candidateCovered++;
       if(v.matchedAmbiguous)t.matchedBorderline++;
       t.matchedCandidateTotal+=v.matchedCandidates;
       if(v.axes.every((a,i)=>!a.matchedClear||a.sign===expected[i]))t.matchedCovered++;
      }
     }
     for(const p of POWERS){
      if(strictlyAll[p]&&seen[p].size===1)totals[p].allFormsStable++;
      if(seen[p].size>1)totals[p].multipleStrictTypes++;
     }
    }
   }
   const profiles=16*repeats;
   result.push({
    sampler:model.id,scenario:scenario.id,meaning:scenario.meaning,
    methods:{
     linear:summarize(null,totals[1],profiles,forms),
     A_p1_5:summarize(null,totals[1.5],profiles,forms),
     B_p2:summarize(null,totals[2],profiles,forms)
    }
   });
  }
 }
 return {
  schema:VERSION,scenario_design:"pre-specified deterministic synthetic stress suite",
  input:{forms,repeats,types:16,perScenarioPeople:16*repeats,scenarios:scenarios.map(x=>x.id),
   samplers:models.map(x=>x.id),powers:POWERS},
  score_formula:"sign(answer-4)*(abs(answer-4)/3)^p; mean per axis (range -1..1)",
  boundary:"Two sensitivity checks: (a) old fixed abs(axis_mean)>1/3; (b) power-matched abs(axis_mean)>(1/3)^p, mapping an all-5 response to threshold. Neither is calibrated.",
  result,
  decision_guardrails:[
   "Compare A and B on the same synthetic respondents and 30-item forms, with linear reference.",
   "Prefer B only if its gains in sparse true conviction are material without unacceptable vulnerability to single/double opposite extreme responses.",
   "Do not optimize by averaging scenario results into an unvalidated accuracy score.",
   "Do not treat generated latent type as real respondent ground truth, and do not modify published scoring without real responses."
  ],
  caveat:"The design of each artificial scenario predetermines what counts as signal/outlier. Results demonstrate mathematical tradeoffs, not psychometric validity or expected population accuracy."
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=compareExponents();
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const out=resolve(root,"research/a05/generated/d226-answer-intensity-comparison.json");
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify(report,null,2)+"\n");
 console.log("D226_FULL_REPORT "+out);
 for(const row of report.result){
  const mini=Object.fromEntries(Object.entries(row.methods).map(([method,s])=>[method,{
   wrong_axis:s.axis_direction_wrong_fraction,
   wrong_type:s.strict_type_wrong_fraction,
   multi_type:s.people_with_multiple_strict_types_fraction,
   borderline:s.borderline_form_fraction,
   avg_candidates:s.mean_candidate_types,
   matched_boundary_fraction:s.matched_boundary_form_fraction,
   matched_candidates:s.matched_boundary_mean_candidate_types,
   matched_reference_covered:s.matched_boundary_reference_covered_fraction
  }]));
  console.log("D226_ROW "+JSON.stringify({sampler:row.sampler,scenario:row.scenario,metrics:mini}));
 }
}
