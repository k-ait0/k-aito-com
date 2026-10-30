/**
 * A05 R1 S4: machine-generated EDITORIAL CANDIDATES for P2/P3 (112 unordered pairs).
 * Four axis-specific dialogue prompts are assembled for editorial review.
 * NOT HUMAN-REVIEWED, NOT VALIDATED, NOT A LIVE PSYCHOLOGICAL CLASSIFIER.
 */
import { TYPES } from "./types.mjs";
import { getCompatibilityPair, COMPATIBILITY_VERSION } from "./compatibility.mjs";
import { S3_REVIEW_QUEUE, S3_REVIEW_QUEUE_VERSION } from "./r1-s3-review-queue.mjs";

export const S4_REMAINING_VERSION="A05-R1-S4-P2P3-112-DRAFT-0.1.0";
const EXPECTED_C01="A05-COMPAT-C01-0.1.0-editorial";
const EXPECTED_S3="A05-R1-S3-136PAIR-0.1.0-draft";
const DISCLAIMER="暫定的なキャラクター設定の比較です。個人の性格、二者の相性、関係の将来を判定しません。";
const B_CAUTION="B軸の「自律／つながり」は二極性が未検証です。実際には本人の希望と関係者の希望をともに重視できる可能性があります。";
const axisContext=Object.freeze({
 A:Object.freeze([
  "環境や習慣を整える場面","これまでの生活を見直す場面",
  "予定外の変化に向き合う場面","安心できる基盤を考える場面"
 ]),
 B:Object.freeze([
  "自分の希望と関係者の希望を整理する場面","意思決定に他者が関わる場面",
  "個人で決める範囲を考える場面","相談する範囲を決める場面"
 ]),
 C:Object.freeze([
  "将来の準備と今の時間を考える場面","時間を使う優先順位を話す場面",
  "今の充実と将来の選択肢を考える場面","限られた時間で何をするか話す場面"
 ]),
 D:Object.freeze([
  "新しい活動と継続した活動を考える場面","学び方や趣味の選び方を話す場面",
  "いくつかの分野を試す場面","特定のテーマを深く知る場面"
 ])
});
const axisOrder=["A","B","C","D"];
const typeName=new Map(TYPES.map(type=>[type.id,type.name]));
const frozenObjects = rows=>Object.freeze(rows.map(x=>Object.freeze(x)));
if(COMPATIBILITY_VERSION!==EXPECTED_C01 || S3_REVIEW_QUEUE_VERSION!==EXPECTED_S3 ||
   TYPES.length!==16 || S3_REVIEW_QUEUE.length!==136)
 throw new Error("S4 inputs drifted: explicit re-review required");
function pairNumber(id){
 const parts=id.match(/^T(\d\d)-T(\d\d)$/);
 if(!parts)throw new Error("Invalid pair ID "+id);
 return Number(parts[1])*31+Number(parts[2])*17;
}
function createPrompt(pair,axis,position){
 const agreement=pair.agreements.find(a=>a.axis===axis);
 const difference=pair.differences.find(d=>d.axis===axis);
 if(Boolean(agreement)===Boolean(difference))throw new Error("Axis coverage invalid "+pair.id+" "+axis);
 const ctx=axisContext[axis][(pairNumber(pair.id)+position)%4];
 if(agreement)return Object.freeze({
  axis,axisKind:"DRAFT_LABEL_SHARED",labels:Object.freeze([agreement.label,agreement.label]),
  prompt:ctx+"、設定上共通の「"+agreement.label+"」を、それぞれどんな行動や希望として考えますか。",
  independentMeasurement:false
 });
 return Object.freeze({
  axis,axisKind:"DRAFT_LABEL_DIFFERENT",
  labels:Object.freeze([difference.first,difference.second]),
  prompt:ctx+"、一方の「"+difference.first+"」と他方の「"+difference.second+"」は、具体的にどんな選択を指すと思いますか。両方を大切にする場合も考えられますか。",
  independentMeasurement:false
 });
}
function buildCandidate(row){
 if(!["P2_B1_DIFFERENCE","P3_OTHER"].includes(row.priority))throw new Error("P0/P1 should use prior editorial files");
 const orig=getCompatibilityPair(...row.typeIds);
 if(row.pairId!==orig.id || orig.sameType || orig.differences.length===4 ||
    row.typeIds.some(x=>!typeName.has(x)))throw new Error("S4 record mismatch "+row.pairId);
 const prompts=frozenObjects(axisOrder.map(createPrompt.bind(null,orig)));
 const differenceText=orig.differences.map(x=>x.axis+"「"+x.first+"／"+x.second+"」");
 const sharedText=orig.agreements.map(x=>x.axis+"「"+x.label+"」");
 if(differenceText.length<1||sharedText.length<1||differenceText.length+sharedText.length!==4)
  throw new Error("S4 must mention both differences and shared labels: "+row.pairId);
 const [first,second]=row.typeIds.map(x=>typeName.get(x));
 return Object.freeze({
  pairId:row.pairId,priority:row.priority,
  typeIds:Object.freeze([...row.typeIds]),
  names:Object.freeze([first,second]),
  generationMethod:"MACHINE_ASSEMBLED_FOUR_AXIS_DISCUSSION_PROMPTS",
  interpretation:"C_EDITORIAL_DRAFT_NOT_VALIDATED",
  neutralDraft:"「"+first+"」と「"+second+"」は編集上の人物像です。暫定ラベルが異なる観点は"+
    differenceText.join("、")+"、共通する観点は"+sharedText.join("、")+
    "です。これらは本人の価値観や関係の良し悪しを表しません。",
  dialoguePrompts:prompts,
  axisCoverage:Object.freeze([...prompts.map(p=>p.axis)]),
  draftSharedAxes:Object.freeze([...row.sharedAxes]),
  draftDifferentAxes:Object.freeze([...row.differentAxes]),
  noRelationshipOutcomeClaim:true,
  typeMappingFromAssessment:false,
  hasApprovedPairSpecificScientificEvidence:false,
  bAxisWarning:B_CAUTION,
  disclaimer:DISCLAIMER,
  humanFirstReview:"PENDING",
  humanIndependentSecondReview:"PENDING",
  editorialCopyApproved:false,
  scientificClaimApproved:false,
  publicationApproved:false
 });
}
export const S4_REMAINING_112_CANDIDATES=Object.freeze(
 S3_REVIEW_QUEUE.filter(x=>["P2_B1_DIFFERENCE","P3_OTHER"].includes(x.priority)).map(buildCandidate)
);
export const S4_REMAINING_112_SUMMARY=Object.freeze({
 version:S4_REMAINING_VERSION,
 drafted:S4_REMAINING_112_CANDIDATES.length,
 byPriority:Object.freeze({
  P2_B1_DIFFERENCE:S4_REMAINING_112_CANDIDATES.filter(x=>x.priority==="P2_B1_DIFFERENCE").length,
  P3_OTHER:S4_REMAINING_112_CANDIDATES.filter(x=>x.priority==="P3_OTHER").length
 }),
 machineAssembled:true,
 independentlyHumanReviewed:0,
 humanFirstApproved:0,
 humanSecondApproved:0,
 publicationApproved:0,
 productionStatus:"NO_GO"
});
if(S4_REMAINING_112_CANDIDATES.length!==112 ||
   new Set(S4_REMAINING_112_CANDIDATES.map(x=>x.pairId)).size!==112 ||
   S4_REMAINING_112_SUMMARY.byPriority.P2_B1_DIFFERENCE!==56 ||
   S4_REMAINING_112_SUMMARY.byPriority.P3_OTHER!==56)
 throw new Error("S4 P2/P3 112-pair coverage failed");
