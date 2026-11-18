/**
 * D224: eligibility-gated candidate questionnaire for isolated comparison.
 *
 * CRITICAL: This is NOT a production-ready sampler.
 * It applies only three C-axis editorial research holds from D213.
 * The two E items remain auxiliary non-scored prompts (never core classifiers).
 * All other items are still unvalidated and not officially approved.
 * The live D208 sampler and public D222 preview are deliberately untouched.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const finding=JSON.parse(readFileSync(new URL("../research/a05/d213-p0-editorial-decisions.json",import.meta.url),"utf8"));
const AXES=["A","B","C","D","E"];
const C_HOLDS=new Set(["A05-V1-31","A05-V1-32","A05-V1-36"]);
const E_NONSCORING=new Set(["A05-V1-49","A05-V1-50"]);
const cCandidate=BANK.items.filter(q=>q.axis==="C"&&!C_HOLDS.has(q.bank_id));
const bankIdIndex=new Map(BANK.items.map(q=>[q.bank_id,q]));
function verifyPriorDecisions(){
 const actual=new Set();
 for(const item of finding.findings){
  if(item.decision==="PAIRED_CONTRAST_RESEARCH_ONLY")for(const slot of item.pair)actual.add("A05-V1-"+slot);
  if(item.decision==="KEEP_35_AS_REFERENCE_MARK_36_REPLACEMENT_NEEDED")
   actual.add("A05-V1-"+item.pair[1]);
 }
 if(actual.size!==C_HOLDS.size||[...actual].some(id=>!C_HOLDS.has(id)))throw Error("D213 hold policy changed: review D224 manually");
 if(cCandidate.length!==9||E_NONSCORING.size!==2)throw Error("Unexpected candidate item count");
}
verifyPriorDecisions();
function sortKey(seed,id){return createHash("sha256").update("D224|"+seed+"|"+id).digest("hex");}
export const D224_VERSION="A05-D224-EDITORIAL-HOLD-FILTER-RESEARCH-1";
export function isCoreScoringCandidate(questionId){
 const q=bankIdIndex.get(questionId);
 if(!q)throw Error("Unknown question ID");
 return AXES.slice(0,4).includes(q.axis)&&!C_HOLDS.has(questionId);
}
export function drawResearchHoldFilteredManifest(seed){
 const base=drawResearchManifest(seed);
 const c=cCandidate.slice().sort((a,b)=>sortKey(seed,a.bank_id).localeCompare(sortKey(seed,b.bank_id))).slice(0,7);
 const cSlots=base.questions.filter(q=>q.axis==="C").map(q=>q.position-1);
 if(cSlots.length!==7||new Set(c.map(q=>q.bank_id)).size!==7)throw Error("Invalid C selection");
 const selectedQuestions=base.questions.map((old,i)=>{
  const rank=cSlots.indexOf(i);
  if(rank<0)return {...old,scoring_role:old.axis==="E"?"NONSCORING_AUXILIARY":"UNVALIDATED_CORE_CANDIDATE"};
  const q=c[rank];
  return {position:i+1,id:q.bank_id,axis:"C",stem:q.stem,left:q.left,right:q.right,
   source:q.selected_source_id,provisionalFamily:q.proposed_semantic_family||null,
   scoring_role:"UNVALIDATED_CORE_CANDIDATE"};
 });
 const ids=new Set(selectedQuestions.map(q=>q.id));
 if(ids.size!==30||selectedQuestions.length!==30||selectedQuestions.some(q=>q.axis==="C"&&C_HOLDS.has(q.id)))throw Error("Research hold breach");
 for(let j=1;j<30;j++)if(selectedQuestions[j].axis===selectedQuestions[j-1].axis)throw Error("Adjacent axis repeats");
 for(const [axis,n] of Object.entries({A:7,B:7,C:7,D:7,E:2})){
  if(selectedQuestions.filter(q=>q.axis===axis).length!==n)throw Error("Quota breach "+axis);
 }
 return {
  schema:D224_VERSION,mode:"RESEARCH_ONLY",seed,
  sourceBank:BANK.schema,sourceDraw:base.schema,
  questions:selectedQuestions,
  scoringApproved:false,
  holdExcluded:[...C_HOLDS].sort(),
  eRole:"AUXILIARY_NONSCORING",
  interpretation:"D213 editorial holds only; no psychometric validation"
 };
}
