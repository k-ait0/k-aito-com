const el=id=>document.getElementById(id);
const make=(name,value,cls)=>{
 const n=document.createElement(name);
 if(value!==undefined)n.textContent=value;
 if(cls)n.className=cls;
 return n;
};
const data=async path=>{
 const url=new URL(path,import.meta.url);
 const r=await fetch(url,{credentials:"omit",cache:"no-store"});
 if(!r.ok)throw new Error("HTTP "+r.status);
 return r.json();
};
function card(title,tag,lines) {
 const article=make("article",undefined,"card");
 article.append(make("h3",title),make("span",tag,"tag"));
 for(const line of lines)article.append(make("p",line));
 return article;
}
const filters=el("view");
function render(m,bank){
 if(m.schema!=="A05-D94-CP1-CONTENT-COVERAGE-1" ||
   m.items.length!==3||m.pairs.length!==3||m.architecture_options.length!==3||
   m.items.some(item=>bank.items.find(q=>q.id===item.id)?.text!==item.text)||
   m.decision.three_item_mean_allowed!==false||
   m.decision.production_release_allowed!==false)
   throw new TypeError("Invalid CP1 source data");
 const items=el("item-cards");
 const pairs=el("pair-cards");
 const options=el("option-cards");
 const prompts=el("prompt-cards");
 items.replaceChildren();pairs.replaceChildren();options.replaceChildren();prompts.replaceChildren();
 for(const x of m.items){
  const q=card(x.id,x.status,[x.text,"混同の可能性："+x.why,"別の状況："+x.counterexample]);
  q.dataset.itemId=x.id;items.append(q);
 }
 for(const x of m.pairs){
  const q=card(x.ids.join(" × "),x.category,[
   "共通する点："+x.shared_target,"異なる点："+x.difference,"判断："+x.problem]);
  q.dataset.pair=x.ids.join("-");pairs.append(q);
 }
 for(const x of m.architecture_options){
  const q=card(x.id+"｜"+x.label,x.disposition,[
   "利点："+x.benefit,"制約："+x.limitation,"数値化：しない"]);
  q.dataset.option=x.id;options.append(q);
 }
 for(const x of m.draft_editorial_prompts){
  prompts.append(card(x.id,"文言案・未承認",[x.text,"得点には用いない"]));
 }
 el("status").textContent="既存3問・重複3組・設計3案。推奨はO2（2つの編集用問い、得点化しない）。第三の独立領域は未確定。";
 filters.disabled=false;
 filters.addEventListener("change",()=>{
  for(const id of ["items","pairs","options"]){
   el(id).hidden=filters.value!=="all"&&filters.value!==id;
  }
 });
}
Promise.all([
 data("../../../../docs/A05_D94_CP1_CONTENT_COVERAGE_20261105.json"),
 data("../../../../docs/A05_D90_BC_PILOT_0_2_20261105.json")
]).then(([m,bank])=>render(m,bank)).catch(error=>{
 el("status").textContent="監査資料を読み込めませんでした。HTTP(S)の静的サーバーで開いてください。";
 console.error("D94 editorial preview failed",error);
});
