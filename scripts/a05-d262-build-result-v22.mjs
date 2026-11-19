/**
 * A05 D219 | isolated, nonproduction 30-question plus optional Y/N research demonstration.
 * Generates a fully offline static HTML from the D206 editorial bank,
 * D208 research sampler and existing draft 16-type presentation names.
 * Does not change/enable the production engine or save assessments.
 * D246 is an isolated output, NOT published by the D242 gh-pages workflow.
 * Uses D224-held-safe forms, D243 probes, and 1.5-power reference scoring.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {drawResearchHoldFilteredManifest} from "./a05-d224-hold-filtered-sampler.mjs";
import {TYPES,GROUPS} from "../projects/kidp/life-design-lab/a05/types.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const template=readFileSync(resolve(root,"research/a05/d262-result-parameters-v22-template.html"),"utf8");
const classifierSource=readFileSync(resolve(root,"scripts/a05-d255-yn-provisional-classifier.mjs"),"utf8");
if(!classifierSource.includes("A05-D255-YN-PROVISIONAL-CLASSIFIER-1")||
 classifierSource.includes("</script")||
 classifierSource.split("\n").some(line=>line.trimStart().startsWith("import ")))
 throw Error("Unexpected D255 classifier source");
const browserClassifier=classifierSource.replace(/^export /gm,"");
const manifests=Array.from({length:128},(_,i)=>{
 const m=drawResearchHoldFilteredManifest("D219-simple-"+String(i).padStart(3,"0"));
 return {ids:m.questions.map(q=>q.id),seed:m.seed};
});
const data={
 schema:"A05-D219-UNVALIDATED-DEMO-1",
 ynVersion:"A05-D246-ISOLATED-Y-N-PREVIEW-1",
 ynClassificationVersion:"A05-D255-YN-PROVISIONAL-CLASSIFIER-1",
 mobileUiVersion:"A05-D257-ONE-SCREEN-MOBILE-V2-1",
 mobileUiRevision:"A05-D259-MOBILE-V2_1-1",
 resultUiVersion:"A05-D262-RESULT-EVIDENCE-V2_2-1",
 ynProbes:JSON.parse(readFileSync(resolve(root,"research/a05/d243-midpoint-yn-probe-bank.json"),"utf8")),
 scoringVersion:"A05-D242-POWER-1_5-RESEARCH-PREVIEW-1",
 scoringPower:1.5,
 scoringValidation:"RESEARCH_ONLY_NOT_PSYCHOMETRICALLY_VALIDATED",
 scoringBoundary:Math.pow(1/3,1.5),
 excludedCoreScoringIds:["A05-V1-31","A05-V1-32","A05-V1-36"],
 bankVersion:BANK.schema,
 bankDigest:drawResearchManifest("D219").bankDigest,
 questions:BANK.items.map(q=>({
  id:q.bank_id,axis:q.axis,stem:q.stem,left:q.left,right:q.right,family:q.proposed_semantic_family||q.axis
 })),
 manifests,
 types:TYPES.map(x=>({id:x.id,group:x.group,name:x.name,emoji:x.emoji,summary:x.summary,action:x.action})),
 groups:GROUPS.map(g=>({id:g.id,name:g.name,color:g.color})),
 axes:[
  {id:"A",name:"安定 ↔ 変化",left:"安定",right:"変化"},
  {id:"B",name:"自律 ↔ つながり",left:"自律",right:"つながり"},
  {id:"C",name:"将来達成 ↔ 現在充実",left:"将来達成",right:"現在充実"},
  {id:"D",name:"探索 ↔ 深耕",left:"探索",right:"深耕"}
 ]
};
if(BANK.items.length!==50||TYPES.length!==16||GROUPS.length!==4||manifests.some(x=>x.ids.length!==30))throw Error("Unexpected demo source shape");
for(const m of manifests){
 const present=new Set(m.ids);
 if(present.size!==30||data.excludedCoreScoringIds.some(id=>present.has(id)))throw Error("Research-scoring-held item leaked into public preview");
 for(const axis of ["A","B","C","D","E"]){
  const count=m.ids.filter(id=>BANK.items.find(x=>x.bank_id===id)?.axis===axis).length;
  if(count!==(axis==="E"?2:7))throw Error("Unexpected axis quota in D242 preview");
 }
}
if(!template.includes("__D219_DATA__")||!template.includes("__D255_ENGINE__"))throw Error("Template placeholders absent");
const output=resolve(root,"research/a05/generated/d262-result-v22-preview.html");
const safe=JSON.stringify(data).replace(/</g,"\\u003c");
const html=template.replace("__D219_DATA__",safe).replace("__D255_ENGINE__",browserClassifier);
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,html,"utf8");
console.log("D262_RESULT_V22_BUILD_OK items=50 manifests=128 types=16 bytes="+Buffer.byteLength(html));
