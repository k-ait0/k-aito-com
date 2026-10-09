"use strict";
/* Diagnosis only. Always exits 0; it cannot certify production deployment.
 * Reports DNS, TCP/443 and HTTPS reachability independently, including controls.
 */
const dns=require("node:dns").promises;
const net=require("node:net");
const hosts=[
  ["KAITO","k-aito.com"],
  ["KAITO WWW","www.k-aito.com"],
  ["FINOWA","finowa.jp"],
  ["CONTROL GITHUB","github.com"],
  ["CONTROL EXAMPLE","example.com"]
];
const msg=e=>[e?.code,e?.cause?.code,e?.message].filter(Boolean).join(" | ").slice(0,260);
async function lookup(host){
  try{
    const all=await dns.lookup(host,{all:true});
    return all.map(x=>x.address+" IPv"+x.family).join(", ")||"NO_RECORDS";
  }catch(e){return "DNS_ERROR "+msg(e);}
}
async function socket(host){
  return new Promise(resolve=>{
    const conn=net.createConnection({host,port:443,timeout:6500});
    let complete=false;
    const done=(message)=>{if(complete)return;complete=true;conn.destroy();resolve(message);};
    conn.once("connect",()=>done("TCP_CONNECTED "+conn.remoteAddress));
    conn.once("timeout",()=>done("TCP_TIMEOUT"));
    conn.once("error",e=>done("TCP_ERROR "+msg(e)));
  });
}
async function http(host){
  try{
    const response=await fetch("https://"+host+"/",{method:"HEAD",redirect:"follow",signal:AbortSignal.timeout(8000)});
    await response.body?.cancel();
    return "HTTPS_RESPONSE "+response.status+" "+response.url;
  }catch(e){return "HTTPS_ERROR "+msg(e);}
}
(async()=>{
  console.log("KAITO ORIGIN NETWORK DIAGNOSTIC | GitHub runner");
  for(const [label,host] of hosts){
    const dnsResult=await lookup(host);
    const tcpResult=await socket(host);
    const httpResult=await http(host);
    console.log(label+" | "+host+" | "+dnsResult+" | "+tcpResult+" | "+httpResult);
  }
  console.log("DIAGNOSIS COMPLETE (informational only; not a successful deployment check)");
})().catch(e=>{console.error("DIAGNOSTIC ERROR "+msg(e));process.exitCode=1;});
