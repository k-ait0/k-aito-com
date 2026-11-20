/**
 * D270 HTTP sandbox adapter. Factory only; cannot start a listener.
 * No production auth implementation. No real respondents or consent.
 */
import {
 d270Accept,d270Delete,d270Rebuild,d270Metrics,
 d270Audit,d270AuditCounts,D270_VERSION
} from "./a05-d270-classifier-db.mjs";
import {timingSafeEqual} from "node:crypto";
const roles=["ingestion-service","reviewer","aggregator","security-admin"];
const constant=(a,b)=>{
 if(typeof a!=="string"||typeof b!=="string")return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);
};
const error=(status,message)=>Object.assign(new Error(message),{status});
function reply(res,status,body){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8",
  "cache-control":"no-store","x-content-type-options":"nosniff",
  "content-security-policy":"default-src 'none'","referrer-policy":"no-referrer"});
 res.end(JSON.stringify(body));
}
async function json(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"]||""))
  throw error(415,"application/json only");
 const chunks=[];let bytes=0;
 for await(const chunk of req){
  bytes+=chunk.length;
  if(bytes>65536)throw error(413,"Over 64 KB synthetic payload limit");
  chunks.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
 catch{throw error(400,"Invalid JSON");}
}
export function createD270LoopbackHandler({pool,roleTokens,clock=()=>new Date()}){
 if(process.env.A05_D270_SANDBOX_MODE!=="synthetic-ephemeral-ci"||
  process.env.PGDATABASE!=="a05_d270_ci"||process.env.PGHOST!=="127.0.0.1")
  throw Error("D270 must run only in disposable loopback CI sandbox");
 if(!pool||!roleTokens||roles.some(role=>typeof roleTokens[role]!=="string"||
  roleTokens[role].length<40)||new Set(Object.values(roleTokens)).size!==roles.length)
  throw Error("D270 requires unique ephemeral role secrets");
 return async(req,res)=>{
  const endpoint=req.url?.split("?")[0]||"";
  const role=roles.find(r=>constant(req.headers.authorization,"Bearer "+roleTokens[r]))||"anonymous";
  const denied=async()=>{
   await d270Audit(pool,role,"AUTH_DENIED","DENIED");
   reply(res,role==="anonymous"?401:403,{error:"Access denied"});
  };
  try{
   if(req.method==="GET"&&endpoint==="/health"){
    reply(res,200,{synthetic:true,version:D270_VERSION});return;
   }
   if(req.method==="POST"&&endpoint==="/v1/d270-synthetic/submissions"){
    if(role!=="ingestion-service"){await denied();return;}
    const result=await d270Accept(pool,await json(req),clock());
    reply(res,result.status,result.body);return;
   }
   const del=endpoint.match(/^\/v1\/d270-synthetic\/submissions\/([a-f0-9-]+)$/i);
   if(req.method==="DELETE"&&del){
    const ok=await d270Delete(pool,del[1],req.headers["x-deletion-token"]);
    if(ok){res.writeHead(204,{"cache-control":"no-store"});res.end();}
    else reply(res,404,{error:"Not found"});
    return;
   }
   if(req.method==="GET"&&endpoint==="/v1/d270-synthetic/admin/metrics"){
    if(role!=="reviewer"){await denied();return;}
    const values=await d270Metrics(pool);
    await d270Audit(pool,role,"METRICS_READ","OK");
    reply(res,200,values);return;
   }
   if(req.method==="POST"&&endpoint==="/v1/d270-synthetic/admin/rebuild"){
    if(role!=="aggregator"){await denied();return;}
    reply(res,200,await d270Rebuild(pool));return;
   }
   if(req.method==="GET"&&endpoint==="/v1/d270-synthetic/admin/audit"){
    if(role!=="security-admin"){await denied();return;}
    await d270Audit(pool,role,"AUDIT_READ","OK");
    reply(res,200,await d270AuditCounts(pool));return;
   }
   reply(res,404,{error:"Unrecognized synthetic path"});
  }catch(e){
   // Only validation codes are public; SQL stack traces, secrets, and payload
   // contents are deliberately never included in a response.
   reply(res,e.status||500,{error:e.status?e.message:"Sandbox internal error"});
  }
 };
}
