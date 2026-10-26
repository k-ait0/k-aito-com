/**
 * A05 D-61 research-only E-axis comparison helpers.
 * NOT imported by the released/draft diagnostic. No storage, UI, or migration.
 * These functions do not establish psychometric validity.
 */
export const E_EXPERIMENT_VERSION = "A05-E-EXP-0.1.0-unvalidated";
const MODES = Object.freeze(["relative", "independent", "omitted"]);
export function validateExperimentalE(config) {
  if (!config || typeof config !== "object" || !MODES.includes(config.mode)) {
    throw new TypeError("Unsupported experimental E mode");
  }
  if (config.mode === "relative") {
    if (!Number.isInteger(config.answer) || config.answer < 1 || config.answer > 7) {
      throw new TypeError("Relative E answer must be integer 1..7");
    }
  } else if (config.mode === "independent") {
    for (const key of ["money", "time"]) {
      if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 7) {
        throw new TypeError("Independent E ratings must be integers 1..7");
      }
    }
  } else if (Object.keys(config).some(k => k !== "mode")) {
    throw new TypeError("Omitted E must contain mode only");
  }
  return true;
}
export function experimentalE(config) {
  validateExperimentalE(config);
  if (config.mode === "omitted") {
    return Object.freeze({ schema: E_EXPERIMENT_VERSION, mode: "omitted", value: null });
  }
  if (config.mode === "relative") {
    return Object.freeze({
      schema: E_EXPERIMENT_VERSION,
      mode: "relative",
      // An observed response, NOT a validated 'money/time' classification.
      preference: config.answer - 4
    });
  }
  return Object.freeze({
    schema: E_EXPERIMENT_VERSION,
    mode: "independent",
    ratings: Object.freeze({ money: config.money, time: config.time })
  });
}
export function isLegacyWealthCompatible(result) {
  // No experimental output may be mistaken for the current engine's wealth field.
  return false;
}
