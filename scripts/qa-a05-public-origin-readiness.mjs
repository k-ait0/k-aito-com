/**
 * Read-only deployment readiness check for A05.
 * Run local: node scripts/qa-a05-public-origin-readiness.mjs
 * Run after publish: A05_EXPECT_LIVE=1 node scripts/qa-a05-public-origin-readiness.mjs
 * Does not log or transmit personal answers. It only GETs public static assets.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin='https://k-aito.com';
const prefix='/projects/kidp/life-design-lab/a05/';
const expectLive=process.env.A05_EXPECT_LIVE==='1';
async function get(url) {
 const res=await fetch(url,{redirect:'follow',headers:{'Accept-Encoding':'identity'},signal:AbortSignal.timeout(15000)});
 if(new URL(res.url).origin!==origin)throw new Error('Unexpected cross-origin redirect: '+res.url);
 const body=Buffer.from(await res.arrayBuffer());
 if(body.length>2*1024*1024)throw new Error('Unexpected oversized response: '+url);
 return {res,body};
}
function sha(data){return createHash('sha256').update(data).digest('hex')}
const home=await get(origin+'/');
assert.equal(home.res.status,200,'Main K. Aito homepage must be reachable via HTTPS');
console.log('MAIN HTTPS',home.res.status,home.res.headers.get('content-type'),home.res.url);
const root=await get(origin+prefix);
console.log('A05 beta path',root.res.status,root.res.url,JSON.stringify({
  csp:root.res.headers.get('content-security-policy'),
  nosniff:root.res.headers.get('x-content-type-options'),
  robots:root.res.headers.get('x-robots-tag'),
  frame:root.res.headers.get('x-frame-options'),
  cache:root.res.headers.get('cache-control')
}));
if(!expectLive){
 console.log('Pre-release: A05 path recorded, no deployment/availability claim.');
 process.exit(0);
}
assert.equal(root.res.status,200,'A05 live index must be HTTP 200');
assert.match(root.res.headers.get('content-type')||'',/text\/html/i);
assert.match(root.body.toString('utf8'),/name="robots" content="noindex,nofollow"/);
assert.match(root.body.toString('utf8'),/http-equiv="Content-Security-Policy"/);
assert.equal(root.res.headers.get('x-content-type-options'),'nosniff');
assert.equal(root.res.headers.get('x-frame-options'),'DENY');
assert.match(root.res.headers.get('x-robots-tag')||'',/noindex/i);
assert.match(root.res.headers.get('content-security-policy')||'',/connect-src 'none'/);
const files=['index.html','app.mjs','report.mjs','engine.mjs','types.mjs','questions.mjs','storage.mjs','export.mjs','format.mjs','backup-inspect.mjs','restore-review.mjs','report.css','style.css'];
for(const name of files) {
 const got=await get(origin+prefix+name);
 assert.equal(got.res.status,200,name+' unavailable');
 const local=readFileSync(new URL('../projects/kidp/life-design-lab/a05/'+name,import.meta.url));
 assert.equal(sha(got.body),sha(local),name+' live bytes differ from approved candidate');
 if(name.endsWith('.mjs'))assert.match(got.res.headers.get('content-type')||'',/javascript/i,name+' wrong ES module MIME');
 console.log('MATCH',name,got.body.length,got.res.headers.get('content-type'));
}
console.log('PASS A05 real HTTPS deployment: all 13 assets byte-matched, CSP/noindex/nosniff/ESM MIME validated.');
