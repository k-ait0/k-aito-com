"use strict";
/**
 * MONO BASE v3.4: local-first, read-only fast QA.
 *
 *   node scripts/mono-base-local-qa.cjs
 *
 * No GitHub Actions, Playwright install, PR update or deployment.
 * The public-release rehearsal changes a disposable OS temp fixture only.
 * Manual full browser / 3D QA and live XServer checks remain separate gates.
 */
const cp=require("node:child_process");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const cases=[
  ["Public route allowlist","scripts/test-public-sitemap-routes.cjs"],
  ["Preview/public SEO consistency","scripts/test-mono-base-preview.cjs"],
  ["Generator scope isolation","scripts/test-mono-base-generator-isolation.cjs"],
  ["Public-mode rehearsal in temporary files","scripts/test-mono-base-publication-fixture.cjs"],
  ["KAITO site-shell regression","scripts/test-site-shell.cjs"],
  ["KAITO breadcrumb regression","scripts/test-site-breadcrumbs.cjs"],
  ["KAITO search UI regression","scripts/test-site-search-ui.cjs"],
  ["KAITO project search regression","scripts/test-project-search.cjs"],
  ["Whole-site static references","scripts/site-static-check.cjs"],
  ["Published URL SEO audit","scripts/audit-seo.cjs"]
];
function invoke(binary,args,label){
  console.log("\n[MONO BASE LOCAL QA] "+label);
  const r=cp.spawnSync(binary,args,{cwd:root,stdio:"inherit",timeout:180000,
    windowsHide:true,env:process.env,shell:false});
  if(r.error||r.status!==0||r.signal){
    console.error("FAIL "+label+": "+(r.error?.message||r.signal||"exit "+r.status));
    return false;
  }
  console.log("PASS "+label);
  return true;
}
function findPython(){
  const candidates=process.env.PYTHON?[[process.env.PYTHON,[]]]:[];
  candidates.push(["python",[]],["python3",[]]);
  if(process.platform==="win32")candidates.push(["py",["-3"]]);
  for(const [bin,prefix] of candidates){
    const r=cp.spawnSync(bin,[...prefix,"--version"],{encoding:"utf8",timeout:5000,
      windowsHide:true,shell:false});
    if(!r.error&&r.status===0)return {bin,prefix};
  }
  return null;
}
let passed=0,failed=0;
for(const [label,script] of cases){
  if(invoke(process.execPath,[path.join(root,script)],label))passed++;
  else failed++;
}
const python=findPython();
if(python){
  if(invoke(python.bin,[...python.prefix,path.join(root,
    "scripts/verify-mono-base-original-assets.py"),"mono-base"],
    "13 original JPEG SHA-256 file checks"))passed++;
  else failed++;
}else{
  console.error("\nFAIL Original image SHA-256 check: Python was not found.");
  failed++;
}
console.log("\nMONO BASE LOCAL QA RESULT: "+passed+"/"+
  (passed+failed)+" checks passed; "+failed+" failed.");
console.log("No GitHub Actions were used. Browser/3D and live XServer QA must be run separately.");
process.exitCode=failed?1:0;
