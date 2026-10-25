/**
 * Thin UI for the A05 static-site prototype. All persistence passes through storage.mjs.
 * No registered account, no analytics endpoint and no automatic upload of answers.
 */
import { AXES, QUESTIONS, questionSetHash } from "./questions.mjs";
import { TYPES, GROUPS } from "./types.mjs";
import { newDraft, verifyDraft, scoreAssessment, makeSnapshot } from "./engine.mjs";
import {
  openDatabase, restoreState, enableSaving, saveDraft, replaceDraft, finalizeDraft,
  setRawRetention, removeRawAnswers, deleteAssessment, eraseA05DatabaseContents
} from "./storage.mjs";
import { exportA05Data } from "./export.mjs";

const root = document.querySelector("#a05-content");
const notice = document.querySelector("#a05-notice");
const tabs = document.querySelector("#a05-tabs");
const OWN = (x, k) => Object.prototype.hasOwnProperty.call(x, k);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);
const state = {
  view: "home", db: null, hash: "", draft: null, history: [],
  legacy: [], quarantined: [], consent: false, retainRaw: false,
  readOnly: false, busy: false, selected: null, sample: null,
  filter: "all", share: false, status: ""
};
const uid = () => "a05-" + (globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
const count = () => QUESTIONS.filter(q => OWN(state.draft.answers, q.id)).length;
const wealthLabel = name => ({
  money: "経済的余裕寄り", time: "時間的自由寄り",
  neutral: "中立・境界付近", withheld: "判定保留"
})[name] ?? "判定保留";
const classificationLabel = name => ({
  classified: "方向明確（試験基準）",
  provisional: "暫定判定", withheld: "基本タイプ判定保留"
})[name] ?? "判定保留";

function updateNotice(message = state.status) {
  state.status = message;
  notice.hidden = !message;
  notice.textContent = message || "";
}

/**
 * Prevent rapid taps from being discarded while an asynchronous IndexedDB
 * write is active. Preserve each control's original disabled state across
 * rerenders so a still-unanswered question remains blocked.
 */
function reflectBusy() {
  // Screen readers and acceptance tests can observe when persistence settles.
  root.setAttribute("aria-busy", state.busy ? "true" : "false");
  tabs.setAttribute("aria-busy", state.busy ? "true" : "false");
  for (const control of document.querySelectorAll(
    "#a05-tabs button, #a05-content button, #a05-content input"
  )) {
    if (state.busy) {
      if (control.dataset.a05OriginalDisabled === undefined) {
        control.dataset.a05OriginalDisabled = control.disabled ? "1" : "0";
      }
      control.disabled = true;
    } else if (control.dataset.a05OriginalDisabled !== undefined) {
      control.disabled = control.dataset.a05OriginalDisabled === "1";
      delete control.dataset.a05OriginalDisabled;
    }
  }
}

function render() {
  for (const button of tabs.querySelectorAll("button")) {
    if (button.dataset.view === state.view) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
    button.disabled = button.dataset.view === "result" && !selectedResult();
  }
  const pages = {
    home: renderHome, quiz: renderQuiz, review: renderReview,
    result: renderResult, catalog: renderCatalog, history: renderHistory
  };
  root.innerHTML = pages[state.view]();
  updateNotice();
  reflectBusy();
}

function renderHome() {
  const warnings = state.readOnly ? '<p class="warning">不整合・旧版データを検出しました。通常保存は停止中です。履歴から書き出し・削除できます。</p>' : "";
  const persistence = state.consent
    ? '<div class="card tinted"><strong>端末保存：有効</strong>' +
      '<label class="option"><input type="checkbox" data-setting="raw" ' +
      (state.retainRaw ? "checked" : "") +
      (state.readOnly ? " disabled" : "") +
      '>今後の履歴に個別の生回答も保存する</label>' +
      '<p class="muted">この設定をオフにしても過去の生回答は消えません。履歴画面から削除できます。</p></div>'
    : '<div class="card tinted"><strong>端末保存：無効</strong>' +
      '<p class="muted">未同意の場合、回答と結果はこの画面を閉じると失われる場合があります。</p>' +
      '<label class="option"><input type="checkbox" id="a05-retain-raw">個別の生回答も履歴に保存する（任意）</label>' +
      '<button class="btn" type="button" data-action="enable" ' + (!state.db || state.readOnly ? "disabled" : "") +
      '>この端末への保存に同意する</button></div>';
  return '<h2>まずは、今の価値観から</h2>' +
    '<p class="small">左右の選択肢を7段階で比べます。4は中間、回答できないときは「判断できない」を選べます。</p>' +
    '<div class="card"><strong>30問・5軸・16タイプ</strong>' +
    '<p class="muted">基本4軸から16タイプを整理し、第5軸で経済的余裕と時間的自由の希望を表示します。結果に優劣はありません。</p></div>' +
    '<p class="muted">第5軸の回答では、基本的な生活費と安全が確保されていることを想定してください。</p>' +
    warnings + persistence +
    '<div class="actions"><button type="button" class="btn primary" data-action="start">' +
    (count() ? "回答の続きを見る" : "診断を始める") +
    '</button><button type="button" class="btn" data-view="catalog">16タイプ図鑑</button></div>' +
    '<div class="card"><strong>結果のサンプルを見る</strong>' +
    '<p class="muted">サンプルは本人の回答・履歴を変更しません。</p>' +
    '<div class="actions"><button type="button" class="btn" data-action="sample" data-index="10" data-wealth="time">T11</button>' +
    '<button type="button" class="btn" data-action="sample" data-index="13" data-wealth="money">T14</button></div></div>';
}

function renderQuiz() {
  const index = state.draft.index, q = QUESTIONS[index];
  const axis = AXES.find(a => a.id === q.axis);
  const value = state.draft.answers[q.id];
  return '<div class="small"><strong>質問 ' + (index + 1) + ' / 30</strong> · ' +
    escapeHTML(axis.name) + ' <span id="a05-progress-count">（' + count() + '問回答済み）</span></div>' +
    '<div class="progress" role="progressbar" aria-label="回答の進捗" aria-valuemin="0" aria-valuemax="30" aria-valuenow="' + count() + '"><span id="a05-progress" style="width:' + (count() / 30 * 100) + '%"></span></div>' +
    '<h2 id="a05-question-heading" tabindex="-1">理想に近いのは、どちらですか？</h2>' +
    '<div class="answer-pair"><div><small>左の価値観</small><strong>' + escapeHTML(q.left) + '</strong></div>' +
    '<div><small>右の価値観</small><strong>' + escapeHTML(q.right) + '</strong></div></div>' +
    '<div class="scale-hint"><span>左を強く重視</span><span>右を強く重視</span></div>' +
    '<p class="muted" id="a05-shortcut-hint">キーボードでは数字キー1〜7でも回答できます。</p>' +
    '<fieldset aria-describedby="a05-answer-status a05-shortcut-hint"><legend>質問 ' + (index + 1) +
    '：' + escapeHTML(q.left) + ' と ' + escapeHTML(q.right) +
    ' のどちらを重視しますか。7段階の回答</legend><div class="scale" id="a05-scale">' +
    Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      return '<button type="button" data-action="answer" data-value="' + n +
        '" aria-pressed="' + (value === n) + '" aria-label="' +
        (n === 1 ? "1／7 左を強く重視" : n === 4 ? "4／7 どちらも同程度" :
          n === 7 ? "7／7 右を強く重視" : n + "／7") + '">' + n + '</button>';
    }).join("") + '</div></fieldset>' +
    '<p class="muted" id="a05-answer-status" aria-live="polite">' + answerLabel(value) + '</p>' +
    '<button type="button" class="btn" id="a05-skip" data-action="skip">' +
    (value === null ? "回答不能を取り消す" : "判断できない・回答しにくい") + '</button>' +
    '<div class="actions"><button type="button" class="btn" data-action="previous" ' +
    (index === 0 ? "disabled" : "") + '>← 前へ</button>' +
    '<button type="button" class="btn" data-view="review">回答一覧</button>' +
    '<button type="button" class="btn primary" id="a05-next" data-action="next" ' +
    (value === undefined ? "disabled" : "") + '>' + (index === 29 ? "確認へ" : "次へ →") + '</button></div>';
}

function answerLabel(value) {
  return value === undefined ? "まだ回答していません。4は中間です。" :
    value === null ? "判断できない（有効回答数には含まれません）" :
    value === 4 ? "どちらも同程度" :
    value < 4 ? "左の価値観を重視" : "右の価値観を重視";
}

function updateAnswerControls() {
  const value = state.draft.answers[QUESTIONS[state.draft.index].id];
  for (const button of root.querySelectorAll("#a05-scale button")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.value) === value));
  }
  root.querySelector("#a05-answer-status").textContent = answerLabel(value);
  root.querySelector("#a05-skip").textContent = value === null ?
    "回答不能を取り消す" : "判断できない・回答しにくい";
  root.querySelector("#a05-next").disabled = value === undefined;
  root.querySelector("#a05-progress-count").textContent = "（" + count() + "問回答済み）";
  root.querySelector("#a05-progress").style.width = (count() / 30 * 100) + "%";
  root.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(count()));
}

function renderReview() {
  return '<h2>回答一覧</h2><p class="muted">各質問を選ぶと修正できます。回答不能は入力済みとして扱います。</p>' +
    '<div class="card tinted"><strong>' + count() + ' / 30問 入力済み</strong>' +
    (count() < 30 ? '<p class="muted">未回答は ' + (30 - count()) + '問あります。</p>' :
      '<p class="muted">30問すべて入力済みです。必要なら回答を見直せます。</p>') + '</div>' +
    AXES.map(axis => '<h3>' + axis.id + '｜' + escapeHTML(axis.name) +
      '（' + QUESTIONS.filter(q => q.axis === axis.id && OWN(state.draft.answers, q.id)).length + '/6）</h3>' +
      '<div class="review-grid">' + QUESTIONS.map((q, index) => ({ q, index }))
        .filter(item => item.q.axis === axis.id).map(({ q, index }) => {
          const value = state.draft.answers[q.id];
          const label = value === undefined ? "未回答" : value === null ? "回答不能" :
            value === 4 ? "中間" : value + "/7";
          return '<button type="button" data-action="jump" data-index="' + index +
            '"' + (value === undefined ? ' data-unanswered="true"' : '') +
            ' aria-label="' + escapeHTML(q.id + '：' + q.left + '／' + q.right + '。' + label + '。質問を編集') + '">' +
            '<strong>' + q.id + '</strong><span class="review-prompt">' +
            escapeHTML(q.left) + ' ／ ' + escapeHTML(q.right) + '</span>' +
            '<span class="review-answer">' + escapeHTML(label) + '</span></button>';
        }).join("") + '</div>').join("") +
    '<div class="actions"><button type="button" class="btn" data-view="quiz">回答に戻る</button>' +
    (count() < 30 ? '<button type="button" class="btn primary" data-action="next-unanswered">最初の未回答へ</button>' : '') +
    '<button type="button" class="btn primary" data-action="finish" ' +
    (count() !== 30 || state.consent && state.readOnly ? "disabled" : "") +
    '>診断結果を確定する</button></div>';
}

function renderCatalog() {
  const selected = GROUPS.filter(g => state.filter === "all" || g.id === state.filter);
  const filters = [["all", "すべて"], ["G3", "R・赤"], ["G2", "G・緑"], ["G1", "B・青"], ["G4", "Y・黄"]];
  return '<h2>16タイプ図鑑</h2>' +
    '<p class="muted">仮称と解説です。結果は人生の選択肢を制限するものではありません。</p>' +
    '<div class="actions">' + filters.map(([key, title]) =>
      '<button type="button" class="btn" data-action="filter" data-filter="' + key + '"' +
      (state.filter === key ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      '>' + title + '</button>').join("") + '</div>' +
    selected.map(g => '<h3 style="color:' + g.ink + '">' + g.id + '｜' + escapeHTML(g.name) + '</h3>' +
      '<div class="catalog-grid">' + TYPES.map((t, i) => ({ t, i }))
        .filter(x => GROUPS[x.t.group].id === g.id)
        .map(({ t, i }) => '<button type="button" data-action="sample" data-index="' + i +
          '" data-wealth="neutral" style="background:' + g.tint +
          ';border-color:' + g.color + ';color:' + g.ink + '">' +
          '<span class="emoji" aria-hidden="true">' + escapeHTML(t.emoji) + '</span>' +
          '<strong>' + t.id + ' ' + escapeHTML(t.name) + '</strong>' +
          '<small>' + escapeHTML(t.summary) + '</small></button>').join("") + '</div>').join("");
}

function selectedResult() {
  if (state.sample) return state.sample;
  if (!state.selected) return null;
  return state.history.find(item => item.id === state.selected) ?? null;
}

function sampleAnswers(typeIndex, variant) {
  const group = Math.floor(typeIndex / 4), within = typeIndex % 4;
  const signs = [group >= 2 ? 1 : -1, group % 2 ? 1 : -1,
    within >= 2 ? 1 : -1, within % 2 ? 1 : -1,
    variant === "time" ? 1 : variant === "money" ? -1 : 0];
  return Object.fromEntries(QUESTIONS.map(q => {
    const s = signs["ABCDE".indexOf(q.axis)];
    return [q.id, s === 0 ? 4 : 4 + 3 * s * q.direction];
  }));
}

function axisChart(result) {
  return result.axes.map((axis, i) => {
    const a = AXES[i], value = axis.value;
    const left = value === null ? 50 : value < 0 ? 50 + value / 2 : 50;
    const width = value === null ? 0 : Math.abs(value) / 2;
    return '<div class="value-axis"><strong>' + escapeHTML(a.name) + '</strong>' +
      '<div class="value-track" role="img" aria-label="' + escapeHTML(a.negative) +
      ' から ' + escapeHTML(a.positive) + ' の方向。スコア ' +
      (value === null ? "判定なし" : value) + '">' +
      '<span class="value-fill" style="left:' + left + '%;width:' + width + '%"></span></div>' +
      '<strong>' + (value === null ? "—" : (value > 0 ? "+" : "") + value) + '</strong></div>' +
      '<div class="axis-ends"><span>' + escapeHTML(a.negative) + '</span><span>' +
      escapeHTML(a.positive) + '</span></div><p class="muted" style="margin:3px 0 10px 82px">' +
      axis.n + '/6問 · ' + classificationLabel(axis.status) + '</p>';
  }).join("");
}

function renderResult() {
  const item = selectedResult();
  if (!item) return '<h2>結果はまだありません</h2>';
  const result = item.result, display = item.presentation;
  const group = display ? GROUPS.find(g => g.id === display.group) : null;
  const header = '<div class="result-head" style="background:' + (group?.tint ?? "#f2f5f8") +
    ';border-color:' + (group?.color ?? "#d7e1e8") + '">' +
    '<p class="muted">' + (state.sample ? "サンプル表示：本人の回答・履歴を変更しません" :
      "確定した診断結果") + '</p>' +
    '<strong>' + classificationLabel(result.classification) + '</strong>' +
    '<div class="emoji" aria-hidden="true">' + escapeHTML(display?.emoji ?? "🧭") + '</div>' +
    '<h2>' + escapeHTML(result.typeId ?? "判定保留") + '｜' +
    escapeHTML(display?.name ?? "分類せずに価値観を整理しましょう") + '</h2>' +
    '<p>' + escapeHTML(display?.summary ??
      "基本4軸の方向が定まらなかったため、タイプを無理に割り当てていません。") + '</p>' +
    '<strong>第5軸：' + wealthLabel(result.wealth) + '</strong></div>';
  return '<h2>あなたの価値観の現在地</h2>' + header +
    '<h3>5軸のスコア</h3>' + axisChart(result) +
    '<div class="card tinted"><strong>次の一歩</strong><p>' +
    escapeHTML(display?.action ?? "大切にしたい価値観を一つ書き出す") +
    '</p><span class="muted">A01 → MY LIFE NOTE → 目標設定への連携は今後実装予定です。</span></div>' +
    '<p class="muted">スコアは暫定的な質問への回答から計算したもので、学術的に検証された診断ではありません。</p>' +
    '<div class="actions"><button type="button" class="btn" data-view="catalog">タイプ図鑑</button>' +
    '<button type="button" class="btn" data-view="history">履歴</button>' +
    '<button type="button" class="btn" data-action="share" aria-expanded="' +
    state.share + '" aria-controls="a05-share-panel">' +
    (state.share ? '共有文面を閉じる' : '共有文面を表示') + '</button></div>' +
    (state.share ? '<div class="card" id="a05-share-panel"><label for="a05-share">共有するテキスト（個別回答を含みません）</label>' +
      '<textarea id="a05-share" readonly style="width:100%;min-height:110px">' +
      escapeHTML("A05 人生価値観診断（開発版）\n" +
        (result.typeId ?? "判定保留") + " " + (display?.name ?? "") +
        "\nお金・時間：" + wealthLabel(result.wealth) + "\n※ 個別回答は含みません。") +
      '</textarea></div>' : "");
}

function renderHistory() {
  const warning = state.legacy.length || state.quarantined.length
    ? '<div class="warning">旧版 ' + state.legacy.length + '件、不整合 ' +
      state.quarantined.length + '件を保護しています。未確認の内容は自動採点・自動修復しません。</div>'
    : "";
  return '<h2>診断履歴</h2><p class="muted">保存同意がない場合は、この画面でのみ履歴を保持します。</p>' +
    '<div class="card tinted"><strong>検証済み ' + state.history.length +
    '件</strong><p class="muted">旧版 ' + state.legacy.length +
    '件 · 隔離 ' + state.quarantined.length + '件</p></div>' + warning +
    (state.history.map(item => '<div class="record"><strong>' +
      escapeHTML(item.result.typeId ?? "判定保留") + "｜" +
      escapeHTML(item.presentation?.name ?? "") + '</strong><p class="muted">' +
      escapeHTML(item.completedAt.slice(0, 10)) + ' · ' +
      wealthLabel(item.result.wealth) + ' · 生回答' +
      (OWN(item, "rawAnswers") ? "あり" : "なし") + '</p>' +
      '<div class="actions"><button type="button" class="btn" data-action="open" data-id="' +
      escapeHTML(item.id) + '">結果</button>' +
      (OWN(item, "rawAnswers") ? '<button type="button" class="btn" data-action="scrub" data-id="' +
        escapeHTML(item.id) + '">生回答のみ削除</button>' : "") +
      '<button type="button" class="btn danger" data-action="delete" data-id="' +
      escapeHTML(item.id) + '">履歴を削除</button></div></div>').join("") ||
      '<p class="muted">現在表示できる確定履歴はありません。</p>') +
    (state.legacy.length ? '<h3>旧版履歴（読み取り専用・未検証）</h3>' +
      '<p class="muted">当時の表示内容をそのまま確認できます。現在の採点規則で再計算していません。</p>' +
      state.legacy.map(item => '<div class="record"><strong>' +
        escapeHTML(item.result.typeId ?? "判定保留") + "｜" +
        escapeHTML(item.presentation?.name ?? "旧版の診断結果") + '</strong>' +
        '<p class="muted">' + escapeHTML(item.presentation?.summary?.slice(0, 240) ?? "") + '</p>' +
        '<p class="muted">' + escapeHTML(item.completedAt.slice(0, 10)) +
        ' · 検証されていない旧版スナップショット</p>' +
        '<div class="actions"><button type="button" class="btn danger" data-action="delete-protected" data-kind="legacy" data-id="' +
        escapeHTML(item.id) + '">この旧版履歴だけを削除</button></div></div>').join("") : "") +
    (state.quarantined.length ? '<h3>隔離された履歴</h3>' +
      '<p class="muted">内容の整合性が確認できないため、詳細の自動表示は行いません。まずデータを書き出して保管できます。</p>' +
      state.quarantined.map((item, index) => '<div class="record"><strong>隔離 ' +
        (index + 1) + '</strong><p class="muted">内容未検証・自動修正なし</p>' +
        (typeof item?.id === "string" && item.id ?
          '<button type="button" class="btn danger" data-action="delete-protected" data-kind="quarantined" data-id="' +
          escapeHTML(item.id) + '">この隔離履歴だけを削除</button>' :
          '<p class="muted">識別子が不正なため個別削除はできません。書き出し・全消去のみ利用できます。</p>') +
        '</div>').join("") : "") +
    '<div class="actions"><button type="button" class="btn primary" data-action="new">新しい診断</button>' +
    '<button type="button" class="btn" data-action="export" ' + (!state.db ? "disabled" : "") +
    '>A05保存データを書き出す</button>' +
    '<button type="button" class="btn danger" data-action="erase" ' + (!state.db ? "disabled" : "") +
    '>このA05試作の保存データを全削除</button></div>' +
    '<p class="muted">旧D-12・D-19試作およびP0のデータは、この削除操作の対象外です。</p>';
}

async function persistDraft() {
  if (!state.consent) return;
  if (!state.db || state.readOnly) throw new Error("端末保存を現在利用できません");
  const revision = await saveDraft(state.db, state.draft, state.hash, state.draft.revision);
  state.draft.revision = revision;
}

function failed(error) {
  // Input errors and missing history are recoverable without locking storage.
  // Conflicts and unknown storage failures fail closed to avoid overwrites.
  const code = error?.code;
  if (code === "VALIDATION_ERROR" || code === "NOT_FOUND") {
    state.view = code === "VALIDATION_ERROR" ? "review" : "history";
    updateNotice((code === "VALIDATION_ERROR" ?
      "回答内容を確認してください。" : "対象の履歴が見つかりません。") +
      (error?.message ? "（" + error.message + "）" : ""));
    render();
    return;
  }
  const conflict = code === "REVISION_CONFLICT";
  state.readOnly = state.consent;
  state.view = "home";
  updateNotice((conflict ? "別タブで変更されました。" : "保存・復元処理に失敗しました。") +
    " 自動上書きは停止中です。回答を確認し、必要なら履歴をエクスポートしてください。" +
    (error?.message ? "（" + error.message + "）" : ""));
  render();
}

function confirmAction(message) {
  return typeof window.confirm === "function" && window.confirm(message);
}

async function setAnswer(value) {
  const q = QUESTIONS[state.draft.index];
  const previous = state.draft.answers[q.id];
  if (value === undefined) delete state.draft.answers[q.id];
  else state.draft.answers[q.id] = value;
  try { await persistDraft(); }
  catch (e) {
    if (previous === undefined) delete state.draft.answers[q.id];
    else state.draft.answers[q.id] = previous;
    throw e;
  }
  updateAnswerControls(); // No replacement: retain the selected button's focus.
  // updateAnswerControls can enable Next. Keep it disabled until IndexedDB
  // and the outer event handler have fully completed.
  reflectBusy();
}

async function moveIndex(index) {
  const previous = state.draft.index;
  state.draft.index = index;
  try { await persistDraft(); }
  catch (e) { state.draft.index = previous; throw e; }
  state.view = "quiz";
  render();
  root.querySelector("#a05-question-heading")?.focus({ preventScroll: true });
}

function show(page) {
  if (page === "result" && !selectedResult()) return;
  state.view = page;
  state.share = false;
  render();
  // A re-render removes the clicked control from the DOM. Transfer focus
  // to the new view's heading instead of dropping keyboard/SR users to body.
  const heading = page === "quiz"
    ? root.querySelector("#a05-question-heading")
    : root.querySelector("h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

root.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button || !root.contains(button) || state.busy || button.disabled) return;
  const page = button.dataset.view;
  if (page) { show(page); return; }
  const action = button.dataset.action;
  if (!action) return;
  let focusAfterRender = null;
  state.busy = true;
  reflectBusy();
  try {
    if (action === "start") show("quiz");
    else if (action === "answer") {
      await setAnswer(Number(button.dataset.value));
      focusAfterRender = '[data-action="answer"][data-value="' + button.dataset.value + '"]';
    }
    else if (action === "skip") {
      const old = state.draft.answers[QUESTIONS[state.draft.index].id];
      await setAnswer(old === null ? undefined : null);
      focusAfterRender = '[data-action="skip"]';
    } else if (action === "previous") {
      await moveIndex(Math.max(0, state.draft.index - 1));
    } else if (action === "next") {
      if (!OWN(state.draft.answers, QUESTIONS[state.draft.index].id)) return;
      if (state.draft.index === 29) show("review");
      else await moveIndex(state.draft.index + 1);
    } else if (action === "jump") await moveIndex(Number(button.dataset.index));
    else if (action === "next-unanswered") {
      const unanswered = QUESTIONS.findIndex(q => !OWN(state.draft.answers, q.id));
      if (unanswered >= 0) await moveIndex(unanswered);
    }
    else if (action === "filter") {
      const key = button.dataset.filter;
      if (!["all", "G1", "G2", "G3", "G4"].includes(key)) return;
      state.filter = key;
      render();
      // The old button was replaced by render(); restore its logical focus
      // only after reflectBusy() unlocks the new button in finally.
      focusAfterRender = '[data-action="filter"][data-filter="' + key + '"]';
    }
    else if (action === "sample") {
      const typeIndex = Number(button.dataset.index);
      const sampleDraft = newDraft(uid(), state.hash);
      sampleDraft.answers = sampleAnswers(typeIndex, button.dataset.wealth);
      state.sample = makeSnapshot(sampleDraft, state.hash, false);
      state.selected = null;
      show("result");
    } else if (action === "finish") {
      if (count() !== 30 || state.consent && state.readOnly) return;
      const item = state.consent
        ? await finalizeDraft(state.db, state.draft.assessmentId,
            state.draft.revision, state.hash, state.retainRaw)
        : makeSnapshot(state.draft, state.hash, false);
      state.history = [item, ...state.history];
      state.selected = item.id;
      state.sample = null;
      state.draft = newDraft(uid(), state.hash);
      show("result");
    } else if (action === "new") {
      if (count() && !confirmAction("回答途中の内容を破棄し、新しい診断を始めますか？")) return;
      const draft = newDraft(uid(), state.hash);
      if (state.consent) {
        if (state.readOnly) throw new Error("書き込みが停止されています");
        draft.revision = await replaceDraft(state.db, draft, state.hash, state.draft.revision);
      }
      state.draft = draft;
      state.selected = null;
      state.sample = null;
      show("quiz");
    } else if (action === "enable") {
      if (!state.db || state.readOnly) throw new Error("保存領域を利用できません");
      const raw = !!root.querySelector("#a05-retain-raw")?.checked;
      state.draft.revision = await enableSaving(state.db, state.draft, state.hash, raw);
      state.consent = true;
      state.retainRaw = raw;
      updateNotice("端末への保存を有効にしました。");
      render();
      focusAfterRender = '[data-setting="raw"]';
    } else if (action === "open") {
      state.selected = button.dataset.id; state.sample = null; show("result");
    } else if (action === "scrub") {
      if (!confirmAction("この履歴から生回答のみ削除しますか？結果は残ります。")) return;
      const id = button.dataset.id;
      if (state.consent) await removeRawAnswers(state.db, id);
      state.history = state.history.map(item => {
        if (item.id !== id) return item;
        const { rawAnswers: _removed, ...remaining } = item;
        return remaining;
      });
      render();
      focusAfterRender = "h2";
    } else if (action === "delete") {
      if (!confirmAction("この診断履歴を削除しますか？")) return;
      const id = button.dataset.id;
      if (state.consent) await deleteAssessment(state.db, id);
      state.history = state.history.filter(item => item.id !== id);
      if (state.selected === id) state.selected = null;
      render();
      focusAfterRender = "h2";
    } else if (action === "delete-protected") {
      const id = button.dataset.id;
      const kind = button.dataset.kind;
      const collection = kind === "legacy" ? state.legacy :
        kind === "quarantined" ? state.quarantined : [];
      if (!id || !collection.some(item => item?.id === id)) {
        throw new Error("指定された保護履歴が見つかりません");
      }
      if (!confirmAction("未検証の履歴1件を削除しますか？先にデータの書き出しを推奨します。削除後は再読み込みで復旧を確認してください。")) return;
      if (!state.db) throw new Error("保存領域を利用できません");
      await deleteAssessment(state.db, id);
      if (kind === "legacy") state.legacy = state.legacy.filter(item => item.id !== id);
      else state.quarantined = state.quarantined.filter(item => item?.id !== id);
      // Never automatically unlock writes after deletion; reload verifies
      // the entire persisted state again and uses the latest draft revision.
      state.readOnly = true;
      updateNotice("指定した履歴を削除しました。ほかの履歴は維持しています。再読み込みして残存データの整合性をご確認ください。");
      render();
      focusAfterRender = "h2";
    } else if (action === "export") {
      // The export includes any saved raw answers, legacy records and recovery
      // data. Confirm the privacy scope BEFORE generating a local download.
      if (!confirmAction("A05の保存データをJSONファイルに書き出します。個別の生回答・旧版履歴・隔離データなど、非公開にすべき内容が含まれる場合があります。安全な場所に保存してください。続けますか？")) return;
      const data = await exportA05Data(state.db);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "a05-data-export.json"; document.body.append(a);
      a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      updateNotice("A05の保存データを書き出しました。ファイルには生回答が含まれる場合があります。");
    } else if (action === "erase") {
      if (!confirmAction("このブラウザの新A05試作の保存記録を削除しますか？旧D-12/D-19とP0は対象外です。端末のバックアップなどに残った複製まで消去する操作ではありません。")) return;
      await eraseA05DatabaseContents(state.db);
      state.consent = false;
      state.retainRaw = false;
      state.readOnly = false;
      state.legacy = [];
      state.quarantined = [];
      state.history = [];
      state.draft = newDraft(uid(), state.hash);
      state.selected = null;
      state.sample = null;
      state.view = "home";
      updateNotice("このブラウザの新A05試作の保存記録を削除しました。端末のバックアップ等の複製が残っていないことまでは保証できません。");
      render();
      focusAfterRender = "h2";
    } else if (action === "share") {
      state.share = !state.share;
      render();
      focusAfterRender = '[data-action="share"]';
    }
  } catch (error) { failed(error); }
  finally {
    state.busy = false;
    reflectBusy();
    // The answer handler may enable Next while controls are locked.
    // Re-derive this button's disabled state from the actual answer.
    if (state.view === "quiz" && root.querySelector("#a05-next")) {
      updateAnswerControls();
    }
    if (focusAfterRender) {
      const target = root.querySelector(focusAfterRender);
      if (target && !target.disabled) {
        if (target.matches("h2")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
  }
});

// Optional keyboard acceleration for the 30-question flow. Route through
// the same click handler, busy lock and persistence checks as pointer input.
root.addEventListener("keydown", event => {
  if (state.view !== "quiz" || state.busy || event.repeat ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      !/^[1-7]$/.test(event.key) ||
      event.target.closest("input, textarea, select, [contenteditable]")) return;
  const answer = root.querySelector('[data-action="answer"][data-value="' + event.key + '"]');
  if (!answer || answer.disabled) return;
  event.preventDefault();
  answer.click();
});

tabs.addEventListener("click", event => {
  const button = event.target.closest("button[data-view]");
  if (!button || button.disabled || state.busy) return;
  show(button.dataset.view);
});

root.addEventListener("change", async event => {
  if (event.target.dataset.setting !== "raw" || state.busy) return;
  state.busy = true;
  reflectBusy();
  try {
    if (!state.consent || state.readOnly) throw new Error("保存を変更できません");
    const enabled = event.target.checked;
    await setRawRetention(state.db, enabled);
    state.retainRaw = enabled;
    render();
  } catch (error) { failed(error); }
  finally {
    state.busy = false;
    reflectBusy();
    // Changing raw-answer retention rerenders the checkbox; do not discard
    // keyboard focus after the IndexedDB transaction has settled.
    root.querySelector('input[data-setting="raw"]:not(:disabled)')?.focus({ preventScroll: true });
  }
});

async function initialize() {
  try {
    state.hash = await questionSetHash();
    state.draft = newDraft(uid(), state.hash);
    try {
      state.db = await openDatabase();
      const restored = await restoreState(state.db, state.hash);
      state.consent = restored.consent;
      state.retainRaw = restored.retainRaw;
      state.readOnly = restored.readOnly;
      state.draft = restored.draft ?? state.draft;
      state.history = restored.report.verified.sort((a, b) =>
        b.completedAt.localeCompare(a.completedAt));
      state.legacy = restored.report.legacy;
      state.quarantined = restored.report.quarantined;
      if (restored.report.warnings.length) {
        state.status = restored.report.warnings.join("。");
      }
    } catch (error) {
      state.db = null;
      state.status = "このブラウザでは端末保存を利用できません。診断は保存なしで利用できます。";
    }
    render();
  } catch (error) {
    root.textContent = "この環境では質問セットの整合性を確認できません。HTTPS環境で開いてください。";
    updateNotice(error.message);
  }
}
initialize();
