/** D86 preview of theoretical structures. Synthetic inputs only; no scoring. */
import { structurePreview } from "./type-structure-experiment.mjs";
import { B_SCENARIOS } from "./b-preview-scenarios.mjs";
const el=id=>document.getElementById(id);
const mode=el("mode"),select=el("case");
for(const preset of B_SCENARIOS){
 const opt=document.createElement("option");
 opt.value=preset.id;
 opt.textContent=preset.name;
 select.append(opt);
}
const display=value=>value===null?"回答なし":String(value);
const desc={
 B1:"4軸の二値構造を仮定する設計。Bが二極である根拠は未確認。",
 B2:"A/C/Dのみ二値と仮定し、Bは自分・他者の独立した2つの回答として保つ設計。",
 B3:"B軸を分類から除外する設計。Bの選好値はここでは結果に含めません。"
};
function render(){
 const preset=B_SCENARIOS.find(x=>x.id===select.value);
 if(!preset)return;
 const model=structurePreview(mode.value,{
  bipolar:preset.bipolar,self:preset.self,others:preset.others
 });
 for(const card of document.querySelectorAll(".card"))
  card.dataset.current=String(card.dataset.mode===mode.value);
 el("selection").textContent="選択中："+mode.value+" ／ 架空ケース："+preset.name;
 el("model-summary").textContent=desc[mode.value]+" 理論上の組合せ："+model.possibleConfigurations+"。仮の二値軸："+model.hypotheticalAxes.join("・")+"。";
 const b=model.illustrativeB;
 el("example-value").textContent=b===null?"この方式ではB回答をタイプ分類に使用しません。":
  b.mode==="bipolar"?
   "架空のB二極回答："+display(b.answer)+"（中点4／欠測は別）":
   "架空のB独立回答：自分の希望"+display(b.ratings.self)+"、他者への配慮"+display(b.ratings.others)+"。";
 el("withheld").textContent="タイプID：発行しない ／ 分類状態：保留 ／ 科学的な妥当性：未検証。";
}
mode.addEventListener("change",render);
select.addEventListener("change",render);
render();
