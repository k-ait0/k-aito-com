/**
 * A05 domain engine. No UI, network or storage dependencies.
 * A01 / MY LIFE NOTE may consume only finalized snapshots.
 */
import { AXES, QUESTIONS, QUESTION_SET_VERSION } from "./questions.mjs";
import { TYPES, GROUPS, TYPE_VERSION, CONTENT_VERSION } from "./types.mjs";

export const SCORING_VERSION = "A05-S-1.0.0-draft";
export class AssessmentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssessmentValidationError";
    this.code = "VALIDATION_ERROR";
  }
}
const OWN = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export function validateQuestions(questions = QUESTIONS) {
  if (!Array.isArray(questions) || questions.length !== 30) {
    throw new Error("Question manifest must contain exactly 30 questions");
  }
  const seen = new Set();
  for (const q of questions) {
    if (!q || !AXES.some(a => a.id === q.axis) ||
        !new RegExp("^" + q.axis + "0[1-6]$").test(q.id) ||
        seen.has(q.id) || ![1, -1].includes(q.direction) ||
        typeof q.left !== "string" || !q.left.trim() ||
        typeof q.right !== "string" || !q.right.trim()) {
      throw new Error("Invalid or duplicate question definition");
    }
    seen.add(q.id);
  }
  for (const axis of AXES) {
    for (let i = 1; i <= 6; i++) {
      if (!seen.has(axis.id + "0" + i)) {
        throw new Error("Missing question for " + axis.id);
      }
    }
  }
}

export function validateAnswers(answers, questions = QUESTIONS, requireComplete = false) {
  validateQuestions(questions);
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new AssessmentValidationError("Invalid answer object");
  }
  const ids = new Set(questions.map(q => q.id));
  for (const [id, value] of Object.entries(answers)) {
    if (!ids.has(id) || (value !== null &&
        (!Number.isInteger(value) || value < 1 || value > 7))) {
      throw new AssessmentValidationError("Invalid question ID or answer: " + id);
    }
  }
  if (requireComplete && questions.some(q => !OWN(answers, q.id))) {
    throw new AssessmentValidationError("Every question must be answered or explicitly skipped");
  }
  return true;
}

/** Integer numerator makes the +/-20 threshold exact, including n=5,sum=3. */
export function resolveAxis(validCount, weightedSum) {
  if (!Number.isInteger(validCount) || validCount < 0 || validCount > 6 ||
      !Number.isInteger(weightedSum) || Math.abs(weightedSum) > validCount * 3) {
    throw new Error("Invalid axis count or sum");
  }
  const raw = validCount ? 100 * weightedSum / (3 * validCount) : null;
  const direction = validCount < 4 || weightedSum === 0 ? null : weightedSum > 0 ? 1 : -1;
  const boundary = 5 * Math.abs(weightedSum) <= 3 * validCount;
  const status = direction === null ? "withheld" :
    validCount < 6 || boundary ? "provisional" : "classified";
  return {
    n: validCount,
    sum: weightedSum,
    value: raw === null ? null : Math.round(raw * 10) / 10,
    direction,
    status
  };
}

function derive(axes) {
  const [a, b, c, d, e] = axes;
  let typeId = null;
  if ([a, b, c, d].every(x => x.direction !== null)) {
    const group = (a.direction === 1 ? 2 : 0) + (b.direction === 1 ? 1 : 0);
    const within = (c.direction === 1 ? 2 : 0) + (d.direction === 1 ? 1 : 0);
    typeId = "T" + String(group * 4 + within + 1).padStart(2, "0");
  }
  const classification = typeId === null ? "withheld" :
    [a, b, c, d].some(x => x.status !== "classified") ? "provisional" : "classified";
  const wealth = e.n < 4 ? "withheld" :
    5 * Math.abs(e.sum) <= 3 * e.n ? "neutral" : e.sum > 0 ? "time" : "money";
  return { typeId, classification, wealth };
}

export function scoreAssessment(answers, questions = QUESTIONS) {
  validateAnswers(answers, questions);
  const axes = AXES.map(axis => {
    let n = 0, sum = 0;
    for (const q of questions) {
      if (q.axis !== axis.id) continue;
      const value = answers[q.id];
      if (value === undefined || value === null) continue;
      n++;
      sum += (value - 4) * q.direction;
    }
    return { id: axis.id, ...resolveAxis(n, sum) };
  });
  return { axes, ...derive(axes) };
}

export function newDraft(id, questionHash) {
  if (typeof id !== "string" || !id ||
      !/^[a-f0-9]{64}$/i.test(questionHash)) {
    throw new Error("Valid assessment ID and SHA-256 question hash required");
  }
  return {
    id: "active",
    assessmentId: id,
    revision: null,
    index: 0,
    startedAt: new Date().toISOString(),
    versions: {
      question: QUESTION_SET_VERSION,
      scoring: SCORING_VERSION,
      type: TYPE_VERSION,
      content: CONTENT_VERSION
    },
    questionHash,
    answers: {}
  };
}

export function verifyDraft(draft, questionHash) {
  if (!draft || draft.id !== "active" ||
      typeof draft.assessmentId !== "string" || !draft.assessmentId ||
      draft.versions?.question !== QUESTION_SET_VERSION ||
      draft.versions?.scoring !== SCORING_VERSION ||
      draft.questionHash !== questionHash ||
      (draft.revision !== null && (!Number.isInteger(draft.revision) || draft.revision < 0)) ||
      !Number.isInteger(draft.index) || draft.index < 0 || draft.index >= 30) {
    throw new Error("Unsupported or corrupted draft");
  }
  validateAnswers(draft.answers);
  return true;
}

export function makeSnapshot(draft, questionHash, retainRawAnswers = false) {
  verifyDraft(draft, questionHash);
  validateAnswers(draft.answers, QUESTIONS, true);
  const result = scoreAssessment(draft.answers);
  const type = TYPES.find(x => x.id === result.typeId);
  const group = type ? GROUPS[type.group] : null;
  const snapshot = {
    id: draft.assessmentId,
    schemaVersion: 1,
    startedAt: draft.startedAt,
    completedAt: new Date().toISOString(),
    versions: { ...draft.versions },
    questionHash,
    result,
    presentation: type ? {
      id: type.id,
      name: type.name,
      emoji: type.emoji,
      summary: type.summary,
      action: type.action,
      group: group.id,
      color: group.color,
      tint: group.tint
    } : null
  };
  if (retainRawAnswers) {
    snapshot.rawAnswers = { ...draft.answers };
  }
  return snapshot;
}

/**
 * A preserved snapshot is not proof that the psychometric questions are valid.
 * Old scoring/content versions are never recalculated by the current rules.
 */
export function classifySnapshot(snapshot, knownQuestionHash) {
  if (!snapshot || typeof snapshot !== "object" ||
      snapshot.schemaVersion !== 1 ||
      typeof snapshot.id !== "string" || !snapshot.id ||
      typeof snapshot.completedAt !== "string" ||
      !Number.isFinite(Date.parse(snapshot.completedAt)) ||
      typeof snapshot.questionHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(snapshot.questionHash) ||
      !snapshot.versions || typeof snapshot.versions.question !== "string" ||
      typeof snapshot.versions.scoring !== "string" ||
      typeof snapshot.versions.type !== "string" ||
      typeof snapshot.versions.content !== "string" ||
      !snapshot.result || !Array.isArray(snapshot.result.axes) ||
      snapshot.result.axes.length !== 5) {
    return "quarantined";
  }

  const result = snapshot.result;
  // Validate a legacy record's basic shape before allowing read-only access.
  // DO NOT recalculate or reinterpret old versions with the current algorithm.
  if ((result.typeId !== null &&
       (typeof result.typeId !== "string" || !/^T(0[1-9]|1[0-6])$/.test(result.typeId))) ||
      !["classified", "provisional", "withheld"].includes(result.classification) ||
      !["money", "time", "neutral", "withheld"].includes(result.wealth) ||
      !result.axes.every((a, i) =>
        a && a.id === AXES[i].id &&
        Number.isInteger(a.n) && a.n >= 0 && a.n <= 6 &&
        Number.isInteger(a.sum) && Math.abs(a.sum) <= 3 * a.n &&
        (a.value === null || (Number.isFinite(a.value) && Math.abs(a.value) <= 100)) &&
        [null, 1, -1].includes(a.direction) &&
        ["classified", "provisional", "withheld"].includes(a.status))) {
    return "quarantined";
  }
  const presentation = snapshot.presentation;
  if (result.typeId === null ? presentation !== null :
      !presentation || presentation.id !== result.typeId ||
      typeof presentation.name !== "string" || !presentation.name.trim() ||
      presentation.name.length > 120 || typeof presentation.summary !== "string") {
    return "quarantined";
  }
  if (snapshot.versions.question !== QUESTION_SET_VERSION ||
      snapshot.versions.scoring !== SCORING_VERSION ||
      snapshot.versions.type !== TYPE_VERSION ||
      snapshot.versions.content !== CONTENT_VERSION) {
    return "legacy";
  }
  if (snapshot.questionHash !== knownQuestionHash) return "quarantined";

  let expected;
  try {
    const axes = result.axes.map((a, i) => ({ id: AXES[i].id, ...resolveAxis(a.n, a.sum) }));
    expected = { axes, ...derive(axes) };
  } catch (_) { return "quarantined"; }
  if (result.typeId !== expected.typeId ||
      result.classification !== expected.classification ||
      result.wealth !== expected.wealth ||
      !result.axes.every((a, i) => {
        const b = expected.axes[i];
        return a.id === b.id && a.n === b.n && a.sum === b.sum &&
          a.value === b.value && a.direction === b.direction && a.status === b.status;
      })) {
    return "quarantined";
  }

  const type = TYPES.find(x => x.id === result.typeId);
  if (type) {
    const group = GROUPS[type.group];
    if (!presentation || presentation.id !== type.id ||
        presentation.name !== type.name || presentation.emoji !== type.emoji ||
        presentation.summary !== type.summary || presentation.action !== type.action ||
        presentation.group !== group.id || presentation.color !== group.color ||
        presentation.tint !== group.tint) {
      return "quarantined";
    }
  } else if (presentation !== null) {
    return "quarantined";
  }
  if (OWN(snapshot, "rawAnswers")) {
    try {
      validateAnswers(snapshot.rawAnswers, QUESTIONS, true);
      const actual = scoreAssessment(snapshot.rawAnswers);
      if (actual.typeId !== result.typeId ||
          actual.classification !== result.classification ||
          actual.wealth !== result.wealth ||
          !actual.axes.every((a, i) => {
            const b = result.axes[i];
            return a.id === b.id && a.n === b.n && a.sum === b.sum &&
              a.value === b.value && a.direction === b.direction && a.status === b.status;
          })) {
        return "quarantined";
      }
    } catch (_) { return "quarantined"; }
  }
  return "verified";
}
