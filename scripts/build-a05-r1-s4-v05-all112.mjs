/** S4 v0.5: reproducibly generate 104 machine-authored review drafts. */
import {readFileSync,writeFileSync} from "node:fs";
const root=new URL("../",import.meta.url),load=p=>JSON.parse(readFileSync(new URL(p,root),"utf8"));
const master=load("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json"),eight=load("docs/A05_S4_V05_P2P3_EIGHT_SEMANTIC_ALTERNATES_20261030.json");
function makeNew(master,eight){
 const action=[
 "新しい学習テーマの下調べ","一つのテーマの継続研究","身近な体験の試行","好きな習慣を磨く活動",
 "大切な人との将来相談","信頼を育てる長期計画","誰かと楽しむ新体験","日常の心地よい交流",
 "新環境へのチャレンジ","理想を追う方法の見直し","自分で選ぶ初めての活動","集中して続ける制作",
 "仲間との新企画","仲間と形にする長期目標","新しい出会いの機会","好きな活動の共有"
 ];
 const context=["図書館の学習会","地域の展示会","週末の体験講座","趣味のサークル","街の情報サイト","地域の交流会","共同制作イベント","公開読書会","季節の文化祭","自主発表会","地域活動の報告","暮らしの講座","小さな写真展","公開ワークショップ","地域の清掃企画","習慣を見直す勉強会"];
 const topic={A:"続ける環境と変えてよい部分",B:"自分で選ぶ工程と周囲に相談する工程",C:"今回の楽しみと将来の準備",D:"複数を試す時間と一つを深める時間"};
 const already=new Set(eight.proposals.map(p=>p.pairId));
 return master.rows.filter(r=>["P2_B1_DIFFERENCE","P3_OTHER"].includes(r.priority)&&!already.has(r.pairId)).map(r=>{
  const i=+r.typeIds[0].slice(1)-1,j=+r.typeIds[1].slice(1)-1;
  const scene=context[(i*7+j*11)%context.length],a=action[i],b=action[j];
  const different=r.differentAxes,common=r.sharedAxes;
  const first=different[(i+j)%different.length];
  const choices=different.length>1?different.filter(ax=>ax!==first):common;
  const second=choices[(i*3+j)%choices.length];
  const shared=common[(i+j*3)%common.length];
  const introductions=[
   scene+"の企画を仮定し、「"+a+"」と「"+b+"」を組み合わせる案を考えます。",
   "「"+a+"」と「"+b+"」を"+scene+"の中で試す場面を置きます。担当者は固定しません。",
   scene+"を続けるため、二つの活動例「"+a+"」「"+b+"」を比較します。",
   "二つの案「"+a+"」と「"+b+"」を、"+scene+"の準備段階で並べます。",
   scene+"を題材に、一方の例を「"+a+"」、もう一方の例を「"+b+"」とします。"
  ];
  const bits=[
   "相違する"+first+"軸の暫定ラベルは「"+topic[first]+"」を考えるための目印です。",
   (different.includes(second)?"さらに"+second+"軸にも異なるラベルがあり、":"一方で"+second+"軸のラベルは共通しますが、")+"「"+topic[second]+"」についての実際の希望を確認する必要があります。",
   shared+"軸の設定ラベルは共通しても、各自が"+scene+"に使える時間・費用まで等しいとは限りません。"
  ];
  const pivot=(i+j)%3;
  const concluding=[
   "編集上の活動例にすぎず、実在の人の人格や相性を示すものではありません。",
   "両方の活動を一人で選ぶ場合もあり、分類から結果は予測できません。",
   "活動の順序や役割は変えられ、本人への確認なしに結論を出せません。"
  ];
  const description=introductions[(i*2+j)%introductions.length]+bits.slice(pivot).concat(bits.slice(0,pivot)).join("")+concluding[(i+j)%3];
  const names="「"+r.displayNames[0]+"」と「"+r.displayNames[1]+"」";
  const questions=[
   names+"が"+scene+"を検討するなら、「"+a+"」と「"+b+"」に使える時間・費用をどう分けたいですか。",
   names+"の活動例に関して、"+first+"軸の「"+topic[first]+"」のどれを先に確認しますか。",
   names+"が"+scene+"の予定を見直すとき、"+second+"軸の「"+topic[second]+"」についてそれぞれ何を質問しますか。"
  ];
  return {pairId:r.pairId,priority:r.priority,typeIds:r.typeIds,names:r.displayNames,sharedAxes:r.sharedAxes,differentAxes:r.differentAxes,
   sourceCopyVersion:r.copyVersion,sourceDescription:r.draftDescription,sourcePrompts:r.draftConversationQuestions,
   candidateDescription:description,candidatePrompts:questions,sceneContext:scene,focusAxes:[first,second,shared],
   provenance:"PROGRAMMATIC_104_PAIR_EDITORIAL_DRAFT_NO_HUMAN_REVIEW",
   firstReviewStatus:"PENDING",secondReviewStatus:"PENDING",
   approved:false,publicationApproved:false,scientificValidation:false};
 });
}
const additional=makeNew(master,eight);const proposals=[...eight.proposals.map(x=>({...x,provenance:"ORIGINAL_EIGHT_AI_EDITORIAL_DRAFT_NO_HUMAN_REVIEW"})),...additional].sort((a,b)=>a.pairId.localeCompare(b.pairId));
const counts={"additional":104,"total":112,"P2":56,"P3":56,"uniqueDescriptions":112,"uniqueQuestions":336,"firstHumanApproved":0,"secondHumanApproved":0};
if(additional.length!==104||proposals.length!==112||new Set(proposals.flatMap(x=>x.candidatePrompts)).size!==336)throw Error("Generation mismatch");
const output={schema:"A05-R1-S4-V05-112PAIR-CANDIDATES-0.1.0-unapproved",preparedOn:"2026-10-30",sourceMaster:{"path":"docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json","sha":"50e1ff7b1cc7fcae27c13b81fd33be46f8ff64a3"},sourceEight:{"path":"docs/A05_S4_V05_P2P3_EIGHT_SEMANTIC_ALTERNATES_20261030.json","sha":"6f94fb1add91c1de55308f803f2d6ef9f1ec966b"},counts,limitations:["104 candidates use 16 stock activity descriptors, 16 scene classes, five paragraph openings and three shared query patterns; they are not independently authored.","Unique strings do not establish semantic difference, editorial usefulness, psychological validity or factual assertions about people.","8 prior alternative pairs are preserved; 136-row v0.4 master remains unchanged.","Independent primary and secondary review, science and owner publication approval remain 0/136."],publication:"NO_GO",proposals};
writeFileSync(new URL("docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json",root),JSON.stringify(output,null,2)+"\n");
console.log("Wrote 112 AI-authored alternatives. Human review: 0.");
