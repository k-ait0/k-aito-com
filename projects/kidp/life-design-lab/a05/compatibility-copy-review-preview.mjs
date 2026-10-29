import { TYPES } from "./types.mjs";
import { EDITORIAL_PAIRS } from "./compatibility-editorial.mjs";
import { COPY_REVIEW_QUEUE, COPY_AUDIT_SUMMARY } from "./compatibility-copy-audit.mjs";
import { SOURCE_BY_ID } from "./compatibility-literature-candidates.mjs";

const $ = id => document.getElementById(id);
const records = COPY_REVIEW_QUEUE.map((audit, i) => ({
  audit, editorial: EDITORIAL_PAIRS[i]
}));
if (records.length !== 136 ||
    records.some(x => x.audit.pairId !== x.editorial.id) ||
    COPY_AUDIT_SUMMARY.publicationApprovedPairs !== 0)
  throw new Error("C05 preview requires 136 matching, unapproved editorial rows");

function appendOption(select, value, title) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = title;
  select.append(opt);
}
function renderList(id, texts, empty) {
  const target = $(id);
  target.replaceChildren();
  for (const value of texts.length ? texts : [empty]) {
    const li = document.createElement("li");
    li.textContent = value;
    target.append(li);
  }
}
appendOption($("type-filter"), "ALL", "すべてのタイプ");
for (const type of TYPES)
  appendOption($("type-filter"), type.id, type.id + "｜" + type.name);
appendOption($("diff-filter"), "ALL", "すべての相違数");
for (let n = 0; n <= 4; n++)
  appendOption($("diff-filter"), String(n), n + "軸相違（相性ランクではありません）");
appendOption($("flag-filter"), "ALL", "すべての自動監査結果");
appendOption($("flag-filter"), "CLEAR", "自動検出なし（未承認）");
appendOption($("flag-filter"), "FLAGGED", "要確認の表現あり");

let shown = records;

function renderDetails() {
  const id = $("pair-select").value;
  const record = shown.find(x => x.audit.pairId === id);
  if (!record) {
    $("pair-heading").textContent = "該当する組合せはありません";
    for (const name of ["review-status", "review-restrictions", "research",
      "scope", "story"]) $(name).textContent = "";
    for (const name of ["agreements", "differences", "literature",
      "hypotheses", "prompts", "findings"]) $(name).replaceChildren();
    $("previous").disabled = true;
    $("next").disabled = true;
    return;
  }
  const { audit, editorial: pair } = record;
  const index = shown.indexOf(record);
  $("previous").disabled = index === 0;
  $("next").disabled = index >= shown.length - 1;
  $("pair-heading").textContent = pair.editorial.title + "（" + pair.id + "）";
  $("review-status").textContent =
    "人手レビュー：未実施／自動監査：" +
    (audit.automatedClear ? "禁止表現の検出なし" : "要確認 " + audit.automatedFindings.join("・")) +
    "／直接科学検証：なし／公開承認：なし";
  $("review-restrictions").textContent =
    "原本v1.0未照合／B軸構造未決裁／原典の本番引用未承認／Chrome・iOS実機QA未承認";
  renderList("agreements",
    pair.facts.shared.map(x => x.axis + "軸：" + x.label),
    "共通ラベルなし。実際の価値観の共通点が存在しないという意味ではありません。");
  renderList("differences",
    pair.facts.differences.map(x => x.axis + "軸：" + pair.typeIds[0] +
      "「" + x.first + "」／" + pair.typeIds[1] + "「" + x.second + "」"),
    "相違ラベルなし。実際の価値観が完全一致するという意味ではありません。");
  $("research").textContent = pair.generalResearch.researchSummary;
  $("scope").textContent = pair.generalResearch.note;
  const bib = $("literature");
  bib.replaceChildren();
  for (const sourceId of pair.generalResearch.sourceIds) {
    const src = SOURCE_BY_ID[sourceId];
    if (!src || src.publishedClaimApproved ||
        src.directlyValidatesAnyA05Pair) throw new Error("Invalid unapproved literature source");
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = src.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = sourceId + "｜" + src.authors + "（" + src.year + "）";
    li.append(link);
    const context = document.createElement("span");
    context.textContent = "｜適用上の注意：" + src.caution;
    li.append(context);
    bib.append(li);
  }
  $("story").textContent = pair.editorial.story;
  renderList("hypotheses",
    pair.editorial.hypotheses.map(x => x.axis + "軸｜確認事項：" +
      x.friction + "／別の視点（仮説）：" + x.complement),
    "軸ラベル上の違いはありません。実際の関係上の違いがないとは限りません。");
  renderList("prompts", pair.editorial.conversationPrompts,
    "お互いに重視したいことを話してみましょう。");
  renderList("findings", audit.automatedFindings,
    "自動監査では禁止表現を検出していません。人手による文章審査は未実施です。");
}

function applyFilters() {
  const type = $("type-filter").value;
  const differences = $("diff-filter").value;
  const flag = $("flag-filter").value;
  const prev = $("pair-select").value;
  shown = records.filter(({audit, editorial}) => (
    (type === "ALL" || editorial.typeIds.includes(type)) &&
    (differences === "ALL" ||
      editorial.facts.differentAxesCount === Number(differences)) &&
    (flag === "ALL" ||
      (flag === "CLEAR" && audit.automatedClear) ||
      (flag === "FLAGGED" && !audit.automatedClear))
  ));
  const select = $("pair-select");
  select.replaceChildren();
  for (const record of shown)
    appendOption(select, record.audit.pairId, record.editorial.editorial.title);
  if (shown.some(x => x.audit.pairId === prev)) select.value = prev;
  $("list-count").textContent = shown.length + " / 136組を表示。人手レビュー済み 0 / 136組。";
  renderDetails();
}

for (const id of ["type-filter", "diff-filter", "flag-filter"])
  $(id).addEventListener("change", applyFilters);
$("pair-select").addEventListener("change", renderDetails);
for (const [id, step] of [["previous", -1], ["next", 1]]) {
  $(id).addEventListener("click", () => {
    const target = $("pair-select");
    const index = shown.findIndex(x => x.audit.pairId === target.value) + step;
    if (index < 0 || index >= shown.length) return;
    target.value = shown[index].audit.pairId;
    renderDetails();
    $("pair-heading").focus();
  });
}
applyFilters();
