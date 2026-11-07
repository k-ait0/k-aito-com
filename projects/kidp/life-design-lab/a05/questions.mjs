/**
 * A05 value-preference questionnaire. Draft wording, NOT a validated psychometric test.
 * The polarity is defined against the right-hand concept for each axis.
 * v2 displays negative left / positive right consistently. The scorer still accepts versioned direction=-1 records.
 */
export const QUESTION_SET_VERSION = "A05-Q-2.0.0-draft";

export const AXES = Object.freeze([
  { id: "A", name: "環境", negative: "安定", positive: "変化" },
  { id: "B", name: "関係", negative: "自律", positive: "つながり" },
  { id: "C", name: "時間", negative: "将来", positive: "現在" },
  { id: "D", name: "経験", negative: "探索", positive: "深耕" },
  { id: "E", name: "豊かさ", negative: "経済的余裕", positive: "時間的自由" }
]);

const BANK = [ 
  [
    ["住み慣れた街や住環境を整えて暮らす", "新しい街や異なる住環境を試して暮らす"],
    ["行きつけの場所や馴染みの空間を持つ", "毎回違う場所や新しい空間に出かける"],
    ["気心の知れたメンバーやコミュニティで活動する", "新しい顔ぶれや未知のコミュニティに飛び込む"],
    ["日々の生活リズムやルーティンを一定に保つ", "時期や気分によって生活スタイルを大きく変える"],
    ["今の仕事・活動環境を育てる", "別の仕事・活動環境を経験する"],
    ["勝手がわかる環境で確実に力を発揮する", "アウェーな環境（未知の場）に身を置いて刺激を受ける"]
  ],
  [
    ["自分で判断する余地を重視する", "周囲と相談する機会を重視する"],
    ["自由時間は誰にも気を使わず一人で過ごしたい", "予定を合わせてでも親しい人たちと過ごしたい"],
    ["自分自身が納得できる基準で成果を出す", "周囲と喜びや手応えを共有できる成果を出す"],
    ["自分のペースで予定を決める", "周囲と予定を合わせる"],
    ["最初から最後まで自分の裁量で完結できる取り組み", "役割を分担し、チームで助け合いながら進める取り組み"],
    ["住む場所や働き方は自分の希望条件を最優先する", "大切な人との物理的な近さや関わりやすさを最優先する"]
  ],
  [
    ["将来の選択肢を増やす活動", "今日の充実を高める活動"],
    ["今は少し我慢してでも数年後の大きな安心を作る", "先のことは気にしすぎず今日一日の心地よさを優先する"],
    ["後で役立つ知識を学ぶ", "今の関心を満たす知識を学ぶ"],
    ["過程が地道でも将来大きな成果につながる挑戦", "将来の役立ち度は未知数でも今この瞬間が夢中になれる挑戦"],
    ["長期の目標に向けた小さな前進", "日々の満足を増やす小さな工夫"],
    ["数年後の理想から逆算して今の計画を立てる", "その時々の直感や目の前の状況に応じて柔軟に動く"]
  ],
  [
    ["未経験の趣味を試す", "好きな趣味を深める"],
    ["幅広い分野を学ぶ", "一つの分野を掘り下げる"],
    ["食事や外出では、まだ行ったことのない店や場所を開拓する", "気に入った店や場所へ繰り返し通い、味わいを深める"],
    ["新しい仕事の進め方を試す", "得意な進め方を磨く"],
    ["いろいろな役割やスキルを掛け合わせる（多能工）", "一つの専門領域やスキルを極める（専門職）"],
    ["ある程度わかったら次の新しいテーマへ移る", "一度始めたテーマを納得いくまで長く続ける"]
  ],
  [
    ["収入を増やせる働き方", "自由な時間を確保できる働き方"],
    ["臨時で空いた時間があれば、追加収入になる活動を入れる", "収入は増えなくても、休養や自分のための時間に充てる"],
    ["時間はかかっても出費を抑えて手元のお金を残す", "お金を払ってでも手間や移動を減らし自由な時間を買う"],
    ["拘束時間や責任が増えても、高い報酬が得られる選択", "報酬はそこそこでも、負荷が少なくゆとりを持てる選択"],
    ["質の高いモノや特別な体験にお金をかけられる暮らし", "お金はあまり使わなくても、時間に追われず過ごせる暮らし"],
    ["口座残高や経済的な備えが増えていくことに安心を感じる", "スケジュールに空白や余白があることに安心を感じる"]
  ]
];

export const QUESTIONS = Object.freeze(
  Array.from({ length: 6 }, (_, i) =>
    AXES.map((axis, j) => {
      const [negative, positive] = BANK[j][i];
      return Object.freeze({
        id: axis.id + "0" + (i + 1),
        axis: axis.id,
        direction: 1,
        left: negative,
        right: positive
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
