"use strict";
/* Project-card stage and access labels are synchronized into BOTH KAITO pages.
 * This keeps no-JavaScript fallback working; visuals and descriptions remain hand-designed.
 * Run: node scripts/sync-project-cards.cjs
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"data/project-card-status.v1.json"),"utf8"));
if(manifest.version!==1||!Array.isArray(manifest.projects)||manifest.projects.length!==4){
  throw new Error("Unexpected project status registry shape");
}
const byId=new Map();
for(const row of manifest.projects){
  if(!/^[a-z][a-z0-9-]+$/.test(row.id)||byId.has(row.id)||
     !/^[A-Z]+$/.test(row.stage)||!["INTERNAL","EXTERNAL","PREPARING","PROTOTYPE"].includes(row.access)||
     !row.stageJa||!row.accessJa||!row.action){
    throw new Error("Invalid project card metadata: "+JSON.stringify(row));
  }
  byId.set(row.id,row);
}
const files=["index.html","projects/index.html"];
const labels={stage:p=>p.stage,access:p=>p.accessJa,action:p=>p.action+(p.access==="EXTERNAL"?" ↗":p.access==="PREPARING"?"":" →")};
let changed=0;
for(const file of files){
  const full=path.join(root,file);
  let html=fs.readFileSync(full,"utf8");
  const before=html;
  for(const [field,resolve] of Object.entries(labels)){
    const seen=new Set();
    const pattern=new RegExp('(<(span|b)[^>]*\\bdata-project-'+field+'="([^"]+)"[^>]*>)([^<]*)(<\\/\\2>)',"g");
    html=html.replace(pattern,(_,open,tag,id,old,close)=>{
      const item=byId.get(id);
      if(!item)throw new Error("Undeclared project "+id+" in "+file);
      if(seen.has(id))throw new Error("Duplicate "+field+" marker "+id+" in "+file);
      seen.add(id);
      return open+resolve(item)+close;
    });
    for(const id of byId.keys())if(!seen.has(id))throw new Error("Missing "+field+" marker "+id+" in "+file);
  }
  for(const id of byId.keys()){
    if(!html.includes('data-project-id="'+id+'"'))throw new Error("Missing project card "+id+" in "+file);
  }
  if(html!==before){
    fs.writeFileSync(full,html,"utf8");
    console.log("UPDATED "+file);
    changed++;
  }
}
console.log("PASS project card registry: "+byId.size+" projects, "+files.length+" pages; "+changed+" files updated");
