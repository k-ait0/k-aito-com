/**
 * A05 value-preference questionnaire. Draft wording, NOT a validated psychometric test.
 * The polarity is defined against the right-hand concept for each axis.
 * Qxx alternates visual direction; direction=-1 compensates for that reversal.
 */
export const QUESTION_SET_VERSION = "A05-Q-1.0.0-draft";

export const AXES = Object.freeze([
  { id: "A", name: "環境", negative: "安定", positive: "変化" },
  { id: "B", name: "関係", negative: "自律", positive: "つながり" },
  { id: "C", name: "時間", negative: "将来", positive: "現在" },
  { id: "D", name: "経験", negative: "探索", positive: "深耕" },
  { id: "E", name: "豊かさ", negative: "経済的余裕", positive: "時間的自由" }
]);

const BANK = [
  [
    ["一つの地域で暮らしを育てる", "複数の地域で暮らしを経験する"],
    ["慣れた環境を長く活かす", "新しい環境へ定期的に移る"],
    ["心地よい日常の形を維持する", "日常の形を更新し続ける"],
    ["今ある生活基盤を活かす", "生活基盤を作り直す"],
    ["一つの環境をより良く育てる", "異なる環境を経験していく"],
    ["現在の拠点を保って挑戦する", "拠点そのものを変えて挑戦する"]
  ],
  [
    ["自分の希望を中心に決める", "大切な人との希望の一致を重視する"],
    ["自分で生活を組み立てる余地", "身近な人と生活を共有する機会"],
    ["自分が望む達成を大切にする", "誰かと共有できる達成を大切にする"],
    ["自分の希望する場所を選ぶ", "大切な人との距離を重視して選ぶ"],
    ["自分だけでも実現したい目標", "大切な人と実現したい目標"],
    ["自分の希望に合わせて方向を決める", "関係者と方向をすり合わせる"]
  ],
  [
    ["数年後の達成につながる日々", "毎日の充実を感じられる日々"],
    ["将来の目標に備える活動", "今の満足につながる活動"],
    ["将来使いたい知識を身につける", "今知りたいことを学ぶ"],
    ["長期的な成果につながる挑戦", "取り組む過程を楽しめる挑戦"],
    ["後から得られる充実を優先", "すぐに得られる充実を優先"],
    ["将来の理想に近づく感覚", "今の生活に満足できる感覚"]
  ],
  [
    ["さまざまな趣味を試す", "好きな趣味を長く深める"],
    ["幅広い分野を知る", "一つの分野を深く理解する"],
    ["未経験のことを数多く経験する", "気に入った経験を繰り返し深める"],
    ["異なるテーマに取り組む", "一つのテーマを追究する"],
    ["複数領域に知識を広げる", "特定領域への理解を深める"],
    ["経験の種類を増やす", "大切な経験の深さを増やす"]
  ],
  [
    ["収入に余裕のある働き方", "自由時間に余裕のある働き方"],
    ["追加収入を得る", "自由時間を増やす"],
    ["収入のために使う時間を増やす", "自分で使える時間を増やす"],
    ["使えるお金の余裕を広げる", "使える時間の余裕を広げる"],
    ["可処分所得を月3万円増やす", "自由時間を週3時間増やす"],
    ["経済的な選択肢を広げる", "時間の使い方の選択肢を広げる"]
  ]
];

export const QUESTIONS = Object.freeze(
  Array.from({ length: 6 }, (_, i) =>
    AXES.map((axis, j) => {
      const [negative, positive] = BANK[j][i];
      const reversed = (i + j) % 2 === 1;
      return Object.freeze({
        id: axis.id + "0" + (i + 1),
        axis: axis.id,
        direction: reversed ? -1 : 1,
        left: reversed ? positive : negative,
        right: reversed ? negative : positive
      });
    })
  ).flat()
);

// Deterministic order, all fields relevant to calculation and participant wording.
// Never normalize or silently modify an already-published version.
export function canonicalQuestionManifest(questions = QUESTIONS) {
  return JSON.stringify(questions.map(q => [
    q.id, q.axis, q.direction, q.left, q.right
  ]));
}

export async function questionSetHash(questions = QUESTIONS) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("SHA-256 is unavailable: secure context required");
  }
  const bytes = new TextEncoder().encode(canonicalQuestionManifest(questions));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
