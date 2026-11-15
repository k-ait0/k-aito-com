/**
 * A05 D235 / aggregate-only real-respondent pilot readiness.
 *
 * Accepts locally supplied, consented D210 full50 exports; DOES NOT claim
 * authenticity, reliability, validity, or test-retest evidence.
 * Does not transmit or persist input notes, participant seeds or raw answers.
 * Output is aggregate counts ONLY; zero records produces explicit NO_DATA.
 * C31/C32/C36 excluded from core research sampler by D224. E non-scored.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {scoreResearchForm} from "./a05-d227-robust-intensity-scoring.mjs";

const AXES=["A","B","C","D"];
const EXPECTED_DIGEST=drawResearchManifest("D235-bank-check").bankDigest;
const bankIDs=BANK.items.map(x=>x.bank_id);
const idset=new Set(bankIDs);
const probes=["B_AUTONOMY","B_CONNECTION","C_FUTURE","C_PRESENT"];
const isValue=x=>Number.isInteger(x)&&x>=1&&x<=7;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function failCode(record){
 if(!record||record.schema!=="A05-D210-RESEARCH-SESSION-1"||record.mode!=="full50"||record.consent!==true)
  return "invalid_mode_or_consent";
 if(record.bankDigest!==EXPECTED_DIGEST||record.bankVersion!==BANK.schema)
  return "bank_mismatch";
 if(typeof record.seed!=="string"||!record.seed||record.seed.length>128)
  return "invalid_seed";
 if(!Array.isArray(record.order)||record.order.length!==50||new Set(record.order).size!==50||
    record.order.some(id=>!idset.has(id)))
  return "invalid_order";
 if(!record.answers||typeof record.answers!=="object"||Array.isArray(record.answers)||
    Object.keys(record.answers).length!==50||
    Object.entries(record.answers).some(([id,v])=>!idset.has(id)||!(v===null||isValue(v))))
  return "incomplete_or_invalid_answers";
 if(!record.probes||typeof record.probes!=="object"||Array.isArray(record.probes)||
    Object.entries(record.probes).some(([id,v])=>!probes.includes(id)||!isValue(v)))
  return "invalid_probes";
 if(record.notes!==undefined&&(typeof record.notes!=="string"||record.notes.length>2000))
  return "invalid_notes";
 return null;
}
function sign(x){return x>1e-12?1:x< -1e-12?-1:0;}
function oneAxis(ids,answers,p=1){
 let total=0,n=0;
 for(const id of ids){
  const x=answers[id];if(x===null)continue;
  const d=x-4;total+=d===0?0:Math.sign(d)*Math.pow(Math.abs(d)/3,p);n++;
 }
 return n<5?null:sign(total);
}
function dualPattern(a,b){
 if(a>=6&&b>=6)return "both_high";
 if(a<=2&&b<=2)return "both_low";
 if(a>=6&&b<=2||a<=2&&b>=6)return "opposite";
 return "other";
}
const freshAxis=()=>({eligiblePeople:0,switchPeopleLinear:0,switchPeoplePower15:0,
 formsPositiveLinear:0,formsNegativeLinear:0,formsTieOrInsufficientLinear:0,
 formsPositivePower15:0,formsNegativePower15:0,formsTieOrInsufficientPower15:0});
export function summarizePilot(records,opts={}){
 if(!Array.isArray(records))throw Error("Expected a locally held array of D210 full50 records");
 const forms=opts.forms===undefined?128:opts.forms;
 if(!Number.isInteger(forms)||forms<1||forms>512)throw Error("Forms must be integer in [1,512]");
 const manifests=Array.from({length:forms},(_,i)=>drawResearchHoldFilteredManifest(
   "D235-preregistered-form-"+String(i).padStart(4,"0")));
 const formIds=manifests.map(m=>AXES.map(axis=>m.questions.filter(q=>q.axis===axis).map(q=>q.id)));
 const axes=Object.fromEntries(AXES.map(a=>[a,freshAxis()]));
 const out={
  schema:"A05-D235-PILOT-AGGREGATE-1",mode:"RESEARCH_ONLY",
  dataset_origin:"UNVERIFIED_USER_SUPPLIED_LOCAL_EXPORTS",
  inputRecords:records.length,acceptedRecords:0,rejectedRecords:0,rejections:{},
  formsPerRespondent:forms,axes,coreCandidateCounts:{"1":0,"2":0,"4":0,"8":0,"16":0},
  bothValued:{B:{both_high:0,both_low:0,opposite:0,other:0,missing:0},
              C:{both_high:0,both_low:0,opposite:0,other:0,missing:0}},
  rawAnswersExported:false,personalIdentifiersExported:false,
  samplingMode:"same answered full50 respondent resampled into fixed D224 30-item subsets",
  empiricalTruthLabelsAvailable:false,
  caveat:"Reusing each person's answers across many subsets is not a retest. Responses have not been identity-verified. Candidate set stability is not psychometric validity."
 };
 const seeds=new Set();
 for(const record of records){
  let reason=failCode(record);
  if(!reason&&seeds.has(record.seed))reason="duplicate_session_seed";
  if(reason){out.rejectedRecords++;out.rejections[reason]=(out.rejections[reason]||0)+1;continue;}
  seeds.add(record.seed);out.acceptedRecords++;
  const answers=record.answers;
  for(const [axis,a,b] of [["B","B_AUTONOMY","B_CONNECTION"],["C","C_FUTURE","C_PRESENT"]]){
   const values=record.probes;
   const x=values[a],y=values[b];
   out.bothValued[axis][isValue(x)&&isValue(y)?dualPattern(x,y):"missing"]++;
  }
  const signs1=Object.fromEntries(AXES.map(a=>[a,new Set()]));
  const signs15=Object.fromEntries(AXES.map(a=>[a,new Set()]));
  const comparable=Object.fromEntries(AXES.map(a=>[a,0]));
  for(let j=0;j<forms;j++){
   const manifest=manifests[j];
   const score=scoreResearchForm(manifest,answers);
   out.coreCandidateCounts[String(score.numberOfCandidateTypes)]++;
   for(let k=0;k<4;k++){
    const axis=AXES[k],entry=axes[axis],ids=formIds[j][k];
    const x=oneAxis(ids,answers,1);
    const y=oneAxis(ids,answers,1.5);
    const field1=x===1?"formsPositiveLinear":x===-1?"formsNegativeLinear":"formsTieOrInsufficientLinear";
    const field15=y===1?"formsPositivePower15":y===-1?"formsNegativePower15":"formsTieOrInsufficientPower15";
    entry[field1]++;entry[field15]++;
    if(x!==null){signs1[axis].add(x);comparable[axis]++;}
    if(y!==null)signs15[axis].add(y);
   }
  }
  for(const axis of AXES){
   if(comparable[axis]===0)continue;
   axes[axis].eligiblePeople++;
   if(signs1[axis].has(-1)&&signs1[axis].has(1))axes[axis].switchPeopleLinear++;
   if(signs15[axis].has(-1)&&signs15[axis].has(1))axes[axis].switchPeoplePower15++;
  }
 }
 out.formAssessments=out.acceptedRecords*forms;
 out.status=out.acceptedRecords?"PILOT_SUMMARY_NOT_VALIDATED":"NO_ELIGIBLE_REAL_DATA";
 return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const records=process.argv.slice(2).map(filename=>JSON.parse(readFileSync(filename,"utf8")));
 const report=summarizePilot(records);
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
}
