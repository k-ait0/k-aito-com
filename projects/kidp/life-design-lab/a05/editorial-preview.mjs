/** D83 local editorial review; no answers, collection, scoring, or persistence. */
import { EDITORIAL_ITEMS } from "./editorial-preview-data.mjs";
const byId=new Map(EDITORIAL_ITEMS.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const axis=$("axis"),itemSelect=$("item"),blockOnly=$("block-only");
const titles={L:"L：従来概念の改稿候補",M:"M：別の構成概念",R:"R：人生選択の再設計候補"};
const statusNames={BLOCK:"BLOCK（採用禁止）",REVISE:"REVISE（改稿対象）",TRIAL:"TRIAL（試験候補）"};
function filtered(){return EDITORIAL_ITEMS.filter(x=>x.axis===axis.value&&(!blockOnly.checked||x.verdict==="BLOCK"));}
function options(target,values,preferred){
 target.replaceChildren();
 for(const v of values){const o=document.createElement("option");o.value=v.value;o.textContent=v.label;target.append(o);}
 if(preferred&&values.some(x=>x.value===preferred))target.value=preferred;
}
function card(key,pair){
 const section=document.createElement("section");section.className="variant";section.setAttribute("aria-label",titles[key]);
 const h=document.createElement("h3");h.textContent=titles[key];section.append(h);
 for(const [heading,value] of [["負方向",pair.negative],["正方向",pair.positive]]){
  const p=document.createElement("p");const strong=document.createElement("strong");
  strong.textContent=heading+"：";p.append(strong,document.createTextNode(value));section.append(p);
 }
 return section;
}
function render(selected){
 const visible=filtered();
 options(itemSelect,visible.map(x=>({value:x.id,label:x.id+"｜"+x.facet})),selected);
 const x=byId.get(itemSelect.value);
 if(!x){
  $("status").textContent="該当する候補はありません";
  $("cards").replaceChildren();
  $("count").textContent="0件";
  for(const el of [$("previous"),$("next"),itemSelect,$("overlap"),$("jump-overlap")])el.disabled=true;
  return;
 }
 itemSelect.disabled=false;
 $("status").textContent=x.id+"："+statusNames[x.verdict]+"。正式採用・研究実施は未承認。";
 $("status").dataset.verdict=x.verdict;
 $("facet").textContent="設問の場面："+x.facet;
 const index=visible.findIndex(y=>y.id===x.id);
 $("count").textContent=(index+1)+" / "+visible.length+" 件（A/B合計12問）";
 $("previous").disabled=index===0;$("next").disabled=index===visible.length-1;
 $("cards").replaceChildren(...["L","M","R"].map(k=>card(k,x[k])));
 $("original").textContent="現行の参照文面：負方向「"+x.original.negative+"」／正方向「"+x.original.positive+"」";
 $("risk").textContent="検証上の論点："+x.risk;
 const links=x.overlaps.filter(id=>byId.has(id));
 options($("overlap"),links.map(id=>({value:id,label:id+"｜"+byId.get(id).facet})));
 $("overlap").disabled=links.length===0;
 $("jump-overlap").disabled=links.length===0;
}
function reset(){render(filtered()[0]?.id);}
axis.addEventListener("change",reset);
blockOnly.addEventListener("change",reset);
itemSelect.addEventListener("change",()=>render(itemSelect.value));
for(const [id,step] of [["previous",-1],["next",1]]){
 $(id).addEventListener("click",()=>{
  const all=filtered();const i=all.findIndex(x=>x.id===itemSelect.value);
  if(all[i+step])render(all[i+step].id);
 });
}
$("jump-overlap").addEventListener("click",()=>{
 const x=byId.get($("overlap").value);if(!x)return;
 if(blockOnly.checked&&x.verdict!=="BLOCK")blockOnly.checked=false;
 axis.value=x.axis;
 render(x.id);
 itemSelect.focus();
});
render("A01");
