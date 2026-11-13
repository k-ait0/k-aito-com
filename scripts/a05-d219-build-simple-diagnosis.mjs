/**
 * A05 D219 | single-page, nonproduction 30-question demonstration.
 * Generates a fully offline static HTML from the D206 editorial bank,
 * D208 research sampler and existing draft 16-type presentation names.
 * Does not change/enable the production engine or save assessments.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
import {TYPES,GROUPS} from "../projects/kidp/life-design-lab/a05/types.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const template=readFileSync(resolve(root,"research/a05/d219-simple-diagnosis-template.html"),"utf8");
const manifests=Array.from({length:128},(_,i)=>{
 const m=drawResearchManifest("D219-simple-"+String(i).padStart(3,"0"));
 return {ids:m.questions.map(q=>q.id),seed:m.seed};
});
const data={
 schema:"A05-D219-UNVALIDATED-DEMO-1",
 bankVersion:BANK.schema,
 bankDigest:drawResearchManifest("D219").bankDigest,
 questions:BANK.items.map(q=>({
  id:q.bank_id,axis:q.axis,stem:q.stem,left:q.left,right:q.right
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
if(!template.includes("__D219_DATA__"))throw Error("Template placeholder absent");
const output=resolve(root,"research/a05/generated/d219-simple-diagnosis.html");
const safe=JSON.stringify(data).replace(/</g,"\\u003c");
const html=template.replace("__D219_DATA__",safe);
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,html,"utf8");
console.log("D219_DEMO_BUILD_OK items=50 manifests=128 types=16 bytes="+Buffer.byteLength(html));
