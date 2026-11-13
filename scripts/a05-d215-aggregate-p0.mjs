/**
 * A05 D215: local-only aggregate for real D210 full50 cognitive reviews.
 * Run: node scripts/a05-d215-aggregate-p0.mjs response1.json response2.json [...]
 * Outputs aggregate counts only; never prints raw answer text or personal information.
 * Sample sizes are descriptive and do NOT establish psychometric validity.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {drawResearchManifest, BANK} from "./a05-d208-research-sampler.mjs";
const expectedDigest=drawResearchManifest("D215-anchor").bankDigest;
const defs=[["C31-32",31,32],["C35-36",35,36],["E49-50",49,50]];
const idBySlot=Object.fromEntries(BANK.items.map(q=>[q.slot,q.bank_id]));
const VALID=new Set(["same","different","unsure"]);
export function analyzeP0(sessions){
 if(!Array.isArray(sessions))throw Error("Require array of sessions");
 const seen=new Set(), output={
  schema:"A05-D215-LOCAL-AGGREGATE-1",mode:"RESEARCH_ONLY",bankDigest:expectedDigest,
  sessions:0,rejected:0,rejectionReasons:{},pairReviews:{},dualRatings:{},
  scope:"Descriptive respondent review; no scored type, no human validation claim."
 };
 for(const [pair] of defs)output.pairReviews[pair]={same:0,different:0,unsure:0,missing:0,pairedNumeric:0,meanAbsoluteResponseDifference:null};
 const absSums=Object.fromEntries(defs.map(([id])=>[id,0]));
 for(const session of sessions){
  let reason=null;
  if(!session || session.schema!=="A05-D210-RESEARCH-SESSION-1" || session.mode!=="full50" || session.consent!==true)reason="invalid_mode_or_consent";
  else if(session.bankDigest!==expectedDigest || session.bankVersion!==BANK.schema)reason="bank_version_mismatch";
  else if(typeof session.seed!=="string" || !session.seed || seen.has(session.seed))reason="missing_or_repeated_session_seed";
  else if(!Array.isArray(session.order) || session.order.length!==50 ||
     new Set(session.order).size!==50 ||
     session.order.some(id=>!BANK.items.some(q=>q.bank_id===id)))reason="invalid_question_manifest";
  else if(!session.answers || typeof session.answers!=="object" || Array.isArray(session.answers) ||
     Object.entries(session.answers).some(([k,v])=>!session.order.includes(k) || !(v===null || Number.isInteger(v)&&v>=1&&v<=7)))reason="invalid_answers";
  else if(!session.pairReviews || typeof session.pairReviews!=="object" || Array.isArray(session.pairReviews) ||
     Object.entries(session.pairReviews).some(([k,v])=>!defs.some(d=>d[0]===k) ||
       !v || typeof v!=="object" || Array.isArray(v) ||
       ![null,"same","different","unsure"].includes(v.sameMeaning??null) ||
       typeof (v.reason??"")!=="string" || (v.reason??"").length>800))reason="invalid_pair_reviews";
  else if(!session.probes || typeof session.probes!=="object" || Array.isArray(session.probes) ||
     Object.values(session.probes).some(v=>!Number.isInteger(v)||v<1||v>7))reason="invalid_probes";
  if(reason){
   output.rejected++;
   output.rejectionReasons[reason]=(output.rejectionReasons[reason]||0)+1;
   continue;
  }
  seen.add(session.seed);output.sessions++;
  for(const [pair,a,b] of defs){
   const review=session.pairReviews[pair]?.sameMeaning ?? null;
   output.pairReviews[pair][review===null?"missing":review]++;
   const left=session.answers[idBySlot[a]],right=session.answers[idBySlot[b]];
   if(Number.isInteger(left)&&Number.isInteger(right)){
    output.pairReviews[pair].pairedNumeric++;absSums[pair]+=Math.abs(left-right);
   }
  }
  for(const ax of ["B","C"]){
   const lhs=ax==="B"?"B_AUTONOMY":"C_FUTURE",rhs=ax==="B"?"B_CONNECTION":"C_PRESENT";
   const a=session.probes[lhs],b=session.probes[rhs];const key=ax+"_DUAL";
   const item=output.dualRatings[key]??={bothHigh:0,bothLow:0,mixed:0,missing:0};
   if(!Number.isInteger(a)||!Number.isInteger(b))item.missing++;
   else if(a>=6&&b>=6)item.bothHigh++;
   else if(a<=2&&b<=2)item.bothLow++;
   else item.mixed++;
  }
 }
 for(const [pair] of defs){
  const obj=output.pairReviews[pair];
  if(obj.pairedNumeric)obj.meanAbsoluteResponseDifference=Number((absSums[pair]/obj.pairedNumeric).toFixed(3));
 }
 return output;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const files=process.argv.slice(2);
 if(!files.length){console.error("Usage: node scripts/a05-d215-aggregate-p0.mjs response1.json [...]");process.exitCode=2;}
 else{
  const data=files.map(f=>JSON.parse(readFileSync(f,"utf8")));
  process.stdout.write(JSON.stringify(analyzeP0(data),null,2)+"\n");
 }
}
