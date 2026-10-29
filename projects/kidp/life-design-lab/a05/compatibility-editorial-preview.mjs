import { TYPES, GROUPS } from "./types.mjs";
import { getEditorialPair, getSelectedPairLabels, EDITORIAL_PAIRS, EDITORIAL_GENERAL_SOURCES } from "./compatibility-editorial.mjs";

const $ = id => document.getElementById(id);
const byId = new Map(TYPES.map(type => [type.id, type]));
const first = $("first"), second = $("second");

for (const select of [first, second]) {
  for (const type of TYPES) {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.id + "｜" + type.name;
    select.append(option);
  }
}
first.value = "T02";
second.value = "T11";

function items(id, values, emptyText) {
  const target = $(id);
  target.replaceChildren();
  for (const item of values.length ? values : [emptyText]) {
    const li = document.createElement("li");
    li.textContent = item;
    target.append(li);
  }
}

function chip(id, typeId) {
  const type = byId.get(typeId);
  const target = $(id);
  target.dataset.group = GROUPS[type.group].id;
  target.textContent = type.emoji + " " + type.id + "｜" + type.name;
}

function showSources() {
  const ul = $("sources");
  ul.replaceChildren();
  for (const src of EDITORIAL_GENERAL_SOURCES) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = src.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = src.authors + "（" + src.year + "）";
    li.append(link);
    const limits = document.createElement("span");
    limits.textContent = "｜" + src.caution;
    li.append(limits);
    ul.append(li);
  }
}

function renderIndex() {
  const list = $("nearby");
  list.replaceChildren();
  for (const type of TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = type.id + " " + type.name;
    button.setAttribute("aria-current", type.id === second.value ? "true" : "false");
    button.addEventListener("click", () => {
      second.value = type.id;
      render();
      $("pair-heading").focus();
    });
    list.append(button);
  }
}

function render() {
  const pair = getEditorialPair(first.value, second.value);
  const selectedLabels = getSelectedPairLabels(first.value, second.value);
  chip("first-name", first.value);
  chip("second-name", second.value);
  $("pair-status").textContent = pair.facts.sharedAxesCount + "軸のラベルが共通、" +
    pair.facts.differentAxesCount + "軸のラベルが相違します（良し悪しの評価ではありません）。";
  $("pair-meta").textContent = "組合せID " + pair.id + "／構造："+
    pair.facts.structure + "／順序を変えても同じ結果。";
  items("shared", pair.facts.shared.map(x => x.axis + "軸｜" + x.label),
    "共通する軸ラベルはありません。実際の価値観に共通点がないという意味ではありません。");
  items("different", selectedLabels.differences.map(x =>
    x.axis + "軸｜" + first.value + "「" + x.first + "」／" +
      second.value + "「" + x.second + "」"),
    "異なる軸ラベルはありません。実際の価値観が完全一致するわけではありません。");
  $("facts-disclaimer").textContent = pair.facts.disclaimer;
  $("research-summary").textContent = pair.generalResearch.researchSummary;
  $("research-note").textContent = pair.generalResearch.note;
  $("story-title").textContent = pair.editorial.title;
  $("story").textContent = pair.editorial.story;
  items("hypotheses", pair.editorial.hypotheses.map(x =>
    x.axis + "軸｜確認したい点：" + x.friction +
    "｜異なる視点の着想：" + x.complement + "（未実証）"),
    "ラベル上の差はありませんが、話し合いが不要という意味ではありません。");
  items("prompts", pair.editorial.conversationPrompts,
    "お互いに大切にしたいことを話してみましょう。");
  $("story-caveat").textContent = pair.editorial.caveat;
  renderIndex();
}

if (EDITORIAL_PAIRS.length !== 136) throw new Error("136 type-pair records required");
showSources();
first.addEventListener("change", render);
second.addEventListener("change", render);
render();