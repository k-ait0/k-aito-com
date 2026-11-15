/**
 * A05 D243: midpoint-heavy axis guard and independent non-scoring Y/N probes.
 * Research-only. Does not change D227 or the public D242 preview.
 *
 * Seven-point "4" is VALID (zero intensity). null is a skipped answer.
 * If the FIRST seven axis items contain >=5 combined 4/null, offer a new
 * method to describe the values rather than guessing a signed 16-type axis.
 * A typed "UNSURE" is always available; responses are never coerced.
 */
import {readFileSync} from "node:fs";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {scoreResearchForm} from "./a05-d227-robust-intensity-scoring.mjs";
export const VERSION="A05-D243-MIDPOINT-YN-RESEARCH-1";
export const PROBES=JSON.parse(readFileSync(new URL("../research/a05/d243-midpoint-yn-probe-bank.json",import.meta.url),"utf8"));
const AXES=["A","B","C","D"];
const cfg=PROBES.policy;
const reasons=new Set(cfg.reasonOptions),ynOptions=new Set(cfg.ynOptions);
const axisById=new Map(PROBES.axes.map(x=>[x.axis,x]));
const byItemId=new Map(PROBES.axes.flatMap(x=>[...x.initial,...x.context].map(q=>[q.id,x.axis])));
const exact=(obj,ids)=>ids.length===Object.keys(obj).length&&ids.every(id=>Object.hasOwn(obj,id));
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const has=x=>Object.prototype.hasOwnProperty;
function ensureBank(){
 if(PROBES.schema!=="A05-D243-MIDPOINT-YN-PROBE-BANK-1")throw Error("Unrecognized Y/N bank");
 if(cfg.triggerCombinedMidpointOrSkippedAtLeast!==5||cfg.holdAxisIfDirectionalResponsesBelow!==4||
  cfg.maxIndependentYNPerSession!==8)throw Error("Unreviewed D243 policy drift");
 if(PROBES.axes.length!==4||AXES.some(a=>!axisById.has(a))||byItemId.size!==16)
  throw Error("Invalid Y/N probe bank structure");
 if(BANK.items.length!==50)throw Error("Bank size drift");
 for(const axis of PROBES.axes){
  if(axis.initial.length!==2||axis.context.length!==2)throw Error("Expected paired Y/N questions");
  if(axis.initial[0].pole!=="LEFT"||axis.initial[1].pole!=="RIGHT")
   throw Error("Expected separately valued left/right poles");
 }
}
ensureBank();
function validateBaseForm(manifest,answers){
 if(!manifest||manifest.mode!=="RESEARCH_ONLY"||![30,32,34].includes(manifest.questions?.length))
  throw Error("D243 needs an existing 30/32/34 research form");
 if(!plain(answers))throw Error("Missing answer bag");
 const ids=manifest.questions.map(q=>q.id);
 if(new Set(ids).size!==ids.length||!exact(answers,ids))throw Error("All presented answers must be explicit");
 for(const id of ids){
  const x=answers[id];
  if(!(x===null||(Number.isInteger(x)&&x>=1&&x<=7)))
   throw Error("7-point value or null required");
 }
 const core=scoreResearchForm(manifest,answers);
 return core;
}
function typeSigns(index){
 const g=Math.floor(index/4),w=index%4;
 return [g>=2?1:-1,g%2===1?1:-1,w>=2?1:-1,w%2===1?1:-1];
}
export function analyzeMidpointResearch(manifest,answers){
 const base=validateBaseForm(manifest,answers);
 const details=AXES.map((axis,i)=>{
  const all=manifest.questions.filter(q=>q.axis===axis);
  const original=all.slice(0,7);
  if(original.length!==7)throw Error("Expected 7 original questions per core axis");
  const midpoint=original.filter(q=>answers[q.id]===4).length;
  const skipped=original.filter(q=>answers[q.id]===null).length;
  const directionOnOriginal=7-midpoint-skipped;
  const directionalTotal=all.filter(q=>answers[q.id]!==null&&answers[q.id]!==4).length;
  const insufficientDirection=directionalTotal<cfg.holdAxisIfDirectionalResponsesBelow;
  const status=insufficientDirection?"FEW_DIRECTIONAL":base.axes[i].status;
  return {
   axis,initialPresented:7,currentPresented:all.length,
   midpointOnInitial:midpoint,skippedOnInitial:skipped,
   combinedOnInitial:midpoint+skipped,directionalOnInitial:directionOnOriginal,
   directionalCurrent:directionalTotal,numberOfAnswered:base.axes[i].valid,
   underlyingStatus:base.axes[i].status,status,
   direction:base.axes[i].sign,
   resolved:status==="DIRECTIONAL",
   independentYNRecommended:midpoint+skipped>=cfg.triggerCombinedMidpointOrSkippedAtLeast&&status!=="DIRECTIONAL",
   note:midpoint>0?"The midpoint is meaningful data, not an unanswered response.":"The absence of midpoint choices is not proof of a definite preference."
  };
 });
 const possibleTypes=[];
 for(let i=0;i<16;i++){
  const signs=typeSigns(i);
  if(details.every((a,j)=>!a.resolved||a.direction===signs[j]))
   possibleTypes.push("T"+String(i+1).padStart(2,"0"));
 }
 return {
  schema:VERSION,mode:"RESEARCH_ONLY",classificationApproved:false,
  scoringPower:1.5,nonScoringProbeEffect:"NONE",
  axes:details,possibleTypes,numberOfCandidateTypes:possibleTypes.length,
  resultKind:possibleTypes.length===1?"SINGLE_PROVISIONAL":possibleTypes.length<=4?"NEAR_TYPES":"WITHHELD",
  rationale:"4 and skipped are separate; fewer than 4 non-midpoint answers cannot establish an axis in this research guard. No Y/N adds a signed score."
 };
}
function validateState(state,eligible){
 if(!plain(state)||!exact(state,["responses","reasons"])||
    !plain(state.responses)||!plain(state.reasons))throw Error("Invalid probe state");
 const allowed=new Set(eligible.map(x=>x.axis));
 const entries=Object.entries(state.responses);
 if(entries.length>cfg.maxIndependentYNPerSession)throw Error("Y/N total exceeded");
 for(const [id,val] of entries){
  const axis=byItemId.get(id);
  if(!axis||!allowed.has(axis)||!ynOptions.has(val))throw Error("Unknown/out of scope Y/N answer");
  const questions=axisById.get(axis);
  if(questions.context.some(q=>q.id===id)&&
    !questions.initial.every(q=>Object.hasOwn(state.responses,q.id)))
   throw Error("Cannot answer context questions without both independent poles");
 }
 for(const [axis,value] of Object.entries(state.reasons)){
  if(!allowed.has(axis)||!reasons.has(value))throw Error("Unknown/out of scope midpoint reason");
 }
 return state;
}
export function emptyYNState(){return {responses:{},reasons:{}};}
function poleInterpretation(axis,state){
 const q=axisById.get(axis).initial;
 const a=state.responses[q[0].id],b=state.responses[q[1].id];
 if(a===undefined&&b===undefined)return "NOT_ASKED";
 if(a===undefined||b===undefined||a==="UNSURE"||b==="UNSURE")return "UNRESOLVED";
 if(a==="YES"&&b==="YES")return "BOTH_AFFIRMED";
 if(a==="NO"&&b==="NO")return "NEITHER_AFFIRMED";
 if(a==="YES"&&b==="NO")return "LEFT_ONLY";
 if(a==="NO"&&b==="YES")return "RIGHT_ONLY";
 return "UNRESOLVED";
}
export function summarizeYN(manifest,answers,state=emptyYNState()){
 const analysis=analyzeMidpointResearch(manifest,answers);
 const eligible=analysis.axes.filter(x=>x.independentYNRecommended);
 validateState(state,eligible);
 return {
  schema:VERSION,mode:"RESEARCH_ONLY",scoreEffect:"NONE",
  possibleTypes:analysis.possibleTypes,numberOfCandidateTypes:analysis.numberOfCandidateTypes,
  completedYN:Object.keys(state.responses).length,
  axisInterpretations:eligible.map(a=>({
   axis:a.axis,midpoint:a.midpointOnInitial,skipped:a.skippedOnInitial,
   interpretation:poleInterpretation(a.axis,state),
   reason:state.reasons[a.axis]??"NOT_PROVIDED",
   contributesToType:false
  })),
  caution:"Independent YES/NO values describe dimensions; they NEVER directly resolve an ambiguous 16-type axis."
 };
}
/**
 * Return up to two new, independent-pole YES/NO questions at a time, to
 * a maximum of eight Y/N questions per WHOLE session (not per axis).
 * A second contextual pair is offered only for declared context dependence
 * or an UNSURE answer. If 3-4 axes trigger, initial questions take priority.
 */
export function nextYNBatch(manifest,answers,state=emptyYNState()){
 const analysis=analyzeMidpointResearch(manifest,answers);
 const eligible=analysis.axes.filter(x=>x.independentYNRecommended).sort((a,b)=>
   b.combinedOnInitial-a.combinedOnInitial||b.skippedOnInitial-a.skippedOnInitial||
   a.axis.localeCompare(b.axis));
 validateState(state,eligible);
 const used=Object.keys(state.responses).length;
 if(used>=cfg.maxIndependentYNPerSession)return {
  schema:VERSION,kind:"NONE",reason:"GLOBAL_8_QUESTION_CAP",askedYN:used,scoreEffect:"NONE"
 };
 // Every eligible axis receives its two independent pole questions before
 // a second pair is offered for any one axis.
 for(const axis of eligible){
  const prompts=axisById.get(axis.axis).initial.filter(q=>!Object.hasOwn(state.responses,q.id));
  if(prompts.length) return {
   schema:VERSION,kind:"OFFER_YN",stage:"INDEPENDENT_POLES",
   axis:axis.axis,questions:prompts.slice(0,Math.min(2,cfg.maxIndependentYNPerSession-used)),
   reasonPrompt:PROBES.reasonPrompt,reasonOptions:cfg.reasonOptions,
   remainingCapacity:cfg.maxIndependentYNPerSession-used,
   scoreEffect:"NONE",optional:true,canStop:true
  };
 }
 for(const axis of eligible){
  const q=axisById.get(axis.axis);
  const needsContext=q.initial.some(item=>state.responses[item.id]==="UNSURE")||
   ["CONTEXT_DEPENDENT","WORDING_DIFFICULT"].includes(state.reasons[axis.axis]);
  if(!needsContext)continue;
  const prompts=q.context.filter(item=>!Object.hasOwn(state.responses,item.id));
  if(prompts.length)return {
   schema:VERSION,kind:"OFFER_YN",stage:"OPTIONAL_CONTEXT",
   axis:axis.axis,questions:prompts.slice(0,Math.min(2,cfg.maxIndependentYNPerSession-used)),
   reasonPrompt:null,reasonOptions:[],remainingCapacity:cfg.maxIndependentYNPerSession-used,
   scoreEffect:"NONE",optional:true,canStop:true
  };
 }
 return {schema:VERSION,kind:"NONE",reason:eligible.length?
  "NO_FURTHER_INFORMATIVE_PROBES":"NO_HEAVY_MIDPOINT_AXIS",
  askedYN:used,scoreEffect:"NONE"};
}
