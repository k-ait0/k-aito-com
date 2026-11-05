/**
 * A05 D88 interactive, ephemeral editor preview.
 * Same-origin GET retrieves question text only. User answers are never sent/saved.
 */
import { BC_PILOT_SCHEMA, validateBCPilotBank, scoreBCPilot } from "./bc-pilot-engine.mjs";
const el = id => document.getElementById(id);
const answers = Object.create(null);
const presetNames = {
  both_high: "全尺度7（両方高い）",
  both_low: "全尺度1（両方低い）",
  opposed: "尺度によって1と7が交差",
  incomplete: "1問だけ判断できない"
};
const choiceLabel = value => value === null ? "判断できない" : String(value);
let bank;
function create(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function syncInputs() {
  for (const input of el("questions").querySelectorAll('input[type="radio"]')) {
    const selected = Object.prototype.hasOwnProperty.call(answers, input.name);
    input.checked = selected && input.value === (answers[input.name] === null ? "skip" : String(answers[input.name]));
  }
}
function render() {
  const summary = scoreBCPilot(bank, answers);
  el("progress").textContent = String(summary.selectedCount) + " / " + String(summary.totalCount) +
    "問選択済み。各尺度3問の数値回答が揃うと平均を表示します。";
  const container = el("results");
  container.replaceChildren();
  for (const scale of summary.scales) {
    const card = create("section", undefined, "result");
    card.dataset.facet = scale.id;
    card.dataset.mean = scale.mean === null ? "" : String(scale.mean);
    card.append(create("h3", scale.label));
    const number = create("p", scale.mean === null ?
      "集計不可（未選択 " + scale.unselected + "問／判断不能 " + scale.cannotJudge + "問）" :
      scale.mean.toFixed(2) + " / 7", "number");
    card.append(number);
    if (scale.mean !== null) {
      const meter = create("meter");
      meter.min = 1; meter.max = 7; meter.value = scale.mean;
      meter.setAttribute("aria-label", scale.label + "の平均");
      card.append(meter);
    }
    card.append(create("p", "数値回答 " + scale.rated + " / 3問", "small"));
    container.append(card);
  }
  el("classification").textContent = "タイプID：発行しない ／ 分類状態：保留 ／ 旧16タイプへの変換：行わない ／ 測定妥当性：未検証";
}
function showQuestions() {
  const questions = el("questions");
  questions.replaceChildren();
  for (const item of bank.items) {
    const fieldset = create("fieldset", undefined, "item");
    fieldset.dataset.questionId = item.id;
    fieldset.append(create("legend", item.id + "｜" + item.text));
    const options = create("div", undefined, "options");
    for (const value of [...bank.response.values, null]) {
      const input = create("input");
      input.type = "radio";
      input.name = item.id;
      input.value = value === null ? "skip" : String(value);
      input.id = "answer-" + item.id + "-" + input.value;
      input.addEventListener("change", () => {
        answers[item.id] = value;
        render();
      });
      const label = create("label", undefined, "option");
      label.htmlFor = input.id;
      label.append(input, create("span", choiceLabel(value)));
      options.append(label);
    }
    fieldset.append(options);
    questions.append(fieldset);
  }
}
function loadFixture(fixture) {
  for (const id of Object.keys(answers)) delete answers[id];
  for (const facet of bank.facets) {
    const questions = bank.items.filter(q => q.facet === facet.id);
    const values = fixture.by_facet[facet.id];
    if (!Array.isArray(values) || values.length !== questions.length)
      throw new Error("Invalid fixture");
    questions.forEach((question, index) => { answers[question.id] = values[index]; });
  }
  scoreBCPilot(bank, answers);
  syncInputs();
  render();
}
async function init() {
  const path = new URL("../../../../docs/A05_D87_BC_PILOT_20261105.json", import.meta.url);
  const response = await fetch(path, { credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error("Question bank HTTP " + response.status);
  bank = validateBCPilotBank(await response.json());
  if (bank.schema !== BC_PILOT_SCHEMA) throw new Error("Pilot version mismatch");
  showQuestions();
  const select = el("preset");
  select.replaceChildren();
  for (const fixture of bank.fixtures) {
    const option = create("option", presetNames[fixture.id] || fixture.id);
    option.value = fixture.id;
    select.append(option);
  }
  select.disabled = false;
  el("load-preset").disabled = false;
  el("reset").disabled = false;
  el("load-preset").addEventListener("click", () => {
    const fixture = bank.fixtures.find(f => f.id === select.value);
    if (fixture) loadFixture(fixture);
  });
  el("reset").addEventListener("click", () => {
    for (const id of Object.keys(answers)) delete answers[id];
    syncInputs();
    render();
  });
  el("load-state").textContent = "質問12問を読み込みました。";
  render();
}
init().catch(error => {
  el("load-state").textContent = "質問の読み込みに失敗しました。HTTP(S)の静的サーバーで確認してください。";
  console.error("A05 D88 preview failed", error);
});
