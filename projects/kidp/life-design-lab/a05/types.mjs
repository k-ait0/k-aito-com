/**
 * Draft content. Names and explanations are provisional, not expert-validated.
 * RGBY: G1 Blue, G2 Green, G3 Red, G4 Yellow.
 */
export const TYPE_VERSION = "A05-T-1.0.0-draft";
export const CONTENT_VERSION = "A05-C-1.0.0-draft";

export const GROUPS = Object.freeze([
  Object.freeze({ id: "G1", name: "基盤を築く人々", letter: "B", color: "#397fd0", tint: "#e8f2fe", ink: "#203e69" }),
  Object.freeze({ id: "G2", name: "暮らしを育む人々", letter: "G", color: "#259b6d", tint: "#eaf7ef", ink: "#175b42" }),
  Object.freeze({ id: "G3", name: "可能性を拓く人々", letter: "R", color: "#d85151", tint: "#fff0ee", ink: "#792b2b" }),
  Object.freeze({ id: "G4", name: "未来を共創する人々", letter: "Y", color: "#f1c947", tint: "#fff7d8", ink: "#604714" })
]);

const descriptions = [
  ["着実な開拓者", "🗺️", "安心できる基盤から将来の選択肢を広げる", "新しく学びたいことを3つ考える"],
  ["静かな探究者", "📚", "自分のペースで長期目標を深める", "深めたいテーマを一つ選ぶ"],
  ["マイペースな発見家", "🔎", "落ち着いた暮らしで多様な体験を楽しむ", "新しい体験を一つ選ぶ"],
  ["暮らしの職人", "🪴", "好きなことを日々丁寧に育てる", "大切な習慣を一つ決める"],
  ["未来を育む案内人", "🌳", "大切な人と将来の可能性を広げる", "大切な人と将来の希望を話す"],
  ["絆を育てる設計者", "🏡", "信頼関係と長期的な理想を育てる", "共有したい将来の姿を書き出す"],
  ["日常の発見家", "📷", "身近な人と日々の発見を楽しむ", "誰かと楽しみたい体験を考える"],
  ["穏やかな愛好家", "🫖", "親しい人と大切な日常を味わう", "続けたい習慣を整理する"],
  ["未来のフロンティア", "🚀", "新しい環境へ進み将来を切り拓く", "今年の挑戦に優先順位をつける"],
  ["変革の探究者", "⚙️", "変化を力に一つの理想を追求する", "長期目標を支える環境を考える"],
  ["自由な冒険者", "🧭", "自分で道を選び新しい経験を楽しむ", "試したい体験を3つ挙げる"],
  ["自由な求道者", "🎨", "自由な環境で情熱を深める", "集中できる環境を整える"],
  ["共創する開拓者", "🌍", "人と協力して新しい未来を拓く", "一緒に実現したい計画を考える"],
  ["理想を育てる共創者", "✨", "仲間と長期的な理想を形にする", "共有できる長期目標を整理する"],
  ["出会いを楽しむ旅人", "🎈", "人との出会いと新しい経験を楽しむ", "新しい交流の場を探す"],
  ["情熱を分かち合う人", "🎭", "好きなことの喜びを人と分かち合う", "好きな活動を誰と共有するか考える"]
];

export const TYPES = Object.freeze(descriptions.map((row, index) =>
  Object.freeze({
    id: "T" + String(index + 1).padStart(2, "0"),
    group: Math.floor(index / 4),
    name: row[0],
    emoji: row[1],
    summary: row[2],
    action: row[3]
  })
));
