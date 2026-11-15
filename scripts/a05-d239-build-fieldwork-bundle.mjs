/**
 * A05 D239 — build a BLANK fieldwork bundle for research volunteers.
 * Generated files contain no actual people, answers, names or secrets.
 */
import {writeFileSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createInterviewPlan,renderInterviewKit} from "./a05-d237-build-cognitive-interview-kit.mjs";
import {blankCodingSheet} from "./a05-d238-blind-coding-aggregator.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=resolve(root,"research/a05/generated");
export function makeBlankFieldworkBundle(){
 const plan=createInterviewPlan();
 const blankRaters=plan.slots.flatMap(x=>[
  blankCodingSheet(x.slot,"R1"),blankCodingSheet(x.slot,"R2")
 ]);
 return {plan,interviewMarkdown:renderInterviewKit(),blankRaters};
}
const instructions=[
 "# A05 D239｜認知面接・実施手順（すべて空欄）",
 "",
 "**実回答0件。生成物はテンプレートです。** 自動収集される回答はありません。",
 "",
 "1. d237-blank-interview-kit.md のS01〜S24を、実際に同意を得た面接協力者へ順に割り当てる。枠IDを氏名と結び付けた表はパッケージに保存しない。",
 "2. 各質問を1問ずつ提示し、回答者に自分の言葉で説明してもらう。重複仮説などを先に教えない。C36-R1/R2の提示順は指定枠どおり。",
 "3. 原文50問とB/C独立プローブについては既存のD210オフライン研究フォームを併用できる。C36候補は別カードであり、原C36や採点対象へは置き換えない。",
 "4. 実際の発言・回答メモは非公開のローカル領域で匿名化して保管する。氏名・住所・連絡先は収集しない。撤回があれば研究計画に従う。",
 "5. d239-blank-rater-codes.json から、その枠のR1・R2を別々の評価者に渡し、匿名原資料を元に独立でコーディングする。AIが作成した仮回答で穴埋めしない。",
 "6. 同意確認後のコードシートのみ consentConfirmed: true とする。全8組のpairJudgmentsに SAME_REASON / DISTINCT_REASON / CONFOUNDED / UNCLEAR / SKIPPED のいずれかを記載し、criticalMisunderstandingはtrue/false。",
 "7. C36-R1/R2/R3のcandidateJudgmentsも NEW_C_FACET / OVERLAPS_EXISTING / OTHER_CONFOUND / UNCLEAR / SKIPPED のいずれかで評価する。設問の採否は自動判定しない。",
 "8. コードシートを非公開のJSONにまとめ、参加者の生回答・私的な発言・個人情報を含めずにローカル集計する。",
 "9. 集計例：node scripts/a05-d238-blind-coding-aggregator.mjs PRIVATE_CODER_SHEETS.json > PRIVATE_COUNTS.json",
 "10. 50問の集計例：node scripts/a05-d235-full50-pilot-aggregator.mjs PRIVATE_RECORD1.json PRIVATE_RECORD2.json（1ファイル＝1 D210記録）",
 "",
 "## 品質とプライバシー",
 "- S01等は未使用の研究枠であり、実在する参加者を意味しない。",
 "- 記入済みファイルや生回答をGitHubにコミット・Actionsにアップロードしない。",
 "- 評価者一致は妥当性の保証ではなく、解釈理由を人間が確認する。",
 "- D210補助プローブは1〜7点。C36-R1/R2/R3は非採点。",
 "- G1/G3/G4は人間の実回答と内容判断までBLOCKED / AWAITING_DATAを維持する。",
 ""
].join("\n");
export function outputInstructions(){return instructions;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const kit=makeBlankFieldworkBundle();
 mkdirSync(output,{recursive:true});
 writeFileSync(resolve(output,"d237-blank-interview-plan.json"),JSON.stringify(kit.plan,null,2)+"\n");
 writeFileSync(resolve(output,"d237-blank-interview-kit.md"),kit.interviewMarkdown);
 writeFileSync(resolve(output,"d239-blank-rater-codes.json"),JSON.stringify(kit.blankRaters,null,2)+"\n");
 writeFileSync(resolve(output,"d239-fieldwork-quickstart.md"),outputInstructions());
 console.log(JSON.stringify({schema:"A05-D239-FIELDWORK-BUNDLE-1",
  slots:kit.plan.slots.length,blankRaterSheets:kit.blankRaters.length,
  respondents:0,outputs:["d237-blank-interview-plan.json","d237-blank-interview-kit.md",
   "d239-blank-rater-codes.json","d239-fieldwork-quickstart.md"]}));
}
