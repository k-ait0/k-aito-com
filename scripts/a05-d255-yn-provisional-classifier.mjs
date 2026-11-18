/**
 * A05 D255: exploratory post-30 Y/N directional classification.
 * Deliberately does not rescore the 30-item seven-point engine.
 * YES/NO contrast pairs can NARROW a provisional candidate set.
 * NO PSYCHOMETRIC VALIDATION; not a production classifier.
 * Pure module: the D246 builder embeds exactly this source in its offline HTML.
 */
export const D255_VERSION="A05-D255-YN-PROVISIONAL-CLASSIFIER-1";
const D255_AXES=["A","B","C","D"];
const D255_ANSWERS=new Set(["YES","NO","UNSURE"]);
const D255_REASON_CODES=new Set(["BOTH_STRONG","BOTH_WEAK","CONTEXT_DEPENDENT","BALANCED_MODERATE","WORDING_DIFFICULT","OTHER","PREFER_NOT"]);
function d255SignPair(left,right){
 if(left==="YES"&&right==="NO")return -1;
 if(left==="NO"&&right==="YES")return 1;
 return 0;
}
function d255TypeSigns(index){
 const group=Math.floor(index/4),within=index%4;
 return [group>=2?1:-1,group%2===1?1:-1,within>=2?1:-1,within%2===1?1:-1];
}
export function d255Analyze(stats,state,probes){
 if(!Array.isArray(stats)||stats.length!==4||!probes||!Array.isArray(probes.axes)||probes.axes.length!==4)
  throw Error("D255 invalid axis/bank input");
 const responses=state?.responses,reasons=state?.reasons;
 if(!responses||!reasons||Array.isArray(responses)||Array.isArray(reasons)||typeof responses!=="object"||typeof reasons!=="object")
  throw Error("D255 invalid Y/N state");
 const itemOwner=new Map(probes.axes.flatMap(a=>[...a.initial,...a.context].map(q=>[q.id,a])));
 if(Object.keys(responses).length>8)throw Error("D255 exceeded 8 Y/N answers");
 for(const [id,value] of Object.entries(responses)){
  const owner=itemOwner.get(id);
  if(!owner||!D255_ANSWERS.has(value))throw Error("D255 unknown Y/N answer");
  if(owner.context.some(q=>q.id===id)&&!owner.initial.every(q=>Object.hasOwn(responses,q.id)))
   throw Error("D255 context without completed independent pair");
 }
 for(const [axis,reason] of Object.entries(reasons)){
  if(!D255_AXES.includes(axis)||!D255_REASON_CODES.has(reason))
   throw Error("D255 unknown reason");
 }
 const axes=D255_AXES.map((axis,index)=>{
  const s=stats[index],def=probes.axes.find(x=>x.axis===axis);
  if(!s||s.axis!==axis||!def||![7,8,9,10,11].includes(s.presented??7))
   throw Error("D255 invalid source axis");
  if(s.status==="clear"){
   if(s.sign!==-1&&s.sign!==1)throw Error("D255 clear axis without direction");
   return {axis,sign:s.sign,source:"BASE_30",reason:"30-item directional rule",ynAnswered:0};
  }
  const [left,right]=def.initial.map(q=>responses[q.id]);
  const [contextLeft,contextRight]=def.context.map(q=>responses[q.id]);
  const initialComplete=left!==undefined&&right!==undefined;
  const contextComplete=contextLeft!==undefined&&contextRight!==undefined;
  const first=initialComplete?d255SignPair(left,right):0;
  const second=contextComplete?d255SignPair(contextLeft,contextRight):0;
  const reason=reasons[axis];
  const needsContext=["CONTEXT_DEPENDENT","WORDING_DIFFICULT"].includes(reason);
  const hasPartial=left!==undefined||right!==undefined||contextLeft!==undefined||contextRight!==undefined;
  if(!initialComplete)
   return {axis,sign:0,source:"UNRESOLVED",reason:hasPartial?"INCOMPLETE_INITIAL":"NOT_ASKED",ynAnswered:Number(left!==undefined)+Number(right!==undefined)};
  // A 2-item opposing pair is directional, but remains provisional and weaker than a scored core axis.
  // Context dependence or difficult wording defers that decision until an independent context pair.
  if(first!==0&&!needsContext){
   if(contextComplete&&second!==0&&second!==first)
    return {axis,sign:0,source:"UNRESOLVED",reason:"CONTRADICTORY_PAIRS",ynAnswered:4};
   return {axis,sign:first,source:"YN_INITIAL_PROVISIONAL",reason:"OPPOSING_YN_PAIR",ynAnswered:2+Number(contextLeft!==undefined)+Number(contextRight!==undefined)};
  }
  if(contextComplete&&second!==0){
   if(first!==0&&first!==second)
    return {axis,sign:0,source:"UNRESOLVED",reason:"CONTRADICTORY_PAIRS",ynAnswered:4};
   return {axis,sign:second,source:"YN_CONTEXT_PROVISIONAL",reason:"OPPOSING_CONTEXT_PAIR",ynAnswered:4};
  }
  return {axis,sign:0,source:"UNRESOLVED",
   reason:contextComplete?"NO_DIRECTION_IN_PAIRS":needsContext?"CONTEXT_PENDING":"BOTH_OR_UNSURE",
   ynAnswered:2+Number(contextLeft!==undefined)+Number(contextRight!==undefined)};
 });
 let candidateIds=[];
 for(let i=0;i<16;i++){
  const signs=d255TypeSigns(i);
  if(axes.every((a,j)=>a.sign===0||a.sign===signs[j]))candidateIds.push("T"+String(i+1).padStart(2,"0"));
 }
 const determined=axes.filter(a=>a.sign!==0).length;
 return {schema:D255_VERSION,scoringApproved:false,validated:false,
  typeStatus:candidateIds.length===1?"SINGLE_EXPLORATORY":"INDETERMINATE",
  candidateIds,numberOfCandidateTypes:candidateIds.length,
  determinedAxes:determined,ynDeterminedAxes:axes.filter(a=>a.source.startsWith("YN_")).length,
  axes,
  caveat:"Y/N narrows only a research hypothesis; no score or validated type is established."};
}
/** Offer one first pair per unresolved axis before contextual follow-ups; total at most 8. */
export function d255NextBatch(stats,state,probes){
 const result=d255Analyze(stats,state,probes);
 const used=Object.keys(state.responses).length;
 if(used>=8||result.numberOfCandidateTypes===1)return null;
 const uncertain=stats.filter(s=>s.status!=="clear").slice().sort((a,b)=>{
  const priority={few_directional:0,insufficient:1,tie:2,fragile:3,borderline:4};
  const p=(priority[a.status]??5)-(priority[b.status]??5);
  return p||(b.midpointOnInitial+b.skippedOnInitial)-(a.midpointOnInitial+a.skippedOnInitial)||
   a.axis.localeCompare(b.axis);
 });
 for(const s of uncertain){
  const def=probes.axes.find(a=>a.axis===s.axis);
  const missing=def.initial.filter(q=>!Object.hasOwn(state.responses,q.id));
  if(missing.length)
   return {axis:s.axis,stage:"INDEPENDENT_POLES",questions:missing.slice(0,Math.min(2,8-used)),optional:true,scoreEffect:"RESEARCH_ONLY"};
 }
 for(const s of uncertain){
  const status=result.axes.find(a=>a.axis===s.axis);
  if(status.sign!==0)continue;
  const def=probes.axes.find(a=>a.axis===s.axis);
  if(state.reasons[s.axis]==="PREFER_NOT")continue;
  const missing=def.context.filter(q=>!Object.hasOwn(state.responses,q.id));
  if(missing.length)
   return {axis:s.axis,stage:"OPTIONAL_CONTEXT",questions:missing.slice(0,Math.min(2,8-used)),optional:true,scoreEffect:"RESEARCH_ONLY"};
 }
 return null;
}
