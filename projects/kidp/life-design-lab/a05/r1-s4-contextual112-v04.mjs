/**
 * A05 R1 S4 v0.4: contextual EDITORIAL draft for 112 P2/P3 pairs.
 * This code does not evaluate persons, validate psychology, predict compatibility,
 * compute match scores, persist data or authorize publication.
 */
import { TYPES } from "./types.mjs";
import { getCompatibilityPair, COMPATIBILITY_VERSION } from "./compatibility.mjs";
import { S3_REVIEW_QUEUE, S3_REVIEW_QUEUE_VERSION } from "./r1-s3-review-queue.mjs";

export const S4_CONTEXTUAL_112_VERSION = "A05-R1-S4-P2P3-112-CONTEXTUAL-0.4.0-unapproved";
const PREFERENCE_NOTE = "これは暫定キャラクター設定から作った対話の例です。実際の人の好みや相性を推測するものではありません。";
const B1_WARNING = "B軸の「自律／つながり」は未検証の二極的な編集ラベルです。自分の希望と他者への配慮は両立し得ます。";
const scenes=Object.freeze([
 ["新しい学習テーマを選ぶ","学びたい内容と生活の負担をすり合わせる","学びたい分野"],
 ["関心のある分野を継続して学ぶ","集中して取り組める時間や場所を整える","集中する時間"],
 ["日常に小さな体験を加える","新しい体験に使える時間や費用を調整する","身近な体験"],
 ["好きな活動を続ける","大切にしたい日々の習慣を確認する","継続したい習慣"],
 ["大切な人と将来の選択肢を話す","共有したい計画と個人の選択を区別する","将来の希望"],
 ["長期の計画を誰かと考える","信頼や役割分担の条件を相談する","計画を見直す条件"],
 ["身近な人と新しい体験を探す","一緒にすることと別々にすることを選ぶ","共有する体験"],
 ["親しい人と日常の楽しみを選ぶ","関わる頻度と一人で過ごす時間を確認する","心地よい距離"],
 ["新たな環境での挑戦を検討する","変化に必要な備えと維持したい基盤を確認する","挑戦する条件"],
 ["理想に向けて活動方法を見直す","変えたい方法と続けたい目的を整理する","進め方の変更"],
 ["新しい活動を自分で選ぶ","試してみる範囲と事前に確かめたい条件を決める","試す活動"],
 ["制作や学習にじっくり取り組む","集中時間と周囲に相談したい場面を分ける","集中の環境"],
 ["新しい企画を誰かと進める","共同で決める部分と個人で進める部分を整理する","共同企画"],
 ["仲間と長期目標に取り組む","役割分担と目標を変更する条件を話す","長期目標"],
 ["初めての交流や体験を検討する","参加頻度と無理のない距離感を確認する","参加の希望"],
 ["好きなことを人と共有する","一緒に楽しむ活動と個人の楽しみを区別する","共有する活動"]
]);
const diffScene=Object.freeze({
 A:Object.freeze({topic:"生活環境を変えるか維持するか",prompt:"生活の基盤を残したい部分と見直したい部分を、それぞれ一つずつ挙げるとどうなりますか。",counter:"住む環境は維持しつつ、新しい活動を試すという選択も考えられます"}),
 B:Object.freeze({topic:"自分で決める部分と関係者と相談する部分",prompt:"各自が決めたいことと、関係者の希望を確認したいことを分けると、具体的に何が挙がりますか。",counter:"個人の意思と関係者への配慮は、同時に重視できます"}),
 C:Object.freeze({topic:"今の充実と将来への準備",prompt:"今日の楽しみを残しながら、将来のために備える時間をどう確保したいですか。",counter:"今を大切にすることと将来を考えることは両立できます"}),
 D:Object.freeze({topic:"経験を広げることと一つを深めること",prompt:"新しく試したいことと、じっくり続けたいことをそれぞれ一つ挙げられますか。",counter:"広く試す分野と深く続ける分野は同じ人の中にもあり得ます"})
});
const sameScene=Object.freeze({
 A:Object.freeze({topic:"安心できる生活基盤",probe:"両方の活動を行うために、どの生活上の条件を維持しておきたいですか。"}),
 B:Object.freeze({topic:"意思決定の進め方",probe:"それぞれの活動で、各自で決めたい範囲と他者に相談したい範囲は同じでしょうか。"}),
 C:Object.freeze({topic:"時間の優先順位",probe:"短期の満足と長期の見通しについて、それぞれどのような希望がありますか。"}),
 D:Object.freeze({topic:"学びや体験への取り組み方",probe:"興味を広げる部分と繰り返し深める部分を、活動ごとにどう分けますか。"})
});
if(TYPES.length!==16 || scenes.length!==16 ||
   COMPATIBILITY_VERSION!=="A05-COMPAT-C01-0.1.0-editorial" ||
   S3_REVIEW_QUEUE_VERSION!=="A05-R1-S3-136PAIR-0.1.0-draft" ||
   S3_REVIEW_QUEUE.length!==136)
 throw new Error("S4 v0.4 source gate failed");
const info=new Map(TYPES.map((x,i)=>[x.id,Object.freeze({
  id:x.id,name:x.name,activity:scenes[i][0],practical:scenes[i][1],anchor:scenes[i][2]
})]));
const freezeRowList=items=>Object.freeze(items.map(x=>Object.freeze(x)));
function build(row) {
 if(!["P2_B1_DIFFERENCE","P3_OTHER"].includes(row.priority))
   throw new TypeError("S4 contextual generator only covers P2/P3");
 const pair=getCompatibilityPair(...row.typeIds);
 if(pair.id!==row.pairId || pair.sameType ||
    pair.differences.length<1 || pair.agreements.length<1 ||
    pair.differences.length+pair.agreements.length!==4)
   throw new Error("S4 112 original structure mismatch: "+row.pairId);
 const a=info.get(row.typeIds[0]),b=info.get(row.typeIds[1]);
 if(!a||!b)throw new Error("Missing editorial character label "+row.pairId);
 const different=pair.differences;
 const common=pair.agreements;
 const primary=different[0],secondary=different[1]||common[0];
 const d=diffScene[primary.axis];
 const c=sameScene[common[0].axis];
 const multi=secondary.axis===primary.axis?null:secondary.axis;
 if(!multi)throw new Error("Requires two different axis perspectives");
 const firstText="たとえば、「"+a.activity+"」という案と「"+b.activity+
   "」という案を見比べます。どちらを優先すべきかは、実際の希望や使える時間によって変わります。";
 const contrastText="設定上の相違の一つは「"+d.topic+"」です。一方のラベルは「"+
  primary.first+"」、他方は「"+primary.second+"」ですが、"+
  d.counter+"。";
 const sharedText="共通する暫定ラベルは「"+common[0].label+"」です。ただし、"+
  c.topic+"について考える場合も、具体的な希望が一致するとは限りません。";
 const description=firstText+contrastText+sharedText;
 const prompts=[
  "「"+a.name+"」の例である「"+a.anchor+"」と、「"+b.name+"」の例である「"+
   b.anchor+"」を考えたとき、実際に取り組みたいことと、使える時間・負担をそれぞれどう整理しますか。",
  "「"+a.activity+"」と「"+b.activity+"」のどちらにも当てはまる場合、"+
   d.prompt,
  "「"+a.name+"」の例では"+a.practical+"こと、「"+b.name+"」の例では"+
   b.practical+"ことを取り上げます。"+c.probe
 ];
 const axes=freezeRowList(["A","B","C","D"].map(axis=>{
  const agreement=common.find(y=>y.axis===axis),difference=different.find(y=>y.axis===axis);
  if(Boolean(agreement)===Boolean(difference))throw new Error("Axis coverage invalid: "+axis);
  return {axis,structuralStatus:agreement?"SHARED_DRAFT_LABEL":"DIFFERENT_DRAFT_LABEL",
    labels:Object.freeze(agreement?[agreement.label,agreement.label]:[difference.first,difference.second]),
    empiricallyValidated:false}
 }));
 return Object.freeze({
  pairId:row.pairId,priority:row.priority,
  typeIds:Object.freeze([...row.typeIds]),
  names:Object.freeze([a.name,b.name]),
  sourceVersions:Object.freeze({c01:COMPATIBILITY_VERSION,s3:S3_REVIEW_QUEUE_VERSION}),
  authorship:"MACHINE_AUTHORED_CONTEXTUAL_EDITORIAL_DRAFT_NOT_HUMAN_REVIEW",
  draftDescription:description,
  draftConversationQuestions:Object.freeze(prompts),
  coveredAxisIds:Object.freeze(["A","B","C","D"]),
  principalAxis:primary.axis,secondAxis:secondary.axis,
  differenceAxisIds:Object.freeze(different.map(x=>x.axis)),
  commonAxisIds:Object.freeze(common.map(x=>x.axis)),
  fourAxisReferences:axes,
  nonPredictiveCaution:PREFERENCE_NOTE,
  bAxisCaution:B1_WARNING,
  noPsychologicalTypeAssignment:true,personalAssessmentPerformed:false,
  compatibilityScore:null,relationshipPrediction:null,
  reviewer1:null,reviewer2:null,
  humanFirstReview:"PENDING",humanIndependentSecondReview:"PENDING",
  copyApproved:false,scienceApproved:false,publicationApproved:false
 });
}
export const S4_CONTEXTUAL_112_DRAFTS=Object.freeze(
 S3_REVIEW_QUEUE.filter(r=>["P2_B1_DIFFERENCE","P3_OTHER"].includes(r.priority)).map(build)
);
export const S4_CONTEXTUAL_112_SUMMARY=Object.freeze({
 version:S4_CONTEXTUAL_112_VERSION,
 count:S4_CONTEXTUAL_112_DRAFTS.length,
 byPriority:Object.freeze({
  P2_B1_DIFFERENCE:S4_CONTEXTUAL_112_DRAFTS.filter(x=>x.priority==="P2_B1_DIFFERENCE").length,
  P3_OTHER:S4_CONTEXTUAL_112_DRAFTS.filter(x=>x.priority==="P3_OTHER").length
 }),
 firstHumanApproved:0,independentSecondApproved:0,
 scienceValidated:false,publicationApproved:false,release:"NO_GO"
});
if(S4_CONTEXTUAL_112_DRAFTS.length!==112 ||
   new Set(S4_CONTEXTUAL_112_DRAFTS.map(x=>x.pairId)).size!==112 ||
   S4_CONTEXTUAL_112_SUMMARY.byPriority.P2_B1_DIFFERENCE!==56 ||
   S4_CONTEXTUAL_112_SUMMARY.byPriority.P3_OTHER!==56)
 throw new Error("S4 v0.4 112-pair coverage invalid");
