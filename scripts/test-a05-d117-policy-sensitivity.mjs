/**
 * A05 D-117 independent model-sensitivity stress test.
 * Synthetic exhaustive mathematics only; no human response, storage, telemetry or UI.
 * Do NOT use these arbitrary display policies as scientifically validated thresholds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAxis, scoreAssessment } from '../projects/kidp/life-design-lab/a05/engine.mjs';
import { QUESTIONS } from '../projects/kidp/life-design-lab/a05/questions.mjs';

const N = 7 ** 6;
function exhaustive() {
  const bySum = new Map();
  const byStatus = { withheld: 0, provisional: 0, classified: 0 };
  let edges = 0, directionChanges = 0, statusChanges = 0;
  for (let n = 0; n < N; n++) {
    let t = n, sum = 0;
    const digits = [];
    for (let i = 0; i < 6; i++) {
      const digit = (t % 7) + 1;
      digits.push(digit);
      sum += digit - 4;
      t = Math.floor(t / 7);
    }
    const before = resolveAxis(6, sum);
    bySum.set(sum, (bySum.get(sum) || 0) + 1);
    byStatus[before.status]++;
    for (const digit of digits) {
      for (const delta of [-1, 1]) {
        if (digit + delta < 1 || digit + delta > 7) continue;
        const after = resolveAxis(6, sum + delta);
        edges++;
        if (before.direction !== after.direction) directionChanges++;
        if (before.status !== after.status) statusChanges++;
      }
    }
  }
  const middle = (bySum.get(-1) || 0) + (bySum.get(0) || 0) + (bySum.get(1) || 0);
  const perAxis = {
    current: 1 - byStatus.withheld / N,
    withholdNearZero: 1 - middle / N,
    classifiedOnly: byStatus.classified / N
  };
  return { bySum, byStatus, middle, edges, directionChanges, statusChanges, perAxis };
}

test('D117 native module uses the expected five-axis, 30-item v2 layout', () => {
  assert.equal(QUESTIONS.length, 30);
  for (const label of 'ABCDE') {
    assert.equal(QUESTIONS.filter(q => q.axis === label).length, 6);
  }
});
test('D117 exact integer boundaries include both negative and positive directions', () => {
  for (const [sum, expected] of [
    [-7, 'classified'], [-6, 'provisional'], [-1, 'provisional'],
    [0, 'withheld'], [1, 'provisional'], [6, 'provisional'], [7, 'classified']
  ]) {
    assert.equal(resolveAxis(6, sum).status, expected, 'sum=' + sum);
  }
  assert.equal(resolveAxis(3, 9).status, 'withheld', 'insufficient observed answers');
});
test('D117 exhaustive axis states over all 117649 synthetic patterns', () => {
  const s = exhaustive();
  assert.deepEqual(s.byStatus, { withheld: 9331, provisional: 86086, classified: 22232 });
  assert.equal(s.middle, 27643);
  assert.equal(s.byStatus.withheld + s.byStatus.provisional + s.byStatus.classified, N);
});
test('D117 enumerate every directed adjacent one-step answer edit', () => {
  const s = exhaustive();
  assert.equal(s.edges, 1210104);
  assert.equal(s.directionChanges, 195384);
  assert.equal(s.statusChanges, 279048);
  assert.ok(s.directionChanges / s.edges > 0.16 && s.directionChanges / s.edges < 0.17);
});
test('D117 compare synthetic 4-axis display coverage without pretending to infer real-user rates', () => {
  const { perAxis } = exhaustive();
  const [current, middle, strict] = [
    perAxis.current ** 4, perAxis.withholdNearZero ** 4, perAxis.classifiedOnly ** 4
  ];
  assert.ok(Math.abs(current - 0.718537717062698) < 1e-12);
  assert.ok(Math.abs(middle - 0.3425570306483314) < 1e-12);
  assert.ok(Math.abs(strict - 0.001275149704923484) < 1e-12);
  assert.ok(current > middle && middle > strict);
});
test('D117 same sum can mean total neutrality or strong opposing preferences', () => {
  const neutral = [4, 4, 4, 4, 4, 4];
  const opposed = [7, 7, 7, 1, 1, 1];
  const sum = xs => xs.reduce((n, x) => n + (x - 4), 0);
  assert.equal(sum(neutral), 0);
  assert.equal(sum(opposed), 0);
  assert.equal(resolveAxis(6, sum(neutral)).status, 'withheld');
  assert.equal(resolveAxis(6, sum(opposed)).status, 'withheld');
  assert.notDeepEqual(neutral, opposed);
});
test('D117 provisional subtype exists at minimal nonzero sums; changing one answer can withhold', () => {
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, 4]));
  for (const label of 'ABCD') answers[label + '01'] = 5;
  const first = scoreAssessment(answers);
  assert.notEqual(first.typeId, null);
  assert.equal(first.classification, 'provisional');
  assert.ok(first.axes.slice(0, 4).every(axis => axis.sum === 1 && axis.status === 'provisional'));
  const before = JSON.stringify(answers);
  const changed = { ...answers, A01: 4 };
  const second = scoreAssessment(changed);
  assert.equal(second.typeId, null);
  assert.equal(second.classification, 'withheld');
  assert.equal(JSON.stringify(answers), before, 'input must not mutate');
});
