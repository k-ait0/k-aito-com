'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const lib=path.join(root,'lib','analytics');
const names=['cashflow-core.cjs','portfolio-core.cjs','portfolio-ledger-audit.cjs','portfolio-input-audit.cjs','rolling-portfolio-lifecycle.cjs','rolling-portfolio-cpi.cjs','offline-preview-v032.cjs'];
function compile(){
  const mods=names.map(name=>{
    const source=fs.readFileSync(path.join(lib,name),'utf8');
    const imports=[...source.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);
    for(const req of imports){if(!req.startsWith('./')||!names.includes(req.slice(2)))throw Error('Unsupported external or unspecified module '+req+' in '+name);}
    if(source.includes('</script>'))throw Error('Inline script terminator in '+name);
    return JSON.stringify(name)+':function(require,module,exports){\n'+source+'\n}';
  }).join(',\n');
  const browser=fs.readFileSync(path.join(root,'research/analytics/offline-preview-v032.browser.js'),'utf8');
  if(browser.includes('</script>'))throw Error('Inline script terminator');
  const bundle=`(function(){\n'use strict';\nconst factories={${mods}};\nconst cache=Object.create(null);\nfunction load(name){const key=name.replace(/^\\.\\//,'');if(!Object.prototype.hasOwnProperty.call(factories,key))throw Error('Unknown local module '+key);if(cache[key])return cache[key].exports;const m={exports:{}};cache[key]=m;factories[key](load,m,m.exports);return m.exports;}\nwindow.KAitoAnalyticsPreviewCore=load('offline-preview-v032.cjs');\n})();\n`+browser;
  const css=fs.readFileSync(path.join(root,'research/analytics/offline-preview-v032.css'),'utf8');
  const hash=x=>crypto.createHash('sha256').update(x,'utf8').digest('base64');
  const csp=`default-src 'none'; script-src 'sha256-${hash(bundle)}'; style-src 'sha256-${hash(css)}'; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const template=fs.readFileSync(path.join(root,'research/analytics/offline-preview-v032.template.html'),'utf8');
  for(const needle of ['__CSP__','__CSS__','__JS__'])if(!template.includes(needle))throw Error('Template token missing '+needle);
  const html=template.replace('__CSP__',csp).replace('__CSS__',css).replace('__JS__',bundle);
  if(/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g,''))){/* No remote resources; SVG namespace string is not a request. */}
  return {html,bundle,css,csp,sha256:crypto.createHash('sha256').update(html).digest('hex')};
}
if(require.main===module){
 const file=process.argv[2]||path.join(root,'research/analytics/K_Aito_Analytics_Offline_Preview_v032.html');
 const x=compile();fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,x.html);
 process.stdout.write(JSON.stringify({file,bytes:Buffer.byteLength(x.html),sha256:x.sha256,csp:x.csp})+'\n');
}
module.exports={compile};
