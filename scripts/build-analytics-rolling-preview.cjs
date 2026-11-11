'use strict';
/** Offline self-contained research preview generator. No fetch/telemetry. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const names=['cashflow-core.cjs','lifecycle-core.cjs','rolling-lifecycle.cjs','rolling-plan-compare.cjs'];
let bundle='const __modules=Object.create(null);\nfunction __require(name){if(!Object.hasOwn(__modules,name))throw Error("Module not bundled: "+name);return __modules[name].exports;}\n';
for(const name of names){
 const file=fs.readFileSync(path.join(root,'lib/analytics',name),'utf8');
 const key=JSON.stringify('./'+name);
 bundle+='__modules['+key+']={exports:{}};\n';
 bundle+='(function(module,exports,require){\n'+file+'\n})(__modules['+key+'],__modules['+key+'].exports,__require);\n';
}
const app=fs.readFileSync(path.join(root,'lab/analytics/rolling-preview.app.js'),'utf8');
const template=fs.readFileSync(path.join(root,'lab/analytics/rolling-preview.template.html'),'utf8');
const placeholder='/*__ANALYTICS_ROLLING_BUNDLE__*/';
if(template.split(placeholder).length!==2)throw Error('Template must have exactly one bundle placeholder');
const html=template.replace(placeholder,bundle+'\n'+app);
if(/\bfetch\s*\(|\bXMLHttpRequest\b|localStorage|sessionStorage|<script\s+src=/.test(html))throw Error('Forbidden network or storage pattern');
const output=path.join(root,'lab/analytics/rolling-preview.html');
fs.writeFileSync(output,html);
console.log('Wrote '+output+' ('+Buffer.byteLength(html)+' bytes; research only)');
