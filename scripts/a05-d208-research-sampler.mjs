/**
 * A05 D208 research sampler. Never used by the live assessment.
 * Keeps a 50-item editorial bank separate from the published fixed-30 engine.
 * C31/C32 timing contrast is sampled together or not at all.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const sourceUrl = new URL("../research/a05/d206-editorial-50-question-bank-v1-2.json", import.meta.url);
export const BANK = JSON.parse(readFileSync(sourceUrl,"utf8"));
export const SCHEMA = "A05-D208-RESEARCH-DRAW-1";
const AXES=["A","B","C","D","E"];
const POOL={A:12,B:12,C:12,D:12,E:2};
const DRAW={A:7,B:7,C:7,D:7,E:2};
const OWN=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const digest=(s)=>createHash("sha256").update(s).digest("hex");
const bankDigest = digest(JSON.stringify(BANK.items));

function assert(ok,message){if(!ok)throw new Error(message);}
function familyMap(items) {
 const m=Object.fromEntries(AXES.map(a=>[a,{}]));
 for(const q of items){const f=q.proposed_semantic_family||"E_AUX";(m[q.axis][f]??=[]).push(q);}
 return m;
}
export function validateBank(bank=BANK) {
 assert(bank && Array.isArray(bank.items) && bank.items.length===50,"Invalid item count");
 const items=bank.items;
 assert(items.every((x,i)=>x && x.slot===i+1),"Invalid item slot");
 assert(new Set(items.map(x=>x.bank_id)).size===50,"Repeated item ID");
 assert(new Set(items.map(x=>[x.stem,x.left,x.right].join("|"))).size===50,"Exact prompt duplicate");
 for(const axis of AXES)assert(items.filter(x=>x.axis===axis).length===POOL[axis],"Wrong axis count "+axis);
 for(const q of items) {
  assert(typeof q.stem==="string" && q.stem.trim() && typeof q.left==="string" && q.left.trim() && typeof q.right==="string" && q.right.trim(),"Blank question");
  assert(q.left!==q.right && q.selected_source_id && q.decision_reason,"Invalid endpoints/provenance");
  assert(q.production_scoring_approved===false && q.user_formally_approved===false,"Research-only guard missing");
 }
 const m=familyMap(items);
 for(const axis of ["A","D"]){
  const f=Object.values(m[axis]).map(xs=>xs.length).sort();
  assert(f.length===7 && f.filter(n=>n===2).length===5 && f.filter(n=>n===1).length===2,"A/D family layout invalid");
 }
 for(const axis of ["B","C"]){
  const f=Object.values(m[axis]);
  assert(f.length===6 && f.every(xs=>xs.length===2),"B/C family layout invalid");
 }
 assert(m.C.C_OPPORTUNITY_TIMING?.length===2,"C contrast pair missing");
 assert(m.E.E_AUX?.length===2,"E pair missing");
 return true;
}
validateBank(BANK);

function seedHash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
function prng(seed){let t=seedHash(seed);return ()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};}
function shuffle(xs,r) {const a=xs.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function drawAD(m,axis,r) {
 const all=Object.keys(m[axis]), paired=all.filter(f=>m[axis][f].length===2), singles=all.filter(f=>m[axis][f].length===1);
 const keptSingles=singles.filter(()=>r()<7/12);
 const shuffledPairs=Object.fromEntries(paired.map(f=>[f,shuffle(m[axis][f],r)]));
 return [...keptSingles.flatMap(f=>m[axis][f]),...paired.map(f=>shuffledPairs[f][0]),...shuffle(paired,r).slice(0,2-keptSingles.length).map(f=>shuffledPairs[f][1])];
}
function drawB(m,r){
 const groups=Object.keys(m.B);
 const shuffledGroups=Object.fromEntries(groups.map(f=>[f,shuffle(m.B[f],r)]));
 return [...groups.map(f=>shuffledGroups[f][0]),shuffledGroups[groups[Math.floor(r()*groups.length)]][1]];
}
function drawC(m,r) {
 const groups=Object.keys(m.C),timing="C_OPPORTUNITY_TIMING",others=groups.filter(f=>f!==timing);
 const shuffledGroups=Object.fromEntries(groups.map(f=>[f,shuffle(m.C[f],r)]));
 if(r()<7/12)return [...shuffledGroups[timing],...others.map(f=>shuffledGroups[f][0])];
 return [...others.map(f=>shuffledGroups[f][0]),...shuffle(others,r).slice(0,2).map(f=>shuffledGroups[f][1])];
}
function interleave(selected,r){
 const pool=Object.fromEntries(AXES.map(a=>[a,shuffle(selected.filter(x=>x.axis===a),r)]));
 const roundsWithE=shuffle([0,1,2,3,4,5,6],r).slice(0,2);
 const eItems=shuffle(pool.E,r);
 const eRound=new Map(roundsWithE.map((round,i)=>[round,eItems[i]]));
 const out=[];
 for(let round=0;round<7;round++){
  const stage=shuffle(["A","B","C","D"].map(a=>pool[a][round]).concat(eRound.has(round)?[eRound.get(round)]:[]),r);
  const previous=out.length?out[out.length-1].axis:null;
  if(previous===stage[0].axis){
   const swap=stage.findIndex(x=>x.axis!==previous);
   [stage[0],stage[swap]]=[stage[swap],stage[0]];
  }
  out.push(...stage);
 }
 return out;
}
function drawInternal(seed){
 const random=prng("D208|"+bankDigest+"|"+seed);
 const m=familyMap(BANK.items);
 const selected=[...drawAD(m,"A",random),...drawB(m,random),...drawC(m,random),...drawAD(m,"D",random),...m.E.E_AUX];
 return interleave(selected,random);
}
function validateSeed(seed){assert(typeof seed==="string" && seed.length>0 && seed.length<=128,"Invalid seed");}
export function drawResearchManifest(seed){
 validateSeed(seed);
 const q=drawInternal(seed);
 assert(q.length===30 && new Set(q.map(x=>x.bank_id)).size===30,"Internal bad draw");
 const manifest={
  schema:SCHEMA,mode:"RESEARCH_ONLY",bankDigest,seed,questionCount:30,counts:{...DRAW},
  questions:q.map((x,position)=>({position:position+1,id:x.bank_id,axis:x.axis,stem:x.stem,left:x.left,right:x.right,source:x.selected_source_id,provisionalFamily:x.proposed_semantic_family||null})),
  classification:null,scoreVersion:null,productionEligible:false
 };
 manifest.checksum=digest(JSON.stringify(manifest));
 return manifest;
}
export function verifyResearchManifest(manifest){
 assert(manifest && manifest.schema===SCHEMA && manifest.mode==="RESEARCH_ONLY" && manifest.productionEligible===false,"Bad manifest type");
 validateSeed(manifest.seed);
 assert(JSON.stringify(manifest)===JSON.stringify(drawResearchManifest(manifest.seed)),"Manifest does not match frozen bank/seed");
 return true;
}
export function validateResearchAnswers(manifest,answers){
 verifyResearchManifest(manifest);
 assert(answers && typeof answers==="object" && !Array.isArray(answers),"Invalid answer bag");
 const ids=new Set(manifest.questions.map(x=>x.id));
 for(const [key,value] of Object.entries(answers)){
  assert(ids.has(key),"Answer for unasked ID");
  assert(value===null || (Number.isInteger(value) && value>=1 && value<=7),"Invalid 7-point response");
 }
 return true;
}
export function makeResearchCheckpoint(manifest,answers){
 validateResearchAnswers(manifest,answers);
 const safe=Object.fromEntries(Object.entries(answers).sort(([a],[b])=>a.localeCompare(b)));
 const next=manifest.questions.findIndex(x=>!OWN(safe,x.id));
 const cp={schema:"A05-D208-CHECKPOINT-1",mode:"RESEARCH_ONLY",manifest,answers:safe,nextPosition:next<0?31:next+1};
 cp.checksum=digest(JSON.stringify(cp));
 return cp;
}
export function restoreResearchCheckpoint(checkpoint){
 assert(checkpoint && checkpoint.schema==="A05-D208-CHECKPOINT-1" && checkpoint.mode==="RESEARCH_ONLY","Invalid checkpoint");
 const rebuilt=makeResearchCheckpoint(checkpoint.manifest,checkpoint.answers);
 assert(JSON.stringify(checkpoint)===JSON.stringify(rebuilt),"Checkpoint was modified");
 return rebuilt;
}
export function previewCompletion(manifest,answers){
 validateResearchAnswers(manifest,answers);
 const axes={};
 for(const axis of AXES){
  const qs=manifest.questions.filter(x=>x.axis===axis);
  const observed=qs.filter(x=>OWN(answers,x.id));
  axes[axis]={presented:qs.length,answered:observed.filter(x=>answers[x.id]!==null).length,skipped:observed.filter(x=>answers[x.id]===null).length,unanswered:qs.length-observed.length};
 }
 return {mode:"RESEARCH_ONLY",axes,classification:null,typeId:null,wealthType:null};
}
