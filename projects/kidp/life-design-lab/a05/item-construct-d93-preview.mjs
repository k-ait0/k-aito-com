import {validateD93Mapping} from "./item-construct-d93.mjs";
const el=id=>document.getElementById(id);
const create=(tag,value,css)=>{
 const node=document.createElement(tag);
 if(value!==undefined)node.textContent=value;
 if(css)node.className=css;
 return node;
};
const read=async path=>{
 const res=await fetch(new URL(path,import.meta.url),{credentials:"omit",cache:"no-store"});
 if(!res.ok)throw new Error("HTTP "+res.status);
 return res.json();
};
const statusNames={
 CONDITIONAL_TRIAL:"条件付き試用候補",
 REWRITE_BEFORE_TRIAL:"再設計対象"
};
const criteriaNames=new Map();
let mapping;
function applyFilters(){
 const cards=[...el("cards").querySelectorAll(".card")];
 for(const card of cards)card.hidden=
  (el("facet").value!=="ALL"&&card.dataset.facet!==el("facet").value)||
  (el("disposition").value!=="ALL"&&card.dataset.disposition!==el("disposition").value);
 el("state").textContent="全6問：条件付き試用2問・再設計4問／表示 "+
  cards.filter(x=>!x.hidden).length+"問。正式な概念採用・設問の承認は保留。";
}
function render(){
 const target=el("cards");
 target.replaceChildren();
 for(const item of mapping.items){
  const card=create("article",undefined,"card");
  card.dataset.id=item.id;
  card.dataset.facet=item.facet;
  card.dataset.disposition=item.editorial_disposition;
  card.append(create("h2",item.id+"｜"+(item.facet==="related"?"つながり":"現在充実")));
  card.append(create("span",statusNames[item.editorial_disposition],"status"));
  card.append(create("p",item.source_text));
  card.append(create("h3","対応する価値"));
  card.append(create("p",item.intent));
  card.append(create("h3","主な問題"));
  card.append(create("p",item.primary_issue));
  card.append(create("h3","再設計で確認すること"));
  card.append(create("p",item.rewrite_brief_unapproved));
  const table=create("table");
  for(const check of item.acceptance_criteria){
   const row=create("tr");
   row.append(create("th",criteriaNames.get(check.id)),create("td",check.editorial_judgment));
   table.append(row);
  }
  card.append(table);
  card.append(create("h3","認知面接の質問案（未実施）"));
  const list=create("ul");
  for(const question of item.cognitive_interview_probes_draft)list.append(create("li",question));
  card.append(list);
  card.append(create("p","禁止する誤読："+item.negative_guardrail,"tiny"));
  target.append(card);
 }
 const facet=el("facet"),decision=el("disposition");
 facet.disabled=false;decision.disabled=false;
 facet.addEventListener("change",applyFilters);
 decision.addEventListener("change",applyFilters);
 applyFilters();
}
async function init(){
 const [mappingData,matrix,bank,audit]=await Promise.all([
  read("../../../../docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json"),
  read("../../../../docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json"),
  read("../../../../docs/A05_D90_BC_PILOT_0_2_20261105.json"),
  read("../../../../docs/A05_D91_CONSTRUCT_BOUNDARY_AUDIT_20261105.json")
 ]);
 validateD93Mapping(mappingData,bank,matrix,audit,
  mappingData.sources.map(x=>({path:x.path,sha:x.git_blob_sha})));
 mapping=mappingData;
 matrix.criteria.forEach(c=>criteriaNames.set(c.id,c.label));
 render();
}
init().catch(error=>{
 el("state").textContent="監査資料を読み込めませんでした。静的サーバーで確認してください。";
 console.error("A05 D93 mapping preview failure",error);
});
