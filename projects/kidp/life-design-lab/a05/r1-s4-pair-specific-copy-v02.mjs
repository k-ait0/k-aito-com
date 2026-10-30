/**
 * A05 R1 S4 v0.2: pair-specific *draft* copy for P1/P2/P3 (120 pairs).
 * Uses two editorial character interests and multiple axis perspectives.
 * Machine-authored, NOT human reviewed, psychometrically validated, or publishable.
 */
import { TYPES } from "./types.mjs";
import { getCompatibilityPair, COMPATIBILITY_VERSION } from "./compatibility.mjs";
import { S3_REVIEW_QUEUE, S3_REVIEW_QUEUE_VERSION } from "./r1-s3-review-queue.mjs";

export const S4_COPY_V02_VERSION = "A05-R1-S4-120PAIR-COPY-0.2.0-unapproved";
const SOURCE_C01 = "A05-COMPAT-C01-0.1.0-editorial";
const SOURCE_S3 = "A05-R1-S3-136PAIR-0.1.0-draft";
const DISCLAIMER = "暫定的なキャラクター設定の対話素材です。個人の価値観や二者の相性、関係の将来を判定しません。";
const B_WARNING = "B軸の「自律／つながり」の二極性は未検証です。本人の希望と関係者への配慮は両立し得ます。";
const FOCUS = Object.freeze([
  ["安心できる基盤を持ちながら将来の選択肢を広げる","学びを増やす計画","維持する生活の条件"],
  ["一つの専門や目標を自分のペースで深める","一つの分野に集中する時間","長期の達成基準"],
  ["落ち着いた暮らしの中に新しい体験を取り入れる","身近な場所での新しい体験","負担の少ない変化"],
  ["今の習慣や好きな活動を丁寧に続ける","日々の習慣を磨く時間","大事にしたい継続"],
  ["身近な人と将来の可能性を考える","将来の希望についての対話","協力の範囲"],
  ["信頼を育てながら長期的な計画を整える","長期の計画を共に練る場面","役割分担と信頼の条件"],
  ["身近な人との日常に新しい発見を取り入れる","身近な人と体験を選ぶ場面","日常の共有時間"],
  ["親しい人と日々の喜びや習慣を味わう","いつもの過ごし方を楽しむ時間","一人の時間と共有の時間"],
  ["新しい環境で将来に向けて試す","環境を変えて新しい挑戦をする計画","備えておきたい条件"],
  ["変化を取り入れながら一つの理想を追う","方法を見直しながら理想を深める場面","変える方法と残す目的"],
  ["自分の意思で新しい経験を選ぶ","新しい活動をその場で試す場面","事前に決めたい範囲"],
  ["自由な環境で一つの関心や技能を深める","集中的に制作や学習を進める時間","集中を維持する条件"],
  ["人と協力しながら新しい未来を形にする","協働する新しい計画を立てる場面","共同決定の範囲"],
  ["仲間と長期的な理想に取り組む","仲間と目標を具体化する時間","役割と目標の見直し方"],
  ["新しい出会いや経験を楽しむ","新しい交流の機会を選ぶ場面","交流の頻度と距離感"],
  ["好きな活動の喜びを他者と分かち合う","好きなことを紹介し合う場面","共有するものと個人に残すもの"]
]);
const SCENES = Object.freeze({
 A:"生活の基盤や取り組む環境を変えるか",
 B:"自分で決める範囲と他の人に相談する範囲をどう考えるか",
 C:"将来に備える時間と今の充実をどう配分するか",
 D:"経験の幅を広げるか、一つを深く続けるか"
});
const axisIds = Object.freeze(["A","B","C","D"]);
const typeInfo=new Map(TYPES.map((t,i)=>[t.id,Object.freeze({
 id:t.id,name:t.name,editorialAim:FOCUS[i][0],example:FOCUS[i][1],questionAnchor:FOCUS[i][2]
})]));
if(COMPATIBILITY_VERSION!==SOURCE_C01 || S3_REVIEW_QUEUE_VERSION!==SOURCE_S3 ||
   TYPES.length!==16 || FOCUS.length!==16 || S3_REVIEW_QUEUE.length!==136)
 throw Error("S4 v0.2 source drift: explicit version review required");
const freezeRows = rows => Object.freeze(rows.map(r=>Object.freeze(r)));

function build(row) {
 if(row.priority==="P0_SAME_TYPE")throw Error("P0 uses previously tailored individual draft");
 const pair=getCompatibilityPair(...row.typeIds);
 if(pair.id!==row.pairId)throw Error("S4 pair ID mismatch");
 const a=typeInfo.get(row.typeIds[0]), b=typeInfo.get(row.typeIds[1]);
 if(!a || !b || a.id===b.id)throw Error("Unknown or same-type pair");
 const diffs=pair.differences,shared=pair.agreements;
 const firstAxis=diffs[0]?.axis, secondAxis=diffs[1]?.axis ?? shared[0]?.axis;
 if(!firstAxis||!secondAxis||firstAxis===secondAxis)
   throw Error("Draft pair must have at least two distinct axis perspectives "+row.pairId);
 const axisDiff=diffs.map(d=>d.axis+"「"+d.first+"／"+d.second+"」");
 const axisShared=shared.map(d=>d.axis+"「"+d.label+"」");
 const aLabel=diffs[0].first,bLabel=diffs[0].second;
 const firstScene=SCENES[firstAxis],secondScene=SCENES[secondAxis];
 const hasCommon=axisShared.length>0;
 const brief = "「"+a.name+"」の編集上の関心は「"+a.editorialAim+"」、"+
  "「"+b.name+"」は「"+b.editorialAim+"」です。"+
  "暫定4軸で異なる表示は"+axisDiff.join("・")+"、"+
  (hasCommon?"共通する表示は"+axisShared.join("・")+"です。":"共通表示はありません。")+
  "設定上の違いは実際の人の性格差や相性を意味しません。";
 const questions=[
  "「"+a.name+"」の「"+a.example+"」と「"+b.name+"」の「"+b.example+
   "」を同じ日に考えるなら、互いに何を優先したいか、どんな事情を先に確認しますか。",
  "「"+a.name+"」の「"+aLabel+"」と「"+b.name+"」の「"+bLabel+
   "」について、"+firstScene+"という場面ではどんな希望の違いや共通点を確認しますか。両方を重視する例も挙げられますか。",
  secondScene+"について、「"+a.name+"」の「"+a.questionAnchor+"」と「"+b.name+
   "」の「"+b.questionAnchor+"」をそれぞれ確かめるなら、どんな問い方が適切ですか。"
 ];
 const references=freezeRows(axisIds.map(axis=>{
  const agreement=shared.find(x=>x.axis===axis),difference=diffs.find(x=>x.axis===axis);
  return {axis,kind:agreement?"COMMON_EDITORIAL_LABEL":"DIFFERENT_EDITORIAL_LABEL",
   labels:agreement?Object.freeze([agreement.label,agreement.label]):
    Object.freeze([difference.first,difference.second]),
   explanationOnly:true,psychologicalMeasurement:false};
 }));
 return Object.freeze({
  pairId:row.pairId,priority:row.priority,
  typeIds:Object.freeze([...row.typeIds]),names:Object.freeze([a.name,b.name]),
  sourceVersions:Object.freeze({c01:COMPATIBILITY_VERSION,s3:S3_REVIEW_QUEUE_VERSION}),
  authorship:"ALGORITHMIC_PAIR_SPECIFIC_REWRITE_NOT_HUMAN_REVIEW",
  typeFrames:Object.freeze([a.editorialAim,b.editorialAim]),
  fourAxisReferences:references,
  differentAxes:Object.freeze([...row.differentAxes]),
  sharedAxes:Object.freeze([...row.sharedAxes]),
  principalAxis:firstAxis,secondaryAxis:secondAxis,
  draftDescription:brief,
  draftDialogueQuestions:Object.freeze(questions),
  b1Warning:B_WARNING,disclaimer:DISCLAIMER,
  pairingRank:null,relationshipQualityPrediction:null,
  firstHumanReview:"PENDING",independentSecondReview:"PENDING",
  scientificPairEvidence:false,copyApproved:false,
  publicationApproved:false
 });
}
export const S4_COPY_V02_120=Object.freeze(
 S3_REVIEW_QUEUE.filter(r=>r.priority!=="P0_SAME_TYPE").map(build)
);
export const S4_COPY_V02_SUMMARY=Object.freeze({
 version:S4_COPY_V02_VERSION,
 draftRecords:S4_COPY_V02_120.length,
 priorityCounts:Object.freeze(Object.fromEntries(
 ["P1_ALL_FOUR_DIFFERENT","P2_B1_DIFFERENCE","P3_OTHER"].map(p=>[
 p,S4_COPY_V02_120.filter(r=>r.priority===p).length]))),
 firstHumanApproved:0,secondHumanApproved:0,published:0,release:"NO_GO"
});
if(S4_COPY_V02_120.length!==120 ||
   new Set(S4_COPY_V02_120.map(x=>x.pairId)).size!==120||
   S4_COPY_V02_SUMMARY.priorityCounts.P1_ALL_FOUR_DIFFERENT!==8||
   S4_COPY_V02_SUMMARY.priorityCounts.P2_B1_DIFFERENCE!==56||
   S4_COPY_V02_SUMMARY.priorityCounts.P3_OTHER!==56)
 throw Error("S4 v0.2 coverage invariant failed");
