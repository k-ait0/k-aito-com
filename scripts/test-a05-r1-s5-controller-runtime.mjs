/**
 * A05 R1: execute the real offline controller with an isolated DOM double.
 * Node: node --test scripts/test-a05-r1-s5-controller-runtime.mjs
 * Not a substitute for Chrome, iOS Safari, or accessibility QA.
 * No GitHub Actions, production, remote requests or respondent records.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const root=new URL("../",import.meta.url);
const read=p=>readFileSync(new URL(p,root),"utf8");
const controller=read("projects/kidp/life-design-lab/a05/r1-s5-offline-controller.js");
const master=JSON.parse(read("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json"));
const alternates=JSON.parse(read("docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json"));
const v06=JSON.parse(read("docs/A05_S4_V06_HIGH_REPEAT8_INDIVIDUAL_REWRITE_PILOT_20261030.json"));
const groupNames=["基盤を築く人々","暮らしを育む人々","可能性を拓く人々","未来を共創する人々"];
const types=Array.from({length:16},(_,i)=>{
  const id="T"+String(i+1).padStart(2,"0");
  const row=master.rows.find(r=>r.pairId===id+"-"+id);
  assert.ok(row,id);
  return {id,name:row.displayNames[0],group:"G"+(Math.floor(i/4)+1),groupName:groupNames[Math.floor(i/4)]};
});
const clone=x=>JSON.parse(JSON.stringify(x));

class ElementDouble {
  constructor(id="",tag="div"){
    this.id=id;this.tag=tag;this.children=[];this.listeners={};this.dataset={};
    this.value="";this.textContent="";this.hidden=false;this.checked=false;this.open=false;
  }
  append(...items){this.children.push(...items)}
  replaceChildren(...items){this.children=[...items]}
  addEventListener(kind,fn){(this.listeners[kind]??=[]).push(fn)}
  fire(kind){for(const fn of this.listeners[kind]??[])fn({type:kind,target:this})}
  focus(){this.focused=true}
}
function start({editMaster,editAlternates,editV06}={}){
  const m=clone(master),a=clone(alternates),p=clone(v06);
  editMaster?.(m);editAlternates?.(a);editV06?.(p);
  const nodes=new Map();
  const get=id=>{
    if(!nodes.has(id))nodes.set(id,new ElementDouble(id));
    return nodes.get(id);
  };
  const radios=[new ElementDouble("option-v04","input"),new ElementDouble("option-v05","input"),new ElementDouble("option-v06","input")];
  radios[0].value="v04";radios[1].value="v05";radios[2].value="v06";
  get("offline-master-data").textContent=JSON.stringify(m);
  get("offline-alternates-data").textContent=JSON.stringify(a);
  get("offline-v06-data").textContent=JSON.stringify(p);
  get("offline-types-data").textContent=JSON.stringify(types);
  get("load-error").hidden=true;get("results").hidden=true;
  const document={
    getElementById:get,
    createElement:tag=>new ElementDouble("",tag),
    querySelectorAll:selector=>{
      assert.equal(selector,'input[name="draft-variant"]');
      return radios;
    },
    documentElement:{dataset:{}}
  };
  const errors=[];
  // No fetch, storage, network, window, or browser globals supplied.
  runInNewContext(controller,{document,console:{error:(...args)=>errors.push(args.map(String).join(" "))}},{timeout:5000,filename:"r1-s5-offline-controller.js"});
  return {get,radios,document,errors,master:m,alternates:a,v06:p};
}

test("the actual controller boots with 136 pairs and 112 alternatives",()=>{
  const x=start();
  assert.deepEqual(x.errors,[]);
  assert.equal(x.document.documentElement.dataset.offlineReady,"true");
  assert.equal(x.get("load-error").hidden,true);
  assert.equal(x.get("results").hidden,false);
  assert.equal(x.get("first").children.length,16);
  assert.equal(x.get("second").children.length,16);
  assert.match(x.get("offline-integrity").textContent,/256通り／136組、v0.5候補112組、v0.6候補8組/);
  assert.match(x.get("pair-meta").textContent,/T02-T11/);
});
test("all 256 selections map to exactly 136 IDs, 112 alternatives and both copies",()=>{
  const x=start(),seen=new Set(),variantIds=new Set(),pilotIds=new Set();
  const byId=new Map(x.master.rows.map(r=>[r.pairId,r]));
  const byAlt=new Map(x.alternates.proposals.map(r=>[r.pairId,r]));
  const byV06=new Map(x.v06.rows.map(r=>[r.pairId,r]));
  for(const a of types)for(const b of types){
    const id=[a.id,b.id].sort().join("-");
    x.get("first").value=a.id;x.get("first").fire("change");
    x.get("second").value=b.id;x.get("second").fire("change");
    assert.match(x.get("pair-meta").textContent,new RegExp(id));
    assert.equal(x.get("axis-rows").children.length,4,id);
    assert.equal(x.get("draft-description").textContent,byId.get(id).draftDescription,id);
    assert.equal(x.get("draft-prompts").children.length,byId.get(id).draftConversationQuestions.length,id);
    const alt=byAlt.get(id),final=byV06.get(id);
    assert.equal(x.get("draft-variants").hidden,!alt,id);
    assert.equal(x.get("option-v06-label").hidden,!final,id);
    assert.equal(x.get("compare-v06-panel").hidden,!final,id);
    assert.equal(x.get("review-compare").hidden,!alt,id);
    if(alt){
      variantIds.add(id);
      x.radios[1].fire("change");
      assert.equal(x.get("draft-description").textContent,alt.candidateDescription,id);
      assert.equal(x.get("compare-v04-description").textContent,byId.get(id).draftDescription,id);
      assert.equal(x.get("compare-v05-description").textContent,alt.candidateDescription,id);
      assert.equal(x.get("compare-v05-prompts").children.length,3,id);
      if(final){
        pilotIds.add(id);
        x.radios[2].fire("change");
        assert.equal(x.get("draft-description").textContent,final.proposedV06Description,id);
        assert.equal(x.get("compare-v06-description").textContent,final.proposedV06Description,id);
        assert.equal(x.get("compare-v06-prompts").children.length,3,id);
        assert.equal(x.get("review-grid").dataset.threeway,"true");
      }
      const isMachine=alt.provenance==="PROGRAMMATIC_104_PAIR_EDITORIAL_DRAFT_NO_HUMAN_REVIEW";
      assert.ok(x.get("source-status").textContent.includes(isMachine?"104組":"8組"),id);
    }
    seen.add(id);
  }
  assert.equal(seen.size,136);
  assert.equal(variantIds.size,112);
  assert.equal(pilotIds.size,8);
  assert.deepEqual(x.errors,[]);
});
test("swapping selection does not change the canonical pair",()=>{
  const x=start();
  x.get("first").value="T01";x.get("first").fire("change");
  x.get("second").value="T05";x.get("second").fire("change");
  const id=x.get("pair-meta").textContent;
  x.get("swap").fire("click");
  assert.equal(x.get("first").value,"T05");
  assert.equal(x.get("second").value,"T01");
  assert.equal(x.get("pair-meta").textContent,id);
});
test("fail closed if a source record becomes approved or missing",()=>{
  for(const mutation of [
    {editMaster:m=>{m.rows[0].publicationApproved=true}},
    {editAlternates:a=>{a.proposals.pop()}},
    {editMaster:m=>{m.rows.pop()}},
    {editAlternates:a=>{a.proposals[0].approved=true}},
    {editV06:p=>{p.rows[0].approved=true}},
    {editV06:p=>{p.rows[0].baselineV05Description="SOURCE_TAMPERED"}}
  ]){
    const x=start(mutation);
    assert.equal(x.document.documentElement.dataset.offlineReady,"false");
    assert.equal(x.get("load-error").hidden,false);
    assert.equal(x.get("results").hidden,true);
    assert.ok(x.errors.length>0);
  }
});
