/**
 * A05 D216: research-only form-variation diagnostic.
 * Resample 30-question subsets from actual FULL-50 response records.
 * No 16-type classification, no calibrated score, no claim of validity.
 *
 * Run (no input files):
 *   node scripts/a05-d216-form-variation.mjs
 * Run with explicitly collected and locally held D210 records:
 *   node scripts/a05-d216-form-variation.mjs response1.json response2.json
 *
 * OUTPUT: counts only. Never outputs seed, answers, notes or identifiers.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";

const AXES=["A","B","C","D"];
const IDS=Object.fromEntries(BANK.items.map(x=>[x.bank_id,x.axis]));
const EXPECTED_HASH=drawResearchManifest("D216-bank-check").bankDigest;
const idList=BANK.items.map(x=>x.bank_id);
const is7=x=>Number.isInteger(x)&&x>=1&&x<=7;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function rejectReason(x){
  if(!x||x.schema!=="A05-D210-RESEARCH-SESSION-1"||x.mode!=="full50"||x.consent!==true)return "invalid_mode_or_consent";
  if(x.bankDigest!==EXPECTED_HASH||x.bankVersion!==BANK.schema)return "bank_version_mismatch";
  if(typeof x.seed!=="string"||!x.seed||x.seed.length>128)return "invalid_seed";
  if(!Array.isArray(x.order)||x.order.length!==50||new Set(x.order).size!==50||x.order.some(id=>!own(IDS,id)))return "invalid_manifest";
  if(!x.answers||typeof x.answers!=="object"||Array.isArray(x.answers))return "invalid_answers";
  if(Object.entries(x.answers).some(([id,v])=>!own(IDS,id)||!(v===null||is7(v))))return "invalid_answers";
  return null;
}
export function analyzeFormVariation(records,options={}){
  if(!Array.isArray(records))throw Error("Expected array of locally supplied D210 records");
  const n=options.draws===undefined?256:options.draws;
  if(!Number.isInteger(n)||n<1||n>2048)throw Error("draws must be an integer in [1,2048]");
  const forms=Array.from({length:n},(_,i)=>drawResearchManifest("D216-fixed-form-"+String(i).padStart(4,"0")));
  const perAxis=Object.fromEntries(AXES.map(a=>[a,{
    eligibleRespondents:0,partiallyAnsweredRespondents:0,
    positive:0,negative:0,midpointOrTie:0,
    validFormSelections:0,missingFormSelections:0,respondentsWithBothSigns:0,
    maxWithinPersonSelectedMeanRange:null
  }]));
  const out={
    schema:"A05-D216-FORM-VARIATION-1",mode:"RESEARCH_ONLY",
    record_origin:"UNVERIFIED_LOCALLY_SUPPLIED_RECORDS",bankDigest:EXPECTED_HASH,
    drawsPerRespondent:n,inputRecords:records.length,acceptedRecords:0,rejectedRecords:0,
    rejections:{},axes:perAxis,coreTypeId:null,classification:null,
    caution:"Positive/negative denotes only relative response direction (answer-4), not validated psychological scores. No respondent legitimacy or reliability claims."
  };
  const seeds=new Set();
  for(const record of records){
    let reason=rejectReason(record);
    if(!reason&&seeds.has(record.seed))reason="duplicate_session_seed";
    if(reason){out.rejectedRecords++;out.rejections[reason]=(out.rejections[reason]||0)+1;continue;}
    seeds.add(record.seed);out.acceptedRecords++;
    for(const a of AXES){
      const stats=perAxis[a];
      const axisIds=idList.filter(id=>IDS[id]===a);
      // A full set is essential for a within-person all-form comparison.
      if(!axisIds.every(id=>is7(record.answers[id]))){
        stats.partiallyAnsweredRespondents++;
        continue;
      }
      stats.eligibleRespondents++;
      let pos=0,neg=0,low=Infinity,high=-Infinity;
      for(const form of forms){
        const ids=form.questions.filter(q=>q.axis===a).map(q=>q.id);
        if(ids.length!==7||ids.some(id=>!is7(record.answers[id]))){
          stats.missingFormSelections++;continue;
        }
        const mean=ids.reduce((s,id)=>s+(record.answers[id]-4),0)/ids.length;
        low=Math.min(low,mean);high=Math.max(high,mean);
        stats.validFormSelections++;
        if(mean>0){stats.positive++;pos++;}
        else if(mean<0){stats.negative++;neg++;}
        else stats.midpointOrTie++;
      }
      if(pos&&neg)stats.respondentsWithBothSigns++;
      if(low!==Infinity){
        const v=Number((high-low).toFixed(6));
        stats.maxWithinPersonSelectedMeanRange=Math.max(stats.maxWithinPersonSelectedMeanRange??0,v);
      }
    }
  }
  for(const a of AXES){
    const s=perAxis[a],denom=s.validFormSelections;
    s.formDirectionFractions=denom?{
      positive:Number((s.positive/denom).toFixed(6)),
      negative:Number((s.negative/denom).toFixed(6)),
      exactMidpoint:Number((s.midpointOrTie/denom).toFixed(6))
    }:null;
    // Do not output per-person level results.
  }
  return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const files=process.argv.slice(2);
  const records=files.map(f=>JSON.parse(readFileSync(f,"utf8")));
  process.stdout.write(JSON.stringify(analyzeFormVariation(records),null,2)+"\n");
}
