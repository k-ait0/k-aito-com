/**
 * A05 D265: deterministically generate only SYNTHETIC aggregated statistics.
 * No user responses, network requests, DB access, personal identifiers or deployment.
 * The 16 simulated type labels intentionally DO NOT claim validated classification.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {BANK} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {buildOfflineQualityRollups,D264_PROPOSED_REVIEW_POLICY} from "./a05-d264-quality-rollups.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const out=resolve(root,"research/a05/generated/d265-synthetic-analytics-dashboard.html");
const template=readFileSync(resolve(root,"research/a05/d265-synthetic-dashboard-template.html"),"utf8");
const excluded=new Set(["A05-V1-31","A05-V1-32","A05-V1-36"]);
const probeBank=JSON.parse(readFileSync(resolve(root,"research/a05/d243-midpoint-yn-probe-bank.json"),"utf8"));
const probes=probeBank.axes.flatMap(a=>[...a.initial,...a.context]).slice(0,8);
if(BANK.items.length!==50||probes.length!==8)throw Error("D265 sources unexpected");
const questionMap=new Map(BANK.items.map(q=>[q.bank_id,q]));
const triggerQuestion=BANK.items.find(q=>q.axis==="A"&&!excluded.has(q.bank_id))?.bank_id;
if(!triggerQuestion)throw Error("D265 missing synthetic review target");
function prng(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function demoSession(index,version,globalId){
 const seed="D265-DEMO-"+version+"-"+String(index).padStart(4,"0");
 const manifest=drawResearchHoldFilteredManifest(seed);
 const rng=prng(globalId*971+743);
 if(manifest.questions.length!==30||new Set(manifest.questions.map(q=>q.id)).size!==30)
  throw Error("D265 invalid 30-item manifest");
 const exposures=manifest.questions.map(q=>{
  const id=q.id;
  if(excluded.has(id))throw Error("D265 held question leaked");
  const first=rng(),choice=rng();
  const unknownBoundary=version==="V_DEMO_A"&&id===triggerQuestion?0.45:0.045;
  const notApplicableBoundary=unknownBoundary+0.025;
  return {
   questionId:id,revision:1,phase:"CORE",
   ... (first<unknownBoundary?{responseCode:"SKIP_UNKNOWN"}:
     first<notApplicableBoundary?{responseCode:"SKIP_NOT_APPLICABLE"}:
     {responseCode:"SCALE_7",scaleValue:Math.min(7,Math.floor(choice*7)+1)})
  };
 });
 const typeId=n=>"T"+String((n%16)+1).padStart(2,"0");
 const base=globalId%17===0?{outcome:"NO_INFORMATION",typeId:null}:
  globalId%7===0?{outcome:"MULTIPLE",typeId:null}:
  {outcome:"SINGLE_PROVISIONAL",typeId:typeId(globalId*3),source:"BASE_30"};
 const rescued=base.outcome==="MULTIPLE"&&globalId%2===0;
 const final=rescued?{outcome:"SINGLE_PROVISIONAL",typeId:typeId(globalId*5+2),source:"YN_PROVISIONAL"}:
  {...base};
 if(rescued||globalId%5===0){
  const n=rescued?2:globalId%3===0?4:2;
  for(let i=0;i<n;i++){
   const e=probes[i];
   exposures.push({questionId:e.id,revision:1,phase:"YN",
    responseCode:["YN_YES","YN_NO","YN_UNSURE"][Math.floor(rng()*3)]});
  }
 }
 const day=String(1+index%20).padStart(2,"0");
 return {
  submissionId:"SYNTHETIC-NONUSER-"+globalId,
  idempotencyKey:"SYNTHETIC-DEDUP-"+globalId,
  analyticsConsent:true,completed30:true,completedAt:"2026-11-"+day+"T12:30:00+09:00",
  questionnaireVersion:version,classificationVersion:"D255-SYNTHETIC-SAMPLE",
  manifestVariant:seed,exposures,
  classifications:{BASE_30:base,FINAL_AFTER_YN:final}
 };
}
const sessions=[
 ...Array.from({length:420},(_,i)=>demoSession(i,"V_DEMO_A",i+1)),
 ...Array.from({length:180},(_,i)=>demoSession(i,"V_DEMO_B",421+i))
];
const rollup=buildOfflineQualityRollups(sessions);
if(rollup.uniqueConsentedCompleted!==600||rollup.manualReviewCandidates.length===0)
 throw Error("D265 synthetic demonstrator lacks expected review candidates");
const data={
 ...rollup,
 schema:"A05-D265-SYNTHETIC-DASHBOARD-1",
 synthetic:true,noActualResponses:true,
 scope:"OFFLINE_EXEMPLAR_ONLY",
 classifierWarning:"タイプIDは合成シナリオによる例示で、実際の回答から分類していません。",
 reviewRuleStatus:"UNAPPROVED_SAMPLE_ONLY",
 generatedFrom:"D264 offline aggregation contract",
 questionLabels:Object.fromEntries(BANK.items.map(q=>[q.bank_id,{
  id:q.bank_id,revision:1,axis:q.axis,stem:q.stem,format:"CORE"
 }])),
 ynQuestionLabels:Object.fromEntries(probes.map(q=>[q.id,{id:q.id,revision:1,stem:q.prompt,format:"YN"}]))
};
if(!template.includes("__D265_SYNTHETIC_DATA__"))throw Error("D265 template marker not found");
const safe=JSON.stringify(data).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
const html=template.replace("__D265_SYNTHETIC_DATA__",safe);
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,html,"utf8");
console.log("A05_D265_SYNTHETIC_DASHBOARD_BUILT "+JSON.stringify({
 completed:data.uniqueConsentedCompleted,
 questionnaireVersions:2,bankQuestions:BANK.items.length,
 reviewCandidateCount:data.manualReviewCandidates.length,bytes:Buffer.byteLength(html),
 actualResponseCount:0,dbConnected:false
}));
