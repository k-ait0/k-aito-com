/**
 * A05 D228: large, deterministic stress/property suite for D227 research only.
 *
 * 823,543 exhaustive 7^7 answer vectors (signed-power arithmetic), plus
 * 250,000 full-form 30-item scenarios. No real respondents and no UI.
 * Exact counts/coverage/failures are written to a JSON CI artifact.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResponse} from "./a05-d226-answer-intensity-comparison.mjs";
import {scoreResearchForm,planResearchFollowUp,appendResearchFollowUp,WEAK_REFERENCE} from "./a05-d227-robust-intensity-scoring.mjs";
const MAX=250000, FORMS=512, AXES=["A","B","C","D"],BAD=new Set(["A05-V1-31","A05-V1-32","A05-V1-36"]);
const options=()=>Array.from({length:FORMS},(_,i)=>drawResearchHoldFilteredManifest("D228-MASS-"+String(i).padStart(4,"0")));
function randomizer(seed=0x51f15eed){
 let s=seed>>>0;
 return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0;};
}
function ensure(p,msg){if(!p)throw Error(msg)}
export function runStress({cases=MAX}={}){
 if(!Number.isInteger(cases)||cases<1||cases>MAX)throw Error("Invalid number of full cases");
 const forms=options(),rand=randomizer();
 const stats={schema:"A05-D228-LARGE-SYNTHETIC-TEST-1",
  status:"RESEARCH_ONLY_NOT_REAL_HUMAN_VALIDATION",forms:FORMS,
  exhaustive_seven_answer_vectors:0,complete_30_item_scenarios:cases,
  axis_score_calculations:0,followup_decisions:0,offers_accepted:0,
  resulting_32_item_forms:0,resulting_34_item_forms:0,
  held_item_violations:0,duplicate_item_violations:0,
  score_range_violations:0,type_count_violations:0,
  direction_invariant_violations:0,
  countsByKind:{SINGLE_PROVISIONAL:0,NEAR_TYPES:0,WITHHELD:0},
  axisStatuses:{INSUFFICIENT:0,TIE:0,WEAK:0,FRAGILE:0,DIRECTIONAL:0},
  safety:"Checks deterministic adversarial and pseudorandom inputs, not empirical population validity."};
 // Complete enumeration 7^7 = 823,543 patterns.
 for(let n=0;n<823543;n++){
  let k=n,total=0,mirror=0;
  for(let j=0;j<7;j++){
   const response=k%7+1;k=Math.floor(k/7);
   total+=scoreResponse(response,1.5);
   mirror+=scoreResponse(8-response,1.5);
  }
  ensure(Math.abs(total+mirror)<1e-10,"score mirror invariant");
  ensure(Math.abs(total)<=7+1e-10,"score outside max");
  stats.exhaustive_seven_answer_vectors++;
 }
 for(let i=0;i<cases;i++){
  const manifest=forms[i%forms.length],pattern=i%10,answers={};
  let position=0;
  for(const q of manifest.questions){
   const r=rand()%100;
   let v;
   switch(pattern){
    case 0:v=4;break;
    case 1:v=7;break;
    case 2:v=1;break;
    case 3:v=5;break;
    case 4:v=6;break;
    case 5:v=position%2?7:1;break;
    case 6:v=(rand()%7)+1;break;
    case 7:v=r<45?null:r<80?4:(rand()%7)+1;break;
    case 8:v=position%7===0?1:5;break;
    case 9:v=q.axis==="B"?4:q.axis==="E"?1:r<25?4:rand()%2?6:2;break;
    default:throw Error("Bad pattern");
   }
   answers[q.id]=v;position++;
  }
  const result=scoreResearchForm(manifest,answers);
  stats.countsByKind[result.resultKind]++;
  stats.axis_score_calculations+=4;
  ensure(result.axes.length===4,"Wrong axis count");
  ensure([1,2,4,8,16].includes(result.numberOfCandidateTypes),"Type count non-power-of-two");
  if(result.resultKind==="SINGLE_PROVISIONAL")ensure(result.numberOfCandidateTypes===1,"Invalid single");
  if(result.resultKind==="NEAR_TYPES")ensure([2,4].includes(result.numberOfCandidateTypes),"Invalid near");
  if(result.resultKind==="WITHHELD")ensure(result.numberOfCandidateTypes>=8,"Invalid withheld");
  for(const a of result.axes){
   stats.axisStatuses[a.status]++;
   ensure(Number.isFinite(a.mean)&&Math.abs(a.mean)<=1+1e-10,"Score out of range");
   ensure(a.presented>=7&&a.presented<=11&&a.valid>=0&&a.valid<=a.presented,"Axis count invalid");
   ensure(a.status!=="DIRECTIONAL"||a.valid>=5,"Directional without 5");
   ensure(a.status!=="DIRECTIONAL"||Math.abs(a.mean)>WEAK_REFERENCE,"Directional below threshold");
   ensure(a.status!=="DIRECTIONAL"||(a.itemFlipCount===0&&a.familyFlipCount===0),"Fragility ignored");
  }
  if(pattern===0)ensure(result.numberOfCandidateTypes===16,"All neutral must be ambiguous");
  if(pattern===1)ensure(result.possibleTypes.join()==="T16","All 7 must map T16");
  if(pattern===2)ensure(result.possibleTypes.join()==="T01","All 1 must map T01");
  // A-D results must be perfectly invariant to either value of auxiliary E.
  if(i%101===0){
   const alt={...answers};
   for(const q of manifest.questions)if(q.axis==="E")alt[q.id]=(alt[q.id]===7?1:7);
   const counterpart=scoreResearchForm(manifest,alt);
   ensure(JSON.stringify(counterpart.axes)===JSON.stringify(result.axes),"E contaminates core axes");
   ensure(counterpart.possibleTypes.join()===result.possibleTypes.join(),"E contaminates types");
  }
  if(i%2===0){
   const offer=planResearchFollowUp(manifest,answers);
   stats.followup_decisions++;
   if(offer.kind==="OFFER_2"){
    ensure(offer.questionIds.length===2&&new Set(offer.questionIds).size===2,"Duplicate proposed");
    const originalIds=new Set(manifest.questions.map(q=>q.id));
    ensure(offer.questionIds.every(id=>!originalIds.has(id)&&!BAD.has(id)),"Disallowed follow-up");
    const ext=appendResearchFollowUp(manifest,offer);
    ensure(ext.questions.length===32,"Bad extra length");
    stats.offers_accepted++;stats.resulting_32_item_forms++;
    for(const id of offer.questionIds)answers[id]=pattern===0?4:(rand()%7)+1;
    const res32=scoreResearchForm(ext,answers);
    stats.axis_score_calculations+=4;
    ensure([1,2,4,8,16].includes(res32.numberOfCandidateTypes),"Bad 32 candidate count");
    if(i%10===0){
     const again=planResearchFollowUp(ext,answers);
     stats.followup_decisions++;
     if(again.kind==="OFFER_2"){
      ensure(again.questionIds.every(id=>!ext.questions.some(q=>q.id===id)&&!BAD.has(id)),"Repeat/disallowed 34");
      const more=appendResearchFollowUp(ext,again);
      ensure(more.questions.length===34,"Bad second extra length");
      for(const id of again.questionIds)answers[id]=pattern===0?4:(rand()%7)+1;
      const res34=scoreResearchForm(more,answers);
      stats.axis_score_calculations+=4;
      ensure([1,2,4,8,16].includes(res34.numberOfCandidateTypes),"Bad 34 candidate count");
      ensure(planResearchFollowUp(more,answers).kind==="NONE","Exceeded 34 cap");
      stats.resulting_34_item_forms++;
     }
    }
   }
  }
 }
 stats.total_scored_form_evaluations=stats.axis_score_calculations/4;
 stats.total_property_case_count=stats.exhaustive_seven_answer_vectors+stats.complete_30_item_scenarios;
 return stats;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=runStress();
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const path=resolve(root,"research/a05/generated/d228-large-scoring-stress-report.json");
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(output,null,2)+"\n");
 console.log("D228_MASS_REPORT "+JSON.stringify(output));
}
