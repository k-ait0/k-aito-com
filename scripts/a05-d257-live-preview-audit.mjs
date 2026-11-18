/**
 * D257: verify that new v2-only Pages URL serves exactly the tested HTML.
 * Preserve approved Ver.1 root and /preview/yn/ as independent baselines.
 * GitHub Actions publication verifier. No assessment data.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const file=process.argv[2];
if(!file)throw Error("Usage: node scripts/a05-d257-live-preview-audit.mjs <tested-v2-html>");
const expected=readFileSync(file);
const digest=buf=>createHash("sha256").update(buf).digest("hex");
const expectedDigest=digest(expected);
const url="https://k-ait0.github.io/k-aito-com/preview/yn-v2/";
let last="";
for(let attempt=1;attempt<=15;attempt++){
 try{
  const response=await fetch(url+"?a05-v2-qa="+attempt,{redirect:"error",headers:{"Cache-Control":"no-cache"}});
  if(response.status!==200)throw Error("HTTP "+response.status);
  if(!response.headers.get("content-type")?.includes("text/html"))
   throw Error("Wrong Content-Type: "+response.headers.get("content-type"));
  const actual=Buffer.from(await response.arrayBuffer());
  if(actual.equals(expected)){
   console.log("A05_D257_LIVE_VERIFIED "+JSON.stringify({
    status:"PASS",attempt,bytes:actual.length,sha256:expectedDigest,url
   }));
   process.exit(0);
  }
  last="SHA256 "+digest(actual)+" != "+expectedDigest;
 }catch(e){last=String(e);}
 if(attempt!==15)await new Promise(resolve=>setTimeout(resolve,3000));
}
throw Error("D257 live v2 HTML mismatch after 15 attempts: "+last);
