import { experimentalB } from "./b-experiment.mjs";
import { B_SCENARIOS } from "./b-preview-scenarios.mjs";
const el=id=>document.getElementById(id);
const selector=el("scenario");
for(const scenario of B_SCENARIOS){
 const option=document.createElement("option");
 option.value=scenario.id;
 option.textContent=scenario.name;
 selector.append(option);
}
const value=n=>n===null?"判断不能（未回答）":String(n);
function render(){
 const preset=B_SCENARIOS.find(x=>x.id===selector.value);
 if(!preset)return;
 const one=experimentalB({mode:"bipolar",answer:preset.bipolar});
 const two=experimentalB({mode:"independent",self:preset.self,others:preset.others});
 el("case-heading").textContent="架空ケース："+preset.name;
 el("bipolar-result").textContent="回答："+value(one.answer)+"\n相対位置："+value(one.relativePosition);
 el("independent-result").textContent="自分の希望："+value(two.ratings.self)+"\n他者への配慮："+value(two.ratings.others)+"\n回答状態："+two.responseStatus;
 el("insight").textContent=preset.focus+"。数値の相互変換はしていません。";
}
selector.addEventListener("change",render);
render();
