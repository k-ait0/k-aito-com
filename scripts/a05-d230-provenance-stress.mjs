/**
 * D230 deterministic replay stress and adversarial mutations.
 * Unlike D228's 7^7 score-vector property tests, this exercises whole-session
 * seed, frozen response snapshots, follow-up replay, and independent scorer.
 */
import {writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {planResearchFollowUp} from "./a05-d227-robust-intensity-scoring.mjs";
import {beginResearchSession,appendResearchSessionRound,verifyResearchSession} from "./a05-d230-replay-provenance.mjs";

const TOTAL=12000, clone=structuredClone;
function rng(){let s=0x51f15eed;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0;};}
const random=rng();
const pick=()=>random()%7+1;
function makeAnswers(qs,scenario){
 const values={};
 for(let i=0;i<qs.length;i++){
  const q=qs[i];let x;
  switch(scenario){
   case 0:x=4;break;
   case 1:x=7;break;
   case 2:x=1;break;
   case 3:x=5;break;
   case 4:x=6;break;
   case 5:x=i%2?7:1;break;
   case 6:x=i%6===0?null:pick();break;
   case 7:x=q.axis==="B"?4:pick();break;
   case 8:x=i%3===0?null:4;break;
   default:x=pick();break;
  }
  values[q.id]=x;
 }
 return values;
}
function failIfAccepted(session,change,label,summary){
 const s=clone(session);
 change(s);
 let rejected=false;
 try{verifyResearchSession(s);}catch{rejected=true;}
 if(!rejected)throw Error("Alteration was not detected: "+label);
 summary.rejectedMutations++;
 summary.mutationsByType[label]=(summary.mutationsByType[label]||0)+1;
}
export function runProvenanceStress(count=TOTAL){
 if(!Number.isInteger(count)||count<1||count>TOTAL)throw Error("Bad count");
 const report={schema:"A05-D230-PROVENANCE-STRESS-1",mode:"RESEARCH_ONLY",
  plannedSessions:count,verifiedSessions:0,verified30:0,verified32:0,verified34:0,
  independentScoringChecks:0,rejectedMutations:0,mutationsByType:{},
  roundOneCount:0,roundTwoCount:0,errors:0,
  limits:"Synthetic test patterns only; SHA-256 hashes are not externally authenticated."};
 for(let i=0;i<count;i++){
  const seed="D230-stress-"+i,form=drawResearchHoldFilteredManifest(seed);
  const base=makeAnswers(form.questions,i%10);
  let session=beginResearchSession(seed,base);
  let score=verifyResearchSession(session);
  report.verifiedSessions++;report.verified30++;report.independentScoringChecks++;
  if(i%3===0){
   const id=session.base.manifest.questions[0].id;
   failIfAccepted(session,x=>{
    const old=x.base.answers[id];x.base.answers[id]=old===7?1:7;
   },"base_answer",report);
   failIfAccepted(session,x=>x.base.manifest.questions[0].stem+="!", "base_question",report);
   failIfAccepted(session,x=>x.seed="changed-"+seed,"base_seed",report);
   failIfAccepted(session,x=>x.headHash="0".repeat(64),"head_hash",report);
   failIfAccepted(session,x=>x.base.hash="0".repeat(64),"base_hash",report);
  }
  for(let round=0;round<2;round++){
   const offer=planResearchFollowUp(score.manifest,score.answers);
   if(offer.kind!=="OFFER_2")break;
   const delta=makeAnswers(offer.questionIds.map(id=>({id,axis:offer.axis})),i%10);
   session=appendResearchSessionRound(session,delta);
   score=verifyResearchSession(session);
   report.independentScoringChecks++;
   if(round===0){report.roundOneCount++;report.verified32++;}
   else{report.roundTwoCount++;report.verified34++;}
   if(i%3===0){
    const offset=round,answerId=offer.questionIds[0];
    failIfAccepted(session,x=>{
     const old=x.rounds[offset].answers[answerId];
     x.rounds[offset].answers[answerId]=old===7?1:7;
    },"round_answer",report);
    failIfAccepted(session,x=>x.rounds[offset].offer.reason="FORGED_REASON","offer_reason",report);
    failIfAccepted(session,x=>x.rounds[offset].offer.questionIds.reverse(),"offer_order",report);
    failIfAccepted(session,x=>x.rounds[offset].manifest.questions[30+2*offset].position=999,"extra_position",report);
    failIfAccepted(session,x=>x.rounds[offset].previousHash="0".repeat(64),"previous_hash",report);
    failIfAccepted(session,x=>x.rounds[offset].hash="0".repeat(64),"round_hash",report);
   }
  }
 }
 report.success=true;
 report.verifiedCheckpointCount=report.verified30+report.verified32+report.verified34;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const summary=runProvenanceStress();
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const path=resolve(root,"research/a05/generated/d230-provenance-stress.json");
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(summary,null,2)+"\n");
 console.log("D230_PROVENANCE_REPORT "+JSON.stringify(summary));
}
