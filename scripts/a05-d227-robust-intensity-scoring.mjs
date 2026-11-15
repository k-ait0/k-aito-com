/**
 * A05 D227 / research-only power-1.5 scorer + conservative directional evidence
 * and an optional two-item continuation planner. NEVER a production scoring engine.
 *
 * Decision is "directional evidence", not a probability or reliability measure.
 * Do not edit published D222 preview, original D208, D224 item bank, or G1-G5 gates.
 */
import {BANK} from "./a05-d208-research-sampler.mjs";
import {isCoreScoringCandidate} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResponse} from "./a05-d226-answer-intensity-comparison.mjs";

export const VERSION="A05-D227-POWER-1_5-ROBUSTNESS-RESEARCH-1";
export const CORE=["A","B","C","D"];
const byId=new Map(BANK.items.map(q=>[q.bank_id,q]));
const POW=1.5;
const MIN_VALID=5;
const MIN_FAMILIES=4;
/** A reference cutoff at the normalized influence of selecting 5 on all items.
 * Exploratory only: not calibrated; exact equality is considered weak. */
export const WEAK_REFERENCE=Math.pow(1/3,POW);
const EPS=1e-12;
function own(x,k){return Object.prototype.hasOwnProperty.call(x,k);}
function sign(x){return Math.abs(x)<=EPS?0:Math.sign(x);}
function family(q){return q.proposed_semantic_family||q.provisionalFamily||"E_AUX";}
function checkedManifest(manifest){
 if(!manifest||manifest.mode!=="RESEARCH_ONLY"||!Array.isArray(manifest.questions))
  throw Error("Research-only manifest required");
 const n=manifest.questions.length;
 if(n!==30&&n!==32&&n!==34)throw Error("Invalid 30/32/34 questionnaire length");
 const seen=new Set(),count={A:0,B:0,C:0,D:0,E:0};
 for(const item of manifest.questions){
  if(!item||typeof item.id!=="string"||!byId.has(item.id)||seen.has(item.id))
   throw Error("Unknown or duplicate item");
  seen.add(item.id);
  const q=byId.get(item.id);
  if(item.axis!==q.axis||!own(count,q.axis))throw Error("Axis spoof detected");
  if(q.axis==="C"&&!isCoreScoringCandidate(q.bank_id))throw Error("D213 held C item not eligible for research scoring");
  count[q.axis]++;
 }
 if(count.E!==2||CORE.some(a=>count[a]<7||count[a]>11)||CORE.reduce((s,a)=>s+count[a],0)!==n-2)
  throw Error("Axis quotas invalid");
 if(typeof manifest.seed!=="string"||!manifest.seed.trim())throw Error("Manifest seed missing");
 return count;
}
function checkedAnswers(manifest,answers){
 if(!answers||Array.isArray(answers)||typeof answers!=="object")throw Error("Invalid answer bag");
 const ids=new Set(manifest.questions.map(q=>q.id));
 for(const [id,val] of Object.entries(answers)){
  if(!ids.has(id))throw Error("Answer for unasked ID");
  if(val!==null&&(!Number.isInteger(val)||val<1||val>7))
   throw Error("Invalid answer 1..7 or null");
 }
}
function computeAxis(axis,manifest,answers){
 const selected=manifest.questions.filter(q=>q.axis===axis).map(q=>byId.get(q.id));
 const responded=selected.filter(q=>Number.isInteger(answers[q.bank_id])).map(q=>({
  id:q.bank_id,family:family(q),score:scoreResponse(answers[q.bank_id],POW)
 }));
 const n=responded.length,sum=responded.reduce((s,x)=>s+x.score,0);
 const mean=n?sum/n:0,s=sign(sum);
 const families=[...new Set(responded.map(x=>x.family))];
 let itemFlipCount=0,familyFlipCount=0;
 if(n){
  for(const item of responded)if(sign(sum-item.score)!==s)itemFlipCount++;
  for(const f of families){
   const removed=responded.filter(x=>x.family===f).reduce((a,x)=>a+x.score,0);
   if(sign(sum-removed)!==s)familyFlipCount++;
  }
 }
 const insufficient=n<MIN_VALID||families.length<MIN_FAMILIES;
 const weak=Math.abs(mean)<=WEAK_REFERENCE+EPS;
 const fragile=itemFlipCount>0||familyFlipCount>0;
 const status=insufficient?"INSUFFICIENT":s===0?"TIE":weak?"WEAK":fragile?"FRAGILE":"DIRECTIONAL";
 return {axis,presented:selected.length,valid:n,skipped:selected.length-n,
  mean,sign:s,distinctFamilies:families.length,
  itemFlipCount,familyFlipCount,status,directional:status==="DIRECTIONAL"};
}
function typeId(directions){
 const [a,b,c,d]=directions;
 const group=(a===1?2:0)+(b===1?1:0);
 const within=(c===1?2:0)+(d===1?1:0);
 return "T"+String(group*4+within+1).padStart(2,"0");
}
export function scoreResearchForm(manifest,answers){
 checkedManifest(manifest);checkedAnswers(manifest,answers);
 const axes=CORE.map(axis=>computeAxis(axis,manifest,answers));
 const choices=axes.map(a=>a.directional?[a.sign]:[-1,1]);
 let candidates=[[]];
 for(const opts of choices)candidates=candidates.flatMap(prefix=>opts.map(val=>[...prefix,val]));
 const types=candidates.map(typeId).sort();
 return {schema:VERSION,mode:"RESEARCH_ONLY",power:POW,scoreValid:false,
  axes,possibleTypes:types,numberOfCandidateTypes:types.length,
  resultKind:types.length===1?"SINGLE_PROVISIONAL":types.length<=4?"NEAR_TYPES":"WITHHELD",
  caveat:"Directional stability under deletion, not reliability/confidence/validity."};
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
export function planResearchFollowUp(manifest,answers){
 const score=scoreResearchForm(manifest,answers);
 const rounds=(manifest.questions.length-30)/2;
 if(!Number.isInteger(rounds)||rounds<0||rounds>2)throw Error("Invalid continuation count");
 if(rounds>=2)return {schema:VERSION,kind:"NONE",reason:"MAX_34_QUESTIONS",after:manifest.questions.length,score};
 const existing=new Set(manifest.questions.map(q=>q.id));
 const unresolved=score.axes.filter(a=>!a.directional);
 const severity={INSUFFICIENT:0,TIE:1,FRAGILE:2,WEAK:3,DIRECTIONAL:4};
 unresolved.sort((a,b)=>severity[a.status]-severity[b.status]||
  Math.abs(a.mean)-Math.abs(b.mean)||a.axis.localeCompare(b.axis));
 for(const axis of unresolved){
  const available=BANK.items.filter(q=>q.axis===axis.axis&&!existing.has(q.bank_id)&&isCoreScoringCandidate(q.bank_id));
  if(available.length<2)continue;
  const usedFamily=new Map();
  for(const q of manifest.questions){
   if(q.axis!==axis.axis)continue;
   const f=family(byId.get(q.id));
   usedFamily.set(f,(usedFamily.get(f)||0)+1);
  }
  // Prefer coverage of underrepresented (or wholly absent) facets.
  // No answer-dependent item selection beyond identifying the uncertain axis;
  // semantic-family choices remain editorial/unvalidated heuristics.
  const ranked=available.sort((a,b)=>
   (usedFamily.get(family(a))||0)-(usedFamily.get(family(b))||0)||
   hash(manifest.seed+"|"+a.bank_id)-hash(manifest.seed+"|"+b.bank_id)||
   a.bank_id.localeCompare(b.bank_id));
  const first=ranked[0],second=ranked.find(q=>family(q)!==family(first))||ranked[1];
  return {schema:VERSION,kind:"OFFER_2",axis:axis.axis,
   questionIds:[first.bank_id,second.bank_id],reason:axis.status,
   after:manifest.questions.length+2,
   caveat:"Optional research follow-up; not guaranteed to resolve ambiguous values."};
 }
 return {schema:VERSION,kind:"NONE",reason:unresolved.length?"NO_ELIGIBLE_PAIR":"NO_UNRESOLVED_AXIS",
  after:manifest.questions.length,score};
}
export function appendResearchFollowUp(manifest,offer){
 checkedManifest(manifest);
 if(!offer||offer.kind!=="OFFER_2"||!Array.isArray(offer.questionIds)||offer.questionIds.length!==2)
  throw Error("Invalid follow-up offer");
 if(manifest.questions.length>=34)throw Error("Maximum 34 questions");
 const seen=new Set(manifest.questions.map(q=>q.id));
 const extra=offer.questionIds.map(id=>{
  const q=byId.get(id);
  if(!q||seen.has(id)||!CORE.includes(q.axis)||q.axis!==offer.axis||
    !isCoreScoringCandidate(id))throw Error("Follow-up item ineligible or repeated");
  seen.add(id);
  return {position:seen.size,id:q.bank_id,axis:q.axis,stem:q.stem,
   left:q.left,right:q.right,source:q.selected_source_id,
   provisionalFamily:family(q),scoring_role:"UNVALIDATED_CORE_CANDIDATE"};
 });
 const copy={...manifest,questions:manifest.questions.map(q=>({...q})).concat(extra),
  mode:"RESEARCH_ONLY",schema:VERSION,scoringApproved:false};
 checkedManifest(copy);
 return copy;
}
