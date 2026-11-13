/**
 * A05 review access server. Private-by-default HTTP Basic authentication.
 * The questionnaire is never served until both username and secret pass.
 * No analytics, uploads, cookies, or submitted-answer persistence.
 */
import http from "node:http";
import {readFileSync} from "node:fs";
import {createHash,timingSafeEqual} from "node:crypto";
const simple=readFileSync(new URL("../../research/a05/generated/d219-simple-diagnosis.html",import.meta.url));
const research=readFileSync(new URL("../../research/a05/generated/d210-research-questionnaire.html",import.meta.url));
const username=process.env.A05_PREVIEW_USER||"review";
const secret=process.env.A05_PREVIEW_SECRET;
const port=Number(process.env.PORT||3000);
if(typeof secret!=="string"||secret.length<24||!/^[A-Za-z0-9_-]+$/.test(secret)){
 console.error("Missing or invalid A05_PREVIEW_SECRET: refusing to start private preview");
 process.exit(78);
}
if(!Number.isInteger(port)||port<0||port>65535)process.exit(78);
const sha=x=>createHash("sha256").update(x).digest();
const expected=sha(username+":"+secret);
const genericHeaders={
 "Cache-Control":"private, no-store, max-age=0, must-revalidate",
 "Pragma":"no-cache",
 "X-Robots-Tag":"noindex, nofollow, noarchive, nosnippet",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "X-Frame-Options":"DENY",
 "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
 "Cross-Origin-Resource-Policy":"same-origin"
};
function authorized(auth){
 if(typeof auth!=="string"||!auth.startsWith("Basic ")||auth.length>400)return false;
 try{
  const token=auth.slice(6);
  if(!/^[A-Za-z0-9+/=]+$/.test(token))return false;
  const raw=Buffer.from(token,"base64").toString("utf8");
  return timingSafeEqual(sha(raw),expected);
 }catch{return false;}
}
function send(res,status,message,additional={}){
 res.writeHead(status,{"Content-Type":"text/plain; charset=utf-8",...genericHeaders,...additional});
 res.end(message);
}
const server=http.createServer((req,res)=>{
 if(!["GET","HEAD"].includes(req.method)){send(res,405,"Method Not Allowed",{"Allow":"GET, HEAD"});return;}
 if(req.url==="/robots.txt"){send(res,200,"User-agent: *\nDisallow: /\n");return;}
 if(!authorized(req.headers.authorization)){
  send(res,401,"Authentication required",{"WWW-Authenticate":'Basic realm="A05 Research Review", charset="UTF-8"'});return;
 }
 const body=(req.url==="/"||req.url==="/index.html"||req.url==="/diagnosis")?simple:
            (req.url==="/research"||req.url==="/research/")?research:null;
 if(!body){send(res,404,"Not found");return;}
 res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Length":String(body.byteLength),...genericHeaders});
 res.end(req.method==="HEAD"?undefined:body);
});
server.listen(port,"0.0.0.0",()=>console.log("A05_PRIVATE_PREVIEW_READY port="+server.address().port));
