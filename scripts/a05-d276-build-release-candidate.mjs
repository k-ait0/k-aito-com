/** D276 research-only release candidate: bounded UI corrections on exact D272 bytes. */
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const p=resolve(root,"research/a05/generated/d272-accessibility-candidate.html");
const sha=s=>createHash("sha256").update(s).digest("hex");
const before=readFileSync(p,"utf8");
if(sha(before)!=="6cd4c74ca2e0fe9eab3af7a031700302f256a1fefc0eed4cd0810474fd66d215")throw Error("D272 byte contract mismatch");
let html=before;const edits=[];
function replaceExactly(name,a,b){
 if(html.split(a).length!==2)throw Error("D276 patch drift: "+name);
 html=html.replace(a,b);edits.push(name);
}
replaceExactly("retain seven-point selection focus",
 'b.addEventListener("click",()=>{answers[q.id]=i;delete skipReasons[q.id];paintQuestion();});',
 'b.addEventListener("click",()=>{const focused=document.activeElement===b;answers[q.id]=i;delete skipReasons[q.id];paintQuestion();if(focused)holder.querySelector(\'button[data-value="\'+i+\'"]\').focus({preventScroll:true});});');
replaceExactly("retain Y/N selection focus",
 'b.addEventListener("click",()=>{ynState.responses[q.id]=value;paintYN();});',
 'b.addEventListener("click",()=>{const focused=document.activeElement===b;ynState.responses[q.id]=value;paintYN();if(focused)[...$("ynChoices").querySelectorAll("button")].find(x=>x.textContent===label).focus({preventScroll:true});});');
replaceExactly("remaining unresolved axes from final evidence",
 'const unresolved=stats.filter(s=>s.status!=="clear");',
 'const unresolved=research.axes.filter(s=>s.source==="UNRESOLVED");');
replaceExactly("result title after partial Y/N",
 '$("typeName").textContent=missingAll?"今回の回答からは判断できません":midOnly?"中間回答が多く、方向が未確定です":"タイプを十分に絞り込めません";',
 '$("typeName").textContent=rescued?"Y/Nで一部の方向を暫定補完しました":missingAll?"今回の回答からは判断できません":midOnly?"中間回答が多く、方向が未確定です":"タイプを十分に絞り込めません";');
replaceExactly("result summary after partial Y/N",
 '$("typeSummary").textContent=missingAll?"30問すべてスキップされ、判定材料がありません。希望すればY/Nで追加確認できます。":midOnly?"中間回答はありますが、左右の方向は未確定です。":"方向が不明な軸があります。任意のY/Nで参考候補を減らせる場合があります。";',
 '$("typeSummary").textContent=rescued?"30問とは別のY/N回答で、一部の軸を暫定補完しました。残る軸は判定を保留しています。":missingAll?"30問すべてスキップされ、判定材料がありません。希望すればY/Nで追加確認できます。":midOnly?"中間回答はありますが、左右の方向は未確定です。":"方向が不明な軸があります。任意のY/Nで参考候補を減らせる場合があります。";');
replaceExactly("intro honest scrolling wording",
 'スマホ縦画面では、回答中のスクロールは不要です。',
 'スマホ縦画面では通常は1画面で回答できます。文字拡大や画面の高さに応じてスクロールできます。');
replaceExactly("mobile header wrap and scale height",
 "</head>",
 '<style id="a05-d276-release-ui">\n@media (max-width:600px) and (orientation:portrait){\n body[data-screen="question"] header .brand,body[data-screen="yn"] header .brand,body[data-screen="question"] header .pill,body[data-screen="yn"] header .pill{min-width:0;white-space:normal;overflow-wrap:anywhere}\n .scale button{height:auto!important;min-height:44px;line-height:1.25;padding-block:4px}\n}\n</style>\n</head>');
// Protect byte-identical embedded bank and classifier.
for(const id of ["data","d255-engine"]){
 const block=s=>s.match(new RegExp('<script id="'+id+'"[^>]*>[\\s\\S]*?</script>'))?.[0];
 if(!block(before)||block(before)!==block(html))throw Error("Changed protected block "+id);
}
const dest=resolve(root,"research/a05/generated/d276-release-candidate.html");
writeFileSync(dest,html,"utf8");
console.log("D276_LOCAL_CANDIDATE "+JSON.stringify({sha256:sha(html),sourceSha256:sha(before),edits,embeddedBankAndEngineUnchanged:true,noPublish:true,noRealData:true}));
