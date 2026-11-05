'use strict';
// DWZ preview-specific offline release gate. Run from repository root with Node.js 22.
// Usage: node scripts/dwz-preflight.cjs
// Optional local app-only: node scripts/dwz-preflight.cjs --app-only /path/to/index.html
// This does not replace scripts/local-preflight.cjs or live HTTPS/iPad Safari QA.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), vm=require('node:vm');
const only=process.argv[2]==='--app-only';
const repo=path.resolve(__dirname,'..');
const app=fs.readFileSync(only?path.resolve(process.argv[3]):path.join(repo,'lab/dwz/index.html'),'utf8');
const diag=only?null:fs.readFileSync(path.join(repo,'lab/dwz/diagnostics.html'),'utf8');
const CORE_SHA='bf36e571d499cba3173e2e934c4899edec6ef0113d028c8d9d6fa0c2de21ad78';
const results=[];
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const head=s=>s.slice(0,s.indexOf('</head>'));
const csp=s=>head(s).match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1]||'';
const noindex=s=>/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i.test(head(s));
const scriptSyntax=s=>{const m=[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];if(!m.length)return false;for(const [i,x] of m.entries())new vm.Script(x[1],{filename:'inline-'+i+'.js'});return true;};
const core=s=>{const a=s.indexOf('const registry={'),b=s.indexOf('"app.mjs":function',a);if(a<0||b<0)return {sha:'',count:0};const span=s.slice(a,b);return {sha:crypto.createHash('sha256').update(span).digest('hex'),count:[...span.matchAll(/"[^"\n]+":function\(module,exports,require\)/g)].length};};
const check=(name,fn)=>{try{if(!fn())throw Error('condition not met');results.push({name,ok:true});}catch(e){results.push({name,ok:false,detail:String(e.message||e)});}};
check('app title + description + viewport',()=>/<title>[^<]+<\/title>/.test(head(app))&&head(app).includes('name="description"')&&head(app).includes('name="viewport"'));
check('app excluded from search',()=>noindex(app)&&!head(app).includes('rel="canonical"'));
check('app unique IDs',()=>ids(app).length===new Set(ids(app)).size);
check('app fragment links',()=>[...app.matchAll(/href="#([^"]+)"/g)].every(m=>ids(app).includes(m[1])));
check('app JavaScript parses',()=>scriptSyntax(app));
check('app CSP denies network',()=>csp(app).includes("connect-src 'none'")&&csp(app).includes("form-action 'none'"));
check('app no remote JS or fetch',()=>!/<script\b[^>]*\bsrc\s*=|\bfetch\s*\(|\bXMLHttpRequest\b/.test(app));
check('research-only flags',()=>app.includes('RESEARCH_ONLY_HOLD')&&app.includes('productionApproved=false'));
check('quick / detailed inputs',()=>['dwz-mode-quick','dwz-mode-detail','dwz-run'].every(id=>ids(app).includes(id)));
check('target Core restriction',()=>/name="target"[^>]*max="3000"\s+step="100"/.test(app));
check('shared input validation',()=>app.includes('function validateSharedResearchFields()')&&app.includes('const validationError = validateSharedResearchFields();'));
check('HOLD reason cleared',()=>(app.match(/delete output\.dataset\.reason;/g)||[]).length===3);
check('save / restore / purge UI',()=>['r4-save-local','r4-restore-local','r4-purge-local'].every(id=>ids(app).includes(id)));
check('JSON file interface',()=>['r4-portfolio-import','r4-portfolio-download'].every(id=>ids(app).includes(id)));
check('real asset privacy notice',()=>app.includes('dwz-preview-warning')&&app.includes('実際の資産額'));
check('financial module count fixed',()=>core(app).count===26);
check('financial module SHA256 fixed',()=>core(app).sha===CORE_SHA);
if(diag){
 check('diagnostic metadata + noindex',()=>head(diag).includes('name="description"')&&noindex(diag));
 check('diagnostic JS parses',()=>scriptSyntax(diag));
 check('diagnostic unique IDs',()=>ids(diag).length===new Set(ids(diag)).size);
 check('diagnostic CSP frame only same-origin',()=>csp(diag).includes("frame-src 'self'")&&csp(diag).includes("connect-src 'none'"));
 check('diagnostic no outbound requests',()=>!/\bfetch\s*\(|\bXMLHttpRequest\b/.test(diag));
 check('diagnostic opt-in explicit',()=>diag.includes("document.getElementById('deep-save').checked"));
 check('diagnostic respects existing data',()=>diag.includes('既存保存データがあるため安全にスキップ'));
 check('diagnostic reloads document',()=>diag.includes('await loadFresh();\n              const reopened=getApp()'));
 check('diagnostic compares persisted value',()=>diag.includes('persisted===storedValue'));
 check('diagnostic conditional cleanup',()=>diag.includes('if(storage.getItem(keyName)===storedValue) storage.removeItem(keyName)'));
 check('diagnostic uses valid app button IDs',()=>['r4-save-local','r4-restore-local','r4-purge-local'].every(id=>ids(app).includes(id)&&diag.includes(id)));
}
for(const r of results)console.log((r.ok?'PASS':'FAIL')+' '+r.name+(r.detail?' — '+r.detail:''));
const failed=results.filter(r=>!r.ok).length;
console.log('DWZ preflight '+(results.length-failed)+'/'+results.length+' PASS; mode='+(only?'app-only':'app+diagnostic'));
if(failed)process.exitCode=1;
