/**
 * A05 D237 — reproducible, BLANK, local-only cognitive interview field kit.
 * Source of truth: D206 bank and D232 18-pair triage. Absolutely no actual
 * participant answers in generated files, and no user-identifiable fields.
 * The 24 slots are allocation placeholders, not enrolled people.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {BANK} from "./a05-d208-research-sampler.mjs";

const BASE=new URL("../",import.meta.url);
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const editorial=JSON.parse(readFileSync(new URL("research/a05/d232-content-triage-and-c36-candidates.json",BASE),"utf8"));
const byId=new Map(BANK.items.map(q=>[q.bank_id,q]));
const byCandidate=new Map(editorial.C36_replacement_candidates.map(q=>[q.id,q]));
const P0=editorial.pairs.filter(p=>p.priority==="P0");
const others=editorial.pairs.filter(p=>p.priority!=="P0");
const SLOTS=24;
const BUNDLE=8;
const P0_COUNT=3;
const PAIR_PER_SHEET=8;
const item=(id)=>{const q=byId.get(id);if(!q)throw Error("Unknown question ID: "+id);return q;};

function assertSource(){
 assert.equal(editorial.pairs.length,18);
 assert.equal(BANK.items.length,50);
 assert.equal(P0.length,P0_COUNT);
 assert.equal(others.length,15);
 assert.deepEqual(new Set(P0.map(x=>x.pair)),new Set(["C31-32","C35-36","E49-50"]));
 assert.equal(byCandidate.size,3);
 for(const p of editorial.pairs){
   assert.equal(p.ids.length,2);
   for(const id of p.ids)item(id);
 }
 for(const x of editorial.C36_replacement_candidates){
  assert.ok(x.stem&&x.left&&x.right);
  assert.ok(!byId.has(x.id));
 }
}
function rotate(items,shift){
 return items.slice(shift).concat(items.slice(0,shift));
}
function orderedPairs(i){
 // Eight deterministic rounds, each partitioning all 15 non-P0 pairs into
 // three different five-pair bundles. Every pair is covered once per round,
 // and therefore exactly eight times across 24 slots. This avoids tying
 // the same five interview topics to one fixed eight-person cohort.
 const round=Math.floor(i/3),lane=i%3;
 const shuffled=others.slice().sort((a,b)=>{
  const key=id=>createHash("sha256").update("D237|"+round+"|"+id).digest("hex");
  return key(a.pair).localeCompare(key(b.pair));
 });
 const five=shuffled.slice(lane*5,(lane+1)*5);
 assert.equal(five.length,5);
 const all=rotate([...P0,...five],i%8);
 assert.equal(all.length,PAIR_PER_SHEET);
 return all;
}
function card(q){
 return [
  "#### "+q.bank_id,
  q.stem,
  "1側："+q.left,
  "7側："+q.right,
  "- 1〜7／回答しない：_____",
  "- 説明し直した内容（本人の言葉）：________________",
  "- 数字を選んだ理由：________________",
  "- 答えづらい点：________________"
 ].join("\n");
}
function replacementCard(c){
 return [
  "#### "+c.id+"（採点対象外・差替候補）",
  c.stem,
  "1側："+c.left,
  "7側："+c.right,
  "- 1〜7／回答しない：_____",
  "- 説明し直した内容：________________",
  "- 比較した際に重要と考えた点：________________",
  "- C25/C26/C35と異なると思った理由：________________"
 ].join("\n");
}
function sheet(slot){
 const pairs=orderedPairs(slot);
 const id="S"+String(slot+1).padStart(2,"0");
 const candidateOrder=slot%2===0?["C36-R1","C36-R2","C36-R3"]:["C36-R2","C36-R1","C36-R3"];
 const cards=pairs.map((p,j)=>{
  const sequence=(slot+j)%2===0?p.ids:p.ids.slice().reverse();
  return [
   "### 比較"+String(j+1)+"："+p.pair+"（"+p.priority+"）",
   "**注意：最初は片方ずつ提示し、重複仮説や優先度を告げない**",
   ...sequence.map(id=>card(item(id))),
   "比較後に聞く：これらの質問は同じ意味に感じましたか。異なるなら何が違いますか？",
   "対照質問（実施者用）："+p.contrast_probe,
   "- 同じ判断理由：同じ／異なる／判断不能／未回答",
   "- 混入した別の要因：________________",
   "- 重大な理解の違い：なし／あり（内容：________）"
  ].join("\n\n");
 });
 const probes=[
  ["B_AUTONOMY","重要な選択では、最終的に自分で決められることを大切にしたい"],
  ["B_CONNECTION","重要な選択では、身近な人と考えを共有できることを大切にしたい"],
  ["C_FUTURE","将来の成果に向けて準備を重ねること自体を大切にしたい"],
  ["C_PRESENT","いま過ごす時間が充実していること自体を大切にしたい"]
 ].map(([id,txt])=>"- "+id+"：「"+txt+"」 回答1〜7／保留：____");
 const more=candidateOrder.map(id=>replacementCard(byCandidate.get(id)));
 return {
  slot:id,batch:Math.floor(slot/3)+1,
  pairIds:pairs.map(p=>p.pair),allQuestionIds:pairs.flatMap(p=>p.ids),
  candidateOrder,
  markdown:[
   "## 面接枠："+id+"（未割当の空欄。実参加者の識別情報を含めない）",
   "**参加者向け冒頭説明**：この質問票は開発中の研究用です。正解や人事上の評価はなく、質問を飛ばしたり中止したりできます。ご同意いただいた場合に限り、意味の伝わり方と回答理由を匿名で記録します。氏名・連絡先・住所・職場名などは話さないでください。成果は集計して報告し、生回答を公開リポジトリに載せません。",
   "- 口頭同意・説明確認：はい／いいえ（**いいえなら中止**）",
   "- 面接枠ID："+id+"（現実の氏名等との対応表はこのファイルに作らない）",
   "- 実施者コード（匿名）：________",
   "- 途中中止・撤回の有無：________",
   "- 最初の回答理由は自由に聞く（『同じ意味でしょう？』と先に誘導しない）",
   ...cards,
   "### B/Cの独立した重視度（非採点）",
   "この4つは相互の二者択一ではありません。各項目を**独立に1〜7**で評価します。1〜7の意味づけは研究用D210と一致するよう、事前に同じ説明を行ってください。",
   ...probes,
   "中間回答『4』の理由（両方重要／両方重要でない／状況依存／不明／その他）：________",
   "### C36の別案比較（非採点）",
   "既存C36と区別するための研究カードです。正式な50問に入れるものではありません。",
   ...more,
   "### 最後に",
   "- どの質問が分かりにくかったか：________",
   "- どの価値観が質問に含まれていなかったか：________",
   "- 連絡先・氏名などの識別情報は書かない。自由記述は匿名化して保管する。",
   "- 2人の評価者は、回答者の言葉と理由を見て**それぞれ独立に**コード化する。",
   "-----"
  ].join("\n\n")
 };
}
export function createInterviewPlan(){
 assertSource();
 const slots=Array.from({length:SLOTS},(_,i)=>sheet(i));
 const exposures=Object.fromEntries(editorial.pairs.map(p=>[p.pair,0]));
 const seen=new Set();
 for(const s of slots){
  assert.equal(s.pairIds.length,8);
  assert.equal(new Set(s.pairIds).size,8);
  assert.equal(s.allQuestionIds.length,16);
  assert.equal(new Set(s.allQuestionIds).size,16);
  for(const p of P0)assert.ok(s.pairIds.includes(p.pair));
  for(const pair of s.pairIds)exposures[pair]++;
  assert.ok(!seen.has(s.slot));seen.add(s.slot);
 }
 for(const p of P0)assert.equal(exposures[p.pair],24);
 for(const p of others)assert.equal(exposures[p.pair],8);
 return {
  schema:"A05-D237-COGNITIVE-INTERVIEW-PLAN-1",
  status:"BLANK_RESEARCH_SLOTS_NOT_RECRUITED",
  title:"24-slot balanced cognitive interview kit (NO participant data)",
  sourceBank:BANK.schema,sourceEditorial:editorial.schema,
  slots:slots.map(({slot,batch,pairIds,allQuestionIds,candidateOrder})=>
   ({slot,batch,pairIds,allQuestionIds,candidateOrder})),
  pairExposure:exposures,
  counts:{plannedSlots:24,enrolledPeople:0,completedInterviews:0,
   P0PairsEverySlot:3,nonP0PairsPerSlot:5,uniquePairs:18,
   C36_R1First:12,C36_R2First:12},
  noData:true,
  caution:"Allocation is editorial balance only, not statistical sample representativeness or psychometric validation."
 };
}
export function renderInterviewKit(){
 const p=createInterviewPlan();
 const doc=[
 "# A05 D237｜認知面接の実施キット（24枠・すべて空欄）",
 "",
 "**実回答0件・研究用・非採点。UI評価や本番公開とは無関係です。**",
 "",
 "このキットにはD206の原文質問とD232の疑義、C36差替候補を含みます。面接では1問ずつ提示し、まず本人の言葉で説明してもらいます。",
 "個人名や連絡先は記入しないでください。面接前にD233の説明・同意・保存と撤回の条件を確認します。",
 "",
 "## 割り当て概要",
 "| 枠 | 束 | 重点以外の5組 | C36先頭候補 |",
 "|---|---|---|---|",
 ...p.slots.map(s=>"| "+s.slot+" | "+s.batch+" | "+s.pairIds.filter(id=>!P0.some(x=>x.pair===id)).join("、")+" | "+s.candidateOrder[0]+" |"),
 "",
 "各枠：P0の3組は全員、非P0の15組は各8枠へ均等割当。C36-R1/R2先行は各12枠。これは人間を実際に割り当てた記録ではありません。",
 "",
 ...Array.from({length:SLOTS},(_,i)=>sheet(i).markdown),
 "## 終了後の扱い",
 "- この空欄キット自体はGitHubに保管してよいが、記入済みキット・音声・生JSONは**絶対にコミットしない**。",
 "- 評価者の記録は別の非公開領域に保管し、匿名集計のみ共有する。",
 "- 質問の修正可否は根拠のある実回答が得られた後に判断。"
 ].join("\n");
 return doc+"\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const base=resolve(ROOT,"research/a05/generated");
 mkdirSync(base,{recursive:true});
 writeFileSync(resolve(base,"d237-blank-interview-plan.json"),JSON.stringify(createInterviewPlan(),null,2)+"\n");
 writeFileSync(resolve(base,"d237-blank-interview-kit.md"),renderInterviewKit());
 console.log(JSON.stringify({schema:"A05-D237-OUTPUT-1",slots:24,realRespondents:0,
  json:"research/a05/generated/d237-blank-interview-plan.json",
  markdown:"research/a05/generated/d237-blank-interview-kit.md",sizeChars:renderInterviewKit().length}));
}
