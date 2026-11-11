import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AXES, QUESTIONS } from '../projects/kidp/life-design-lab/a05/questions.mjs';
import { TYPES, GROUPS } from '../projects/kidp/life-design-lab/a05/types.mjs';
import { newDraft, makeSnapshot } from '../projects/kidp/life-design-lab/a05/engine.mjs';
import { renderReport } from '../projects/kidp/life-design-lab/a05/report.mjs';
import { renderVisualPreview } from '../projects/kidp/life-design-lab/a05/visual-preview.mjs';
import { resolveVisualDisplay } from '../projects/kidp/life-design-lab/a05/visual-contract.mjs';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../projects/kidp/life-design-lab/a05');
const appSource = readFileSync(resolve(dir, 'app.mjs'), 'utf8');
const dropImports = source => source.replace(/import[\s\S]*?from ["'][^"']+["'];?\s*/g, '');

function fixture() {
  const events = {};
  let printed = 0;
  const element = () => ({
    dataset: {}, style: {}, disabled: false, textContent: '',
    setAttribute() {}, focus() {}, matches() { return false; }
  });
  const root = {
    innerHTML: '', textContent: '',
    setAttribute() {}, contains() { return true; },
    addEventListener(type, callback) { events[type] = callback; },
    querySelector() { return element(); }, querySelectorAll() { return []; }
  };
  const tabs = { setAttribute() {}, querySelectorAll() { return []; }, addEventListener() {} };
  const notice = { hidden: true, textContent: '' };
  const document = {
    querySelector(query) {
      return ({ '#a05-content':root, '#a05-tabs':tabs, '#a05-notice':notice })[query] ?? null;
    },
    querySelectorAll() { return []; },
    createElement() { return element(); },
    body: {}
  };
  const window = { confirm() { return true; }, print() { printed++; } };
  // No persistent storage or network is permitted in this no-consent test.
  const noStorage = async () => { throw Error('storage call in no-consent test'); };
  const hash = 'a'.repeat(64);
  const dependencies = {
    document, window, AXES, QUESTIONS, TYPES, GROUPS, newDraft, makeSnapshot,
    renderReport, renderVisualPreview, resolveVisualDisplay,
    openDatabase: noStorage, restoreState: noStorage, enableSaving: noStorage,
    saveDraft: noStorage, replaceDraft: noStorage, finalizeDraft: noStorage,
    setRawRetention: noStorage, removeRawAnswers: noStorage, deleteAssessment: noStorage,
    eraseA05DatabaseContents: noStorage, readA05StoreCounts: noStorage,
    questionSetHash: async () => hash,
    exportA05Data() {},
    formatLocalCompletionDay() { return 'QA-day'; }
  };
  const source = dropImports(appSource);
  assert.ok(source.endsWith('initialize();\n'), 'app lifecycle changed: update harness');
  const instrumented = source.slice(0, -'initialize();\n'.length) +
    '\nreturn { state, render, renderResult, renderReportView, renderHistory };';
  const names = Object.keys(dependencies);
  const factory = new Function(...names, instrumented);
  const app = factory(...Object.values(dependencies));
  app.state.hash = hash;
  app.state.draft = newDraft('test-assessment', hash);
  app.state.consent = false;
  app.state.history = [];
  app.state.view = 'quiz';
  app.render();
  const click = (action, value, extra = {}) => {
    const button = {
      dataset: { action, value, ...extra }, disabled: false,
      closest() { return this; }
    };
    return events.click({ target: button });
  };
  const change = (field, value) => events.change({
    target: {
      dataset: { visualSetting: field }, value,
      closest() { return this; }
    }
  });
  return { app, root, click, change, printed: () => printed };
}

async function completeThirty(f, answerForQuestion) {
  for (let i = 0; i < QUESTIONS.length; i++) {
    assert.equal(f.app.state.draft.index, i, 'question index must progress');
    const question = QUESTIONS[i];
    const answer = answerForQuestion(question);
    await f.click('answer', String(answer));
    assert.equal(f.app.state.draft.answers[question.id], answer);
    await f.click('next');
  }
  assert.equal(f.app.state.view, 'review');
  assert.match(f.root.innerHTML, /30 \/ 30問/);
  await f.click('finish');
  assert.equal(f.app.state.view, 'result');
  assert.equal(f.app.state.history.length, 1);
}

test('30Q -> results -> RGBY -> 10-page report -> history without consent or storage calls', async () => {
  const f = fixture();
  await completeThirty(f, q => q.direction === 1 ? 7 : 1);
  const s = f.app.state.history[0];
  assert.match(f.root.innerHTML, /診断判定とは未連動/);
  assert.match(f.root.innerHTML, /src="\.\/crests\/world-tree\.svg"/);
  assert.equal(typeof s.result.typeId, 'string');
  const before = JSON.stringify(s);
  await f.change('accent', 'G');
  assert.match(f.root.innerHTML, /--a05-vp-color:#39FF88/);
  assert.equal(JSON.stringify(s), before, 'UI selections must not mutate assessment history');
  await f.click(null, undefined, { view: 'report' }); // handled as a view button
  assert.equal(f.app.state.view, 'report');
  assert.equal((f.root.innerHTML.match(/class="report-sheet"/g) ?? []).length, 10);
  await f.click('print-report');
  assert.equal(f.printed(), 1);
  await f.click(null, undefined, { view: 'history' });
  assert.equal(f.app.state.view, 'history');
  assert.match(f.root.innerHTML, /検証済み 1件/);
});

test('30 neutral answers withhold legacy type; manual art remains explicitly unrelated', async () => {
  const f = fixture();
  await completeThirty(f, () => 4);
  const record = f.app.state.history[0];
  assert.equal(record.result.typeId, null);
  assert.equal(record.result.classification, 'withheld');
  assert.equal(record.result.wealth, 'neutral');
  assert.match(f.root.innerHTML, /判定保留/);
  assert.match(f.root.innerHTML, /診断判定とは未連動/);
  const before = JSON.stringify(record);
  await f.change('motif', 'pegasus');
  assert.match(f.root.innerHTML, /crests\/pegasus\.svg/);
  assert.equal(JSON.stringify(record), before);
  await f.click(null, undefined, { view: 'report' });
  assert.equal((f.root.innerHTML.match(/class="report-sheet"/g) ?? []).length, 10);
});
