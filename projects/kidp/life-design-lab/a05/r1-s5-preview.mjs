/**
 * A05 R1 S5 v0.1: local-only editorial preview of static S4 v0.4.
 * No individual assessment, score, rank, persistence, analytics, or outgoing ID request.
 */
import { TYPES, GROUPS } from "./types.mjs";
import { getCompatibilityPair, COMPATIBILITY_PAIRS } from "./compatibility.mjs";

const VERSION = "A05-R1-S5-MANUAL-COMPARE-0.1.0-unapproved";
const DATA_PATH = "../../../../docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json";
const byType = new Map(TYPES.map(t => [t.id, t]));
const $ = id => document.getElementById(id);
const first = $("first"), second = $("second");
const axes = new Map([
  ["A", "安定・変化"], ["B", "自律・つながり"],
  ["C", "将来・現在"], ["D", "探索・深耕"]
]);
let byPair = null;

function setText(id, value) { $(id).textContent = value; }
function options() {
  for (const select of [first,second]) {
    for (const type of TYPES) {
      const option = document.createElement("option");
      option.value = type.id;
      option.textContent = type.id + "｜" + type.name;
      select.append(option);
    }
  }
  first.value="T02"; second.value="T11";
}
function typeCard(id, type) {
  const el = $(id);
  el.dataset.group = GROUPS[type.group].id;
  el.replaceChildren();
  const code = document.createElement("span");
  code.className="type-id";
  code.textContent = type.id + " ／ " + GROUPS[type.group].name;
  const name = document.createElement("strong");
  name.className="type-name";
  name.textContent = type.emoji+" "+type.name;
  const caption=document.createElement("span");
  caption.className="type-caption";
  caption.textContent="暫定の編集キャラクター";
  el.append(code,name,caption);
}
function axisRow(axis, a, b, common) {
  const tr=document.createElement("tr");
  const name=document.createElement("th"); name.scope="row"; name.textContent=axis+"｜"+axes.get(axis);
  const left=document.createElement("td");left.textContent=a;
  const right=document.createElement("td");right.textContent=b;
  const relation=document.createElement("td");
  const badge=document.createElement("span");badge.className="marker";badge.textContent=common?"共通":"相違";
  relation.append(badge);tr.append(name,left,right,relation);return tr;
}
function render() {
  if (!byPair) return;
  const a=byType.get(first.value),b=byType.get(second.value);
  if (!a || !b) throw Error("Unknown type");
  const pair = getCompatibilityPair(a.id,b.id);
  const copy = byPair.get(pair.id);
  if (!copy) throw Error("No editorial draft: " + pair.id);
  typeCard("type-card-a",a); typeCard("type-card-b",b);
  const isNormalOrder = pair.typeIds[0]===a.id;
  const shared = new Map(pair.agreements.map(r=>[r.axis,r]));
  const different = new Map(pair.differences.map(r=>[r.axis,r]));
  const tbody=$("axis-rows");
  tbody.replaceChildren();
  for(const axis of ["A","B","C","D"]){
    const common=shared.get(axis),diff=different.get(axis);
    if(Boolean(common)===Boolean(diff))throw Error("Axis integrity: "+pair.id);
    const labels=common?[common.label,common.label]:
      (isNormalOrder?[diff.first,diff.second]:[diff.second,diff.first]);
    tbody.append(axisRow(axis,labels[0],labels[1],Boolean(common)));
  }
  setText("pair-meta","組合せ "+pair.id+" ／ 136組中の1組（表示順序を入れ替えても同じ組合せ）");
  setText("axis-note",pair.sameType
    ? "4軸の設定ラベルは同じですが、実際の人の希望や行動が一致することを意味しません。"
    : "設定上の共通・相違を示しています。軸の相違数に価値判断はありません。");
  setText("draft-description",copy.draftDescription);
  const ol=$("draft-prompts");ol.replaceChildren();
  for(const question of copy.draftConversationQuestions){
    const li=document.createElement("li");li.textContent=question;ol.append(li);
  }
  $("results").hidden=false;
}
async function init() {
  if(TYPES.length!==16 || GROUPS.length!==4 || COMPATIBILITY_PAIRS.length!==136)
    throw Error("Structural registry mismatch");
  options();
  const response=await fetch(DATA_PATH,{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw Error("Static JSON unavailable ("+response.status+")");
  const master=await response.json();
  if(master.schema!=="A05-R1-S4-136PAIR-EDITORIAL-MASTER-0.4.0-unapproved" ||
     master.release!=="NO_GO" || !Array.isArray(master.rows) || master.rows.length!==136)
    throw Error("Wrong static draft version");
  byPair = new Map(master.rows.map(row=>[row.pairId,row]));
  if(byPair.size!==136)throw Error("Duplicate pair ID");
  for(const pair of COMPATIBILITY_PAIRS){
    const row=byPair.get(pair.id);
    if(!row || row.publicationApproved!==false || row.draftCopyApproved!==false ||
       row.firstHumanReview!=="PENDING" || row.independentSecondHumanReview!=="PENDING" ||
       row.typeIds.join("|")!==pair.typeIds.join("|") ||
       !Array.isArray(row.draftConversationQuestions) || row.draftConversationQuestions.length<2 ||
       row.sharedAxes.join("|")!==pair.agreements.map(x=>x.axis).join("|") ||
       row.differentAxes.join("|")!==pair.differences.map(x=>x.axis).join("|"))
      throw Error("Unapproved or mismatched pair: "+pair.id);
  }
  first.addEventListener("change",render);
  second.addEventListener("change",render);
  $("swap").addEventListener("click",()=>{
    const left=first.value;
    first.value=second.value;second.value=left;
    render();first.focus();
  });
  render();
  document.documentElement.dataset.r1s5=VERSION;
  document.documentElement.dataset.previewReady="true";
}
init().catch(error=>{
  console.error("A05 R1 S5 preview:",error);
  $("results").hidden=true;
  $("load-error").hidden=false;
  document.documentElement.dataset.previewReady="false";
});
