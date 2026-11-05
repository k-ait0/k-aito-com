/** A05 D91 read-only construct audit viewer; no response inputs or persistence. */
const el=id=>document.getElementById(id);
const label={
 normative_ceiling:"高評価への偏り",similar_items:"設問同士の類似",
 context_dependence:"場面・状況依存",construct_blend:"別概念との混同",
 double_barrelled:"複数の問いが混在",cross_axis_overlap:"他軸との重複"
};
const node=(tag,text,className)=>{
 const out=document.createElement(tag);
 if(text!==undefined)out.textContent=text;
 if(className)out.className=className;
 return out;
};
const filter=el("filter"),axis=el("axis");
const get=async path=>{
 const url=new URL(path,import.meta.url);
 const response=await fetch(url,{credentials:"omit",cache:"no-store"});
 if(!response.ok)throw new Error("HTTP "+response.status);
 return response.json();
};
function updateVisibility(){
 const cards=el("items").querySelectorAll(".card");
 for(const card of cards)card.hidden=
  (filter.value!=="ALL"&&card.dataset.status!==filter.value)||
  (axis.value!=="ALL"&&card.dataset.axis!==axis.value);
 const visible=[...cards].filter(card=>!card.hidden).length;
 const trial=[...cards].filter(card=>card.dataset.status==="TRIAL").length;
 const revise=[...cards].filter(card=>card.dataset.status==="REVISE").length;
 el("load-state").textContent="全"+cards.length+"問：TRIAL "+trial+"／REVISE "+revise+
  "。表示中："+visible+"問。正式な尺度としての採用・分類判定は保留。";
}
function render(bank,audit){
 if(audit.schema!=="A05-D91-EDITORIAL-CONSTRUCT-AUDIT-0.1" ||
    audit.source.bank_schema!==bank.schema ||audit.items.length!==bank.items.length||
    bank.items.some((q,i)=>audit.items[i].id!==q.id||audit.items[i].source_text!==q.text))
    throw new Error("監査原本と質問セットが不整合です");
 const target=el("items");
 target.replaceChildren();
 for(const item of audit.items){
  const card=node("article",undefined,"card");
  card.dataset.status=item.editorial_status;
  card.dataset.axis=item.axis;
  card.dataset.questionId=item.id;
  card.append(node("h3",item.id+"｜"+item.construct));
  card.append(node("span",item.editorial_status,"card-status"));
  card.append(node("p",item.source_text));
  card.append(node("p","課題："+item.rationale));
  const flags=node("div");
  for(const key of item.risk_flags)flags.append(node("span",label[key]||key,"flag"));
  card.append(flags);
  card.append(node("p","次の検討："+item.next_action,"muted"));
  target.append(card);
 }
 filter.disabled=false;axis.disabled=false;
 filter.addEventListener("change",updateVisibility);
 axis.addEventListener("change",updateVisibility);
 updateVisibility();
}
Promise.all([
 get("../../../../docs/A05_D90_BC_PILOT_0_2_20261105.json"),
 get("../../../../docs/A05_D91_CONSTRUCT_BOUNDARY_AUDIT_20261105.json")
]).then(([bank,audit])=>render(bank,audit)).catch(error=>{
 el("load-state").textContent="監査データを読み込めませんでした。";
 console.error("A05 D91 audit unavailable",error);
});
