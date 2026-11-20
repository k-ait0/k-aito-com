/**
 * A05 D269 | Server-side RESEARCH reference for 30-item score + D255 Y/N.
 * Pure Node module. Does not create HTTP listener, DB, telemetry or consent.
 * Reuses the independently versioned D227, D243, D255 research contracts.
 * This is NOT production scoring or a psychometrically validated assessment.
 */
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm} from "./a05-d227-robust-intensity-scoring.mjs";
import {analyzeMidpointResearch,PROBES} from "./a05-d243-midpoint-yn-research.mjs";
import {d255Analyze,d255NextBatch,D255_VERSION} from "./a05-d255-yn-provisional-classifier.mjs";
export const D269_VERSION="A05-D269-NODE-SERVER-RESEARCH-REFERENCE-1";
const core=["A","B","C","D"];
const mapStatus={
 FEW_DIRECTIONAL:"few_directional",INSUFFICIENT:"insufficient",TIE:"tie",
 WEAK:"borderline",FRAGILE:"fragile",DIRECTIONAL:"clear"
};
const expectedIds=Array.from({length:128},(_,index)=>
 drawResearchHoldFilteredManifest("D219-simple-"+String(index).padStart(3,"0")).questions.map(q=>q.id));
function assert(cond,msg){if(!cond)throw Error("D269 "+msg);}
function plain(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;}
export function d269ServerClassify({manifestIndex,values,skipKinds,ynState}){
 assert(Number.isInteger(manifestIndex)&&manifestIndex>=0&&manifestIndex<128,
  "unknown manifest index");
 assert(Array.isArray(values)&&values.length===30,"exactly 30 answers required");
 assert(Array.isArray(skipKinds)&&skipKinds.length===30,"exactly 30 skip reasons required");
 const ids=expectedIds[manifestIndex];
 const answers={};let unknown=0,notApplicable=0;
 for(let i=0;i<30;i++){
  const v=values[i],reason=skipKinds[i];
  assert(v===null||(Number.isInteger(v)&&v>=1&&v<=7),"invalid 7-point response");
  assert(v===null?["UNKNOWN","NOT_APPLICABLE"].includes(reason):reason===null,
   "skip reasons and valid 7-point answers cannot be conflated");
  answers[ids[i]]=v;
  if(v===null){if(reason==="UNKNOWN")unknown++;else notApplicable++;}
 }
 const s=ynState??{responses:{},reasons:{}};
 assert(plain(s)&&plain(s.responses)&&plain(s.reasons)&&
  Object.keys(s).length===2&&Object.hasOwn(s,"responses")&&Object.hasOwn(s,"reasons"),
  "Y/N state must have responses and reasons objects");
 const manifest=drawResearchHoldFilteredManifest("D219-simple-"+String(manifestIndex).padStart(3,"0"));
 assert(manifest.questions.every((q,i)=>q.id===ids[i]),"manifest version drift");
 const score=scoreResearchForm(manifest,answers);
 const midpoint=analyzeMidpointResearch(manifest,answers);
 const stats=score.axes.map((axis,i)=>{
  const m=midpoint.axes[i];
  assert(m.axis===axis.axis&&m.currentPresented===7,"source axis mismatch");
  const status=mapStatus[m.status];
  assert(status!==undefined,"unrecognized D227 status");
  return {
   axis:axis.axis,n:axis.valid,presented:axis.presented,total:axis.mean*axis.valid,
   ratio:axis.mean,sign:axis.sign,
   midpointOnInitial:m.midpointOnInitial,skippedOnInitial:m.skippedOnInitial,
   directionalCurrent:m.directionalCurrent,
   distinctFamilies:axis.distinctFamilies,itemFlipCount:axis.itemFlipCount,
   familyFlipCount:axis.familyFlipCount,status
  };
 });
 const candidates=midpoint.possibleTypes;
 const yn=d255Analyze(stats,s,PROBES);
 const next=d255NextBatch(stats,s,PROBES);
 assert(yn.schema===D255_VERSION,"Y/N classifier changed without acceptance");
 assert(yn.scoringApproved===false&&yn.validated===false,"unsupported validation claim");
 assert(score.possibleTypes.every(t=>/^T(0[1-9]|1[0-6])$/.test(t)),"bad type ID");
 assert(yn.candidateIds.every(t=>/^T(0[1-9]|1[0-6])$/.test(t)),"bad Y/N type ID");
 // The Y/N phase cannot mutate signed 30-item source evidence.
 const statsForNext=JSON.stringify(stats);
 d255NextBatch(stats,s,PROBES);
 assert(JSON.stringify(stats)===statsForNext,"D255 mutated baseline");
 return {
  version:D269_VERSION,classificationVersion:D255_VERSION,
  researchOnly:true,scoringPower:1.5,manifestIndex,ids:[...ids],
  answerTotals:{answered:30-unknown-notApplicable,unknown,notApplicable},
  stats,candidateIds:candidates,yn,next
 };
}
