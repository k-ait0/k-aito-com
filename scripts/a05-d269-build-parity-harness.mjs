/**
 * D269 browser probe, only in an untracked local HTML output.
 * Run D262 builder first; inject a read-only test hook without editing UI source.
 * No GitHub Pages publish and no network connection permitted.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const original=readFileSync(resolve(root,"research/a05/generated/d262-result-v22-preview.html"),"utf8");
const match=/\$\("restart"\)\.addEventListener\("click",start\);[\t\r\n ]*\}\)\(\);/g;
if([...original.matchAll(match)].length!==1)throw Error("D269: browser source anchor drift; inspect D262 rather than changing it");
if(!original.includes("A05-D255-YN-PROVISIONAL-CLASSIFIER-1")||
   !original.includes("A05-D262-RESULT-EVIDENCE-V2_2-1"))
 throw Error("D269: missing expected D255/D262 browser contract");
const hook=` $("restart").addEventListener("click",start);
 // D269-only hook; injected into a locally generated harness, NEVER published.
 Object.defineProperty(window,"__A05_D269_PARITY_TEST__",{configurable:false,writable:false,
  value:Object.freeze({
   harnessOnly:true,
   analyze(input){
    if(!input||!Number.isInteger(input.manifestIndex)||
       input.manifestIndex<0||input.manifestIndex>=data.manifests.length)
      throw Error("D269 invalid manifest");
    if(!Array.isArray(input.values)||input.values.length!==30||
       !Array.isArray(input.skipKinds)||input.skipKinds.length!==30)
      throw Error("D269 expected exactly 30 answers");
    const m=data.manifests[input.manifestIndex];
    manifest={ids:m.ids.slice(),seed:m.seed};initialCount=30;position=29;
    answers={};skipReasons={};
    let unknown=0,notApplicable=0;
    for(let i=0;i<30;i++){
     const id=manifest.ids[i],v=input.values[i],kind=input.skipKinds[i];
     if(v===null){
      if(kind!=="UNKNOWN"&&kind!=="NOT_APPLICABLE")throw Error("D269 invalid skip reason");
      skipReasons[id]=kind;
      if(kind==="UNKNOWN")unknown++;else notApplicable++;
     }else if(!Number.isInteger(v)||v<1||v>7||kind!==null){
      throw Error("D269 invalid response");
     }
     answers[id]=v;
    }
    ynState=structuredClone(input.ynState??{responses:{},reasons:{}});
    const stats=collectStats();
    const candidateIds=candidateTypes(stats).map(t=>t.id);
    const yn=d255Analyze(stats,ynState,data.ynProbes);
    const next=d255NextBatch(stats,ynState,data.ynProbes);
    return {
     manifestIndex:input.manifestIndex,ids:manifest.ids.slice(),
     answerTotals:{answered:30-unknown-notApplicable,unknown,notApplicable},
     stats,candidateIds,yn,next
    };
   }
  })
 });
 })();`;
const html=original.replace(match,hook);
const out=resolve(root,"research/a05/generated/d269-parity-local-only.html");
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,html,"utf8");
console.log("A05_D269_LOCAL_BROWSER_HARNESS_BUILT "+JSON.stringify({
 bytes:Buffer.byteLength(html),published:false,source:"D262",d255CopiedUnmodified:true
}));
