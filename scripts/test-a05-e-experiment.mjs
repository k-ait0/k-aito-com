import assert from "node:assert/strict";
import { E_EXPERIMENT_VERSION, experimentalE, validateExperimentalE, isLegacyWealthCompatible } from "../projects/kidp/life-design-lab/a05/e-experiment.mjs";

assert.equal(E_EXPERIMENT_VERSION, "A05-E-EXP-0.1.0-unvalidated");
assert.deepEqual(experimentalE({ mode: "relative", answer: 1 }).preference, -3);
assert.deepEqual(experimentalE({ mode: "relative", answer: 4 }).preference, 0);
assert.deepEqual(experimentalE({ mode: "relative", answer: 7 }).preference, 3);
assert.deepEqual(experimentalE({ mode: "independent", money: 7, time: 7 }).ratings, { money: 7, time: 7 });
assert.equal(experimentalE({ mode: "omitted" }).value, null);
assert.equal(isLegacyWealthCompatible(experimentalE({ mode: "relative", answer: 7 })), false);
for (const input of [null, {}, { mode: "relative", answer: null }, { mode: "relative", answer: 8 }, { mode: "relative", answer: 4.5 }, { mode: "independent", money: 7 }, { mode: "independent", money: 0, time: 7 }, { mode: "omitted", money: 1 }, { mode: "unknown" }]) {
  assert.throws(() => validateExperimentalE(input), TypeError);
}
console.log("A05 D61 experimental E-axis tests passed");
