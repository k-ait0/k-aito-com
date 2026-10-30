/**
 * Run A05 R1 native checks locally (no GitHub Actions).
 *
 * node scripts/run-a05-r1-local-preflight.cjs
 * node scripts/run-a05-r1-local-preflight.cjs --browser
 *
 * Browser mode requires local Playwright and Chrome. The offline HTML remains
 * non-public and carries only provisional editorial character data.
 */
const {spawnSync}=require("node:child_process");
const processArgs=process.argv.slice(2);
if(processArgs.some(x=>x!=="--browser")) {
 console.error("Unknown options. Supported: --browser");
 process.exit(2);
}
const steps=[
 ["S4 v0.4 generator parity",process.execPath,["--test","scripts/test-a05-r1-s4-contextual112-v04.mjs"]],
 ["S4 v0.5 eight alternates",process.execPath,["--test","scripts/test-a05-r1-s4-v05-alternates.mjs"]],
 ["S4 v0.5 full 112 candidate integrity",process.execPath,["--test","scripts/test-a05-r1-s4-v05-all112.mjs"]],
 ["S4 v0.5 deterministic generation",process.execPath,["scripts/build-a05-r1-s4-v05-all112.mjs"]],
 ["S4 v0.5 generated-file reproducibility","git",["diff","--exit-code","--","docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json"]],
 ["S5 static UI contract",process.execPath,["--test","scripts/test-a05-r1-s5-preview.mjs"]],
 ["S5 standalone builder",process.execPath,["scripts/build-a05-r1-s5-offline.mjs"]],
 ["S5 standalone integrity",process.execPath,["--test","scripts/test-a05-r1-s5-offline.mjs"]],
 ["S5 actual controller + simulated DOM 256-pair execution",process.execPath,["--test","scripts/test-a05-r1-s5-controller-runtime.mjs"]],
 ["S5 generated-file reproducibility","git",["diff","--exit-code","--","projects/kidp/life-design-lab/a05/r1-s5-offline.html"]]
];
if(processArgs.includes("--browser")) {
 steps.push(["S5 static server Chrome",process.execPath,["scripts/qa_a05_r1_s5_browser.cjs"]]); // static server must already run on port 8765
 steps.push(["S5 standalone file Chrome",process.execPath,["scripts/qa_a05_r1_s5_offline_browser.cjs"]]);
}
let fails=0;
for(const [label,command,args] of steps){
 console.log("\n== "+label+" ==");
 const result=spawnSync(command,args,{stdio:"inherit",cwd:process.cwd(),encoding:"utf8"});
 if(result.error || result.status!==0){
  fails++;
  console.error("FAILED:",label,"exit",result.status, result.error?.message||"");
 }
}
console.log("\nA05 R1 local preflight:",steps.length-fails+"/"+steps.length,"steps passed");
if(!processArgs.includes("--browser"))console.log("Chrome checks NOT EXECUTED. Start local server and pass --browser when ready.");
if(fails)process.exitCode=1;
