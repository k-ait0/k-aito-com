/**
 * A05 public, NONPRODUCTION preview. No authentication is required.
 * Answers and notes never leave the client-side HTML. No POST endpoint,
 * analytics, cookies, database, or persistent storage on this server.
 * Deployment is separate from the public k-aito.com assessment.
 */
import http from "node:http";
import {readFileSync} from "node:fs";
const simple=readFileSync(new URL("../../research/a05/generated/d219-simple-diagnosis.html",import.meta.url));
const research=readFileSync(new URL("../../research/a05/generated/d210-research-questionnaire.html",import.meta.url));
const port=Number(process.env.PORT??8080);
if(!Number.isInteger(port)||port<0||port>65535)throw Error("Invalid PORT");
const headers={
 "Cache-Control":"no-store, max-age=0, must-revalidate",
 "Pragma":"no-cache",
 "X-Robots-Tag":"noindex, nofollow, noarchive, nosnippet",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "X-Frame-Options":"DENY",
 "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
 "Cross-Origin-Resource-Policy":"same-origin"
};
function reply(res,status,data,extra={}){
 res.writeHead(status,{"Content-Type":"text/plain; charset=utf-8",...headers,...extra});
 res.end(data);
}
const server=http.createServer((req,res)=>{
 if(req.method!=="GET"&&req.method!=="HEAD"){
  reply(res,405,"Method Not Allowed",{"Allow":"GET, HEAD"});return;
 }
 let path;
 try{path=new URL(req.url,"http://preview.local").pathname;}catch{reply(res,400,"Invalid URL");return;}
 if(path==="/robots.txt"){reply(res,200,"User-agent: *\nDisallow: /\n");return;}
 if(path==="/health"){reply(res,200,"ok");return;}
 const body=["/","/index.html","/diagnosis","/diagnosis/"].includes(path)?simple:
  ["/research","/research/"].includes(path)?research:null;
 if(!body){reply(res,404,"Page not found. Open / for the 30-question demo.");return;}
 res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Length":String(body.byteLength),...headers});
 res.end(req.method==="HEAD"?undefined:body);
});
server.listen(port,"0.0.0.0",()=>console.log("A05_PUBLIC_PREVIEW_READY port="+server.address().port));
