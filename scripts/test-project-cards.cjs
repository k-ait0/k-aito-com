"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"kaito-project-card-test-"));
const files=["data/project-card-status.v1.json","index.html","projects/index.html","scripts/sync-project-cards.cjs"];
try{
  for(const name of files){
    const dst=path.join(temp,name);fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(path.join(root,name),dst);
  }
  const jsonPath=path.join(temp,"data/project-card-status.v1.json");
  const registry=JSON.parse(fs.readFileSync(jsonPath,"utf8"));
  registry.projects.find(p=>p.id==="tabi-route").accessJa="未公開・検証待ち";
  registry.projects.find(p=>p.id==="digital-storage").stage="MAINTAINING";
  fs.writeFileSync(jsonPath,JSON.stringify(registry,null,2));
  const run=()=>cp.execFileSync(process.execPath,[path.join(temp,"scripts/sync-project-cards.cjs")],{cwd:temp,encoding:"utf8"});
  const result=run();
  assert.match(result,/2 files updated/);
  for(const name of ["index.html","projects/index.html"]){
    const page=fs.readFileSync(path.join(temp,name),"utf8");
    assert.match(page,/data-project-access="tabi-route">未公開・検証待ち/);
    assert.match(page,/data-project-stage="digital-storage">MAINTAINING/);
    for(const field of ["stage","access","action"]){
      assert.equal((page.match(new RegExp("data-project-"+field+'="',"g"))||[]).length,4,name+" "+field);
    }
  }
  assert.match(run(),/0 files updated/);
  console.log("PASS: four project cards share one stage/access/action registry; repeated sync unchanged");
}finally{fs.rmSync(temp,{recursive:true,force:true});}
