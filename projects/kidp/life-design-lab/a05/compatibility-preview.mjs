import { TYPES, GROUPS } from "./types.mjs";
import { COMPATIBILITY_PAIRS, getCompatibilityPair, EVIDENCE_STATUS } from "./compatibility.mjs";

const byId = new Map(TYPES.map(type => [type.id, type]));
const typeA = document.getElementById("type-a");
const typeB = document.getElementById("type-b");

function fillSelect(select, selected) {
  for (const type of TYPES) {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.id + "｜" + type.name;
    select.append(option);
  }
  select.value = selected;
}
fillSelect(typeA, "T02");
fillSelect(typeB, "T11");

function renderItems(id, values, fallback) {
  const target = document.getElementById(id);
  target.replaceChildren();
  for (const value of values.length ? values : [fallback]) {
    const li = document.createElement("li");
    li.textContent = value;
    target.append(li);
  }
}

function renderChip(id, type) {
  const chip = document.getElementById(id);
  chip.dataset.group = GROUPS[type.group].id;
  chip.textContent = type.emoji + " " + type.id + " " + type.name + " / " +
    GROUPS[type.group].name;
}

function render() {
  const first = byId.get(typeA.value);
  const second = byId.get(typeB.value);
  const pair = getCompatibilityPair(first.id, second.id);
  renderChip("chip-a", first);
  renderChip("chip-b", second);
  document.getElementById("pair-summary").textContent = pair.sameType
    ? "同タイプ同士の組合せです。同じラベルでも、実際の価値観や行動が一致するとは限りません。"
    : "4軸のラベルを比較します。違いは良し悪しではなく、対話のための着眼点です。";
  document.getElementById("pair-id").textContent = "組合せ " + pair.id +
    " ／ 136組中の1組（順序なし）";
  renderItems("shared", pair.agreements.map(x =>
    x.axis + "軸｜" + x.description),
    "4軸のラベル上は共通項がありません。ただし、現実の価値観に共通点がないという意味ではありません。");
  renderItems("different", pair.differences.map(x =>
    x.axis + "軸｜" + pair.typeIds[0] + "は「" + x.first +
    "」、" + pair.typeIds[1] + "は「" + x.second + "」という設定です。"),
    "4軸のラベル上は相違がありません。");
  renderItems("tensions", pair.differences.map(x =>
    x.axis + "軸｜" + x.tensionHypothesis),
    "軸ラベル上の相違はありません。実際にすり合わせが不要という意味ではありません。");
  renderItems("complements", pair.differences.map(x =>
    x.axis + "軸｜" + x.complementHypothesis + "（組合せ固有の補完効果は未実証）"),
    "ラベル上の相違がないため、違いによる補完仮説は生成しません。");
  renderItems("prompts", pair.conversationPrompts, "お互いに大切にしたいことを話してみましょう。");
  document.getElementById("evidence").textContent =
    "根拠状態：" + EVIDENCE_STATUS + "。A05のこの組合せを直接検証した研究は確認されていません。" +
    " ここに表示する内容はタイプ定義からの編集上の推論であり、科学的に確認された相性ではありません。";
}
typeA.addEventListener("change", render);
typeB.addEventListener("change", render);
if (COMPATIBILITY_PAIRS.length !== 136) throw new Error("136-pair registry unavailable");
render();
