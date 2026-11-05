import {validateD95Protocol} from "./cp1-domain-protocol-d95.mjs";
const el=id=>document.getElementById(id);
const create=(tag,text,cls)=>{
 const x=document.createElement(tag);
 if(text!==undefined)x.textContent=text;
 if(cls)x.className=cls;
 return x;
};
const load=async path=>{
 const r=await fetch(new URL(path,import.meta.url),{credentials:"omit",cache:"no-store"});
 if(!r.ok)throw new Error("HTTP "+r.status);
 return r.json();
};
function card(title,body,small){
 const x=create("article",undefined,"card");
 x.append(create("h3",title),create("p",body));
 if(small)x.append(create("p",small,"small"));
 return x;
}
function showCase(p){
 const target=el("case-detail");
 const item=p.contrast_cases.find(x=>x.id===el("case-select").value);
 target.replaceChildren();
 if(item)target.append(card(item.id+"｜"+item.case,item.intended_probe,
  "扱い：架空の検討課題。実測・得点化・被験者の回答ではありません。"));
}
async function main(){
 const [p,d94,d93,d90]=await Promise.all([
  load("../../../../docs/A05_D95_CP1_DOMAIN_PROTOCOL_20261106.json"),
  load("../../../../docs/A05_D94_CP1_CONTENT_COVERAGE_20261105.json"),
  load("../../../../docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json"),
  load("../../../../docs/A05_D90_BC_PILOT_0_2_20261105.json")
 ]);
 // The exact blob lineage is independently pinned and verified in Node tests.
 const summary=validateD95Protocol(p,d94,d93,d90,
  p.sources.map(x=>({path:x.path,sha:x.git_blob_sha})));
 el("status").textContent="領域 "+summary.proposedDomains+"／架空の反例 "+
  summary.hypotheticalCases+"／面接確認質問 "+summary.cognitiveProbes+
  "／人間決裁 "+summary.humanGatesPending+"件（すべて保留）。";
 const dom=el("domains"),probes=el("probes"),out=el("outcomes"),gates=el("gates");
 dom.replaceChildren();probes.replaceChildren();out.replaceChildren();gates.replaceChildren();
 for(const d of p.domains)dom.append(card(d.label,d.draft_prompt,
   "異なる領域といえるか：未確認。混同の懸念："+d.ambiguity));
 for(const q of p.interview_protocol.probes)probes.append(card(q.id,q.text,
  "確認対象："+q.expected_observation));
 for(const o of p.interpretation_decision_tree)out.append(card(
  o.id+"｜"+o.next,"想定される状況："+o.trigger,"未承認・得点化なし"));
 for(const g of p.gate_checklist){
  const li=create("li",g.id+"｜"+g.required+"（保留）");
  gates.append(li);
 }
 const select=el("case-select");
 select.replaceChildren();
 for(const c of p.contrast_cases){
  const option=create("option",c.id+"｜"+c.case);
  option.value=c.id;
  select.append(option);
 }
 select.disabled=false;
 select.addEventListener("change",()=>showCase(p));
 showCase(p);
}
main().catch(e=>{
 el("status").textContent="資料を読み込めませんでした。静的Webサーバー上で開いてください。";
 console.error("A05 D95 protocol preview error",e);
});
