/** D210 offline research-only questionnaire builder. No server, no data collection.
 * Run from repository root:
 *   node scripts/a05-d210-build-offline-form.mjs
 * Output: research/a05/generated/d210-research-questionnaire.html
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {BANK,drawResearchManifest} from "./a05-d208-research-sampler.mjs";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const template=readFileSync(resolve(root,"research/a05/d210-research-template.html"),"utf8");
const chosen=drawResearchManifest("D210-template-check");
const data={
 schema:"A05-D210-RESEARCH-FORM-DATA-1",mode:"RESEARCH_ONLY",
 bankDigest:chosen.bankDigest,bankVersion:BANK.schema,
 questions:BANK.items.map(x=>({id:x.bank_id,axis:x.axis,stem:x.stem,left:x.left,right:x.right,family:x.proposed_semantic_family||null})),
 previewManifests:Array.from({length:128},(_,i)=>{
   const m=drawResearchManifest("D210-ux-"+String(i).padStart(3,"0"));
   return {seed:m.seed,checksum:m.checksum,ids:m.questions.map(q=>q.id)};
 }),
 probes:[
  {id:"B_AUTONOMY",axis:"B",text:"重要な選択では、最終的に自分で決められることを大切にしたい"},
  {id:"B_CONNECTION",axis:"B",text:"重要な選択では、身近な人と考えを共有できることを大切にしたい"},
  {id:"C_FUTURE",axis:"C",text:"将来の成果に向けて準備を重ねること自体を大切にしたい"},
  {id:"C_PRESENT",axis:"C",text:"いま過ごす時間が充実していること自体を大切にしたい"}
 ]
};
if(data.questions.length!==50||data.previewManifests.length!==128)throw Error("Bad source count");
const safeJSON=JSON.stringify(data).replace(/</g,"\\u003c");
if(!template.includes("__D210_EMBEDDED_DATA__"))throw Error("Data placeholder absent");
const result=template.replace("__D210_EMBEDDED_DATA__",safeJSON);
const output=resolve(root,"research/a05/generated/d210-research-questionnaire.html");
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,result,"utf8");
console.log("D210 BUILD OK","items=50", "ux_manifests=128","size="+Buffer.byteLength(result), "path="+output);
