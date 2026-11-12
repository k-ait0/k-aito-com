#!/usr/bin/env node
'use strict';
// Deterministically bundle the unmodified canonical 12-asset Core and private UI
// into a single HTML with no CDN, request, dynamic import, filesystem or eval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const files={
 cashflow:'lib/analytics/cashflow-core.cjs',
 portfolio:'lib/analytics/portfolio-core.cjs',
 bridge:'lib/analytics/personal-multiasset-bridge.cjs',
 client:'research/analytics/personal-lab/multiasset.client.js',
 template:'research/analytics/personal-lab/multiasset.template.html'
};
const output='research/analytics/personal-lab/multiasset.html';
const read=key=>fs.readFileSync(path.join(root,files[key]),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function wrap(name,source,requires){
 const imports=Object.entries(requires).map(([name,variable])=>
   "if(id==="+JSON.stringify(name)+")return "+variable+";").join('\n');
 return 'const '+name+'=(function(){const module={exports:{}};\n'+
   '(function(module,exports,require){\n'+source+'\n})'+
   '(module,module.exports,function(id){'+imports+'\nthrow Error("Unavailable bundled module: "+id);});\n'+
   'return module.exports;\n})();\n';
}
function build(){
 const originals=Object.fromEntries(Object.keys(files).map(k=>[k,read(k)]));
 const bundled=[
  '(function(){\n"use strict";\n',
  '// Build inputs SHA256: '+Object.keys(files).map(k=>k+'='+sha(originals[k])).join(' '),
  wrap('coreCashflow',originals.cashflow,{}),
  wrap('corePortfolio',originals.portfolio,{'./cashflow-core.cjs':'coreCashflow'}),
  wrap('coreBridge',originals.bridge,{'./portfolio-core.cjs':'corePortfolio','./cashflow-core.cjs':'coreCashflow'}),
  originals.client,
  '\n})();\n'
 ].join('\n');
 if(/<\/script/i.test(bundled))throw Error('Unsafe script closing sequence in bundled code');
 const placeholder='/* __KAITO_EMBEDDED_CANONICAL_CORE__ */';
 if(originals.template.split(placeholder).length!==2)throw Error('Exactly one bundle placeholder required');
 const html=originals.template.replace(placeholder,bundled);
 for(const term of ["default-src 'none'","connect-src 'none'","object-src 'none'","script-src 'unsafe-inline'"]){
  if(!html.includes(term))throw Error('Missing strict offline CSP '+term);
 }
 if(/<script[^>]+src\s*=|<link[^>]+href\s*=|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/i.test(html))
  throw Error('Unexpected network request code / external resources');
 if(!html.includes('coreBridge.simulatePersonalMultiAsset')||!html.includes('source_rights_approved:false'))
  throw Error('Missing canonical market/Core gate');
 return html;
}
function main(args){
 if(args.length!==1||!['--build','--verify','--hash'].includes(args[0]))
  throw Error('Use --build, --verify or --hash');
 const html=build(),file=path.join(root,output);
 if(args[0]==='--build')fs.writeFileSync(file,html,'utf8');
 if(args[0]==='--verify'&&(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==html))
  throw Error('Generated offline HTML is missing/stale; run --build');
 console.log('PASS_MULTI_ASSET_OFFLINE_BUILD',JSON.stringify({path:output,
  html_sha256:sha(Buffer.from(html)),bytes:Buffer.byteLength(html,'utf8'),
  build_or_verified:args[0],core_source:'UNMODIFIED_V07_CORE_VENDORED_ON_RESEARCH_BRANCH',
  releases_approved:false,external_requests:0}));
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('MULTI_ASSET_BUILD_FAILED '+e.message);process.exitCode=1}
module.exports={build};
