import { validateD92ConstructMatrix } from "./construct-choice-d92.mjs";
const el=id=>document.getElementById(id);
const text=(tag,value,className)=>{
 const n=document.createElement(tag);
 if(value!==undefined)n.textContent=value;
 if(className)n.className=className;
 return n;
};
let matrix;
const criterionNames=new Map();
const statusName={
 MEETS:"編集基準に適合し得る",
 CONDITIONAL:"編集上の課題あり",
 FAILS:"この概念案では基準と不整合"
};
const positionName={
 EDITORIAL_PREFERRED_CONDITIONAL:"暫定推奨（未承認）",
 NOT_SELECTED:"採用候補外"
};
const scale=el("scale"),position=el("position");
function filter(){
 const cards=[...document.querySelectorAll(".card")];
 for(const card of cards){
  card.hidden=(scale.value!=="ALL"&&card.dataset.scale!==scale.value)||
    (position.value!=="ALL"&&card.dataset.position!==position.value);
 }
 const visible=cards.filter(c=>!c.hidden).length;
 el("state").textContent="比較候補："+matrix.options.length+"件、現在表示中："+visible+
  "件。推奨は正式決裁・心理測定の検証済みを意味しません。";
}
function render(){
 const cards=el("cards");
 cards.replaceChildren();
 for(const option of matrix.options){
  const article=text("article",undefined,"card");
  article.dataset.scale=option.scale;article.dataset.position=option.position;
  article.dataset.optionId=option.id;
  const head=text("header");
  head.append(text("h3",option.id+"｜"+option.title),
              text("span",positionName[option.position],"status"));
  article.append(head);
  article.append(text("p",option.definition));
  article.append(text("p","判断理由："+option.reason));
  const table=text("table");
  const caption=text("caption","6つの編集基準（効果量や数値順位ではありません）");
  table.append(caption);
  for(const check of option.checks){
   const row=text("tr");
   row.append(text("th",criterionNames.get(check.criterion_id)));
   const td=text("td");
   td.append(text("span",statusName[check.status],"label"),
             text("p",check.rationale));
   row.append(td);
   table.append(row);
  }
  article.append(table);
  const related=text("p","関連設問："+option.item_ids.join("・"),"small");
  article.append(related);
  cards.append(article);
 }
 const pending=matrix.gates.filter(g=>g.state==="PENDING");
 el("gates").textContent="決裁ゲート："+pending.length+"件すべて保留（人の承認が必要）。";
 scale.disabled=false;position.disabled=false;
 filter();
}
async function init(){
 const src=new URL("../../../../docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json",import.meta.url);
 const response=await fetch(src,{credentials:"omit",cache:"no-store"});
 if(!response.ok)throw new Error("HTTP "+response.status);
 matrix=await response.json();
 validateD92ConstructMatrix(matrix);
 matrix.criteria.forEach(c=>criterionNames.set(c.id,c.label));
 scale.addEventListener("change",filter);
 position.addEventListener("change",filter);
 render();
}
init().catch(error=>{
 el("state").textContent="比較データを読み込めませんでした。静的Webサーバーで確認してください。";
 console.error("A05 D92 read-only preview error",error);
});
