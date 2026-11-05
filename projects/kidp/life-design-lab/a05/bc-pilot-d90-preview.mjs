import { compareBCPilotBanks } from "./bc-pilot-d90-comparison.mjs";
const el = id => document.getElementById(id);
const create = (tag,text,css) => {
  const node=document.createElement(tag);
  if (text!==undefined) node.textContent=text;
  if (css) node.className=css;
  return node;
};
const NAMES={self:"B｜自己裁量",related:"B｜つながり",future:"C｜将来達成",present:"C｜現在充実"};
const filter=el("filter");
function updateVisibility(){
  const choice=filter.value;
  for(const item of document.querySelectorAll(".item[data-status]"))
    item.hidden=choice!=="ALL"&&item.dataset.status!==choice;
  for(const group of document.querySelectorAll(".group"))
    group.hidden=![...group.querySelectorAll(".item")].some(item=>!item.hidden);
}
async function readBank(path){
  const url=new URL(path,import.meta.url);
  const response=await fetch(url,{credentials:"omit",cache:"no-store"});
  if(!response.ok)throw new Error("質問セットの読み込み失敗（HTTP "+response.status+"）");
  return response.json();
}
function render(comparison,newBank){
  const container=el("matrix");
  container.replaceChildren();
  for(const facet of newBank.facets){
    const group=create("section",undefined,"group");
    group.dataset.facet=facet.id;
    group.append(create("h2",NAMES[facet.id]));
    const list=create("div",undefined,"items");
    for(const item of comparison.rows.filter(row=>row.facet===facet.id)){
      const card=create("article",undefined,"item");
      card.dataset.questionId=item.id;
      card.dataset.status=item.status;
      const header=create("header");
      header.append(create("strong",item.id),create("span",item.status==="REVISED"?"修正":"変更なし","tag"));
      card.append(header);
      const columns=create("div",undefined,"columns");
      for(const [title,body] of [["旧版 v0.1",item.before],["改訂案 v0.2",item.after]]){
        const cell=create("div");
        cell.append(create("h3",title),create("p",body));
        columns.append(cell);
      }
      card.append(columns);
      if(item.status==="REVISED")
        card.append(create("p","変更理由："+newBank.revision.item_reasons[item.id],"reason"));
      list.append(card);
    }
    group.append(list);
    container.append(group);
  }
  el("load-state").textContent="比較表：全"+comparison.rows.length+"問 ／ 改訂"+comparison.changed+
    "問 ／ 据置"+comparison.unchanged+"問。分類は保留、旧版との測定上の同等性は未確認。";
  filter.disabled=false;
  updateVisibility();
}
async function init(){
  const [oldBank,newBank]=await Promise.all([
    readBank("../../../../docs/A05_D87_BC_PILOT_20261105.json"),
    readBank("../../../../docs/A05_D90_BC_PILOT_0_2_20261105.json")
  ]);
  const comparison=compareBCPilotBanks(oldBank,newBank);
  render(comparison,newBank);
  filter.addEventListener("change",updateVisibility);
}
init().catch(e=>{
  el("load-state").textContent="比較データを読み込めませんでした。HTTP(S)の静的サーバーを使用してください。";
  console.error("A05 D90 compare failed",e);
});
