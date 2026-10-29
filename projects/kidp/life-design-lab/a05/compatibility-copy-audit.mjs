/**
 * A05 C-05 editorial copy audit (offline / deterministic / draft only).
 *
 * Automated PASS is NOT a scientific, editorial, ethical, human, publication,
 * or accessibility approval. All 136 rows require separate human review.
 */
import { EDITORIAL_PAIRS, EDITORIAL_DISPLAY_VERSION } from "./compatibility-editorial.mjs";
import { EVIDENCE_DECISIONS } from "./compatibility-evidence.mjs";

export const COPY_AUDIT_VERSION = "A05-COPY-C05-0.1.0-unapproved";
export const COPY_REVIEW_STATES = Object.freeze({
  PENDING: "HUMAN_REVIEW_PENDING",
  NEEDS_REVISION: "NEEDS_REVISION",
  APPROVED_BY_HUMAN: "APPROVED_BY_HUMAN"
});
export const COPY_AUDIT_SOURCE_VERSION = "A05-COMPAT-C03-0.1.0-unapproved";

const BLOCKED_CLAIMS = Object.freeze([
  Object.freeze({ id: "RATE_OR_SCORE",
    pattern: /(?:\d+(?:\.\d+)?\s*[%％点]|一致率|相性点数|相性スコア|相性ランク|適合率|成功率|離婚率)/u }),
  Object.freeze({ id: "BEST_OR_WORST_MATCH",
    pattern: /(?:最高の相性|最悪の相性|相性が(?:良い|悪い|最高|最悪)|相性は(?:良い|悪い|最高|最悪)|ベスト相性|ワースト相性)/u }),
  Object.freeze({ id: "PREDICTED_RELATIONSHIP_OUTCOME",
    pattern: /(?:必ず(?:別れる|結婚する|成功する|衝突する|長続きする)|(?:別れる|離婚する|うまくいく)確率|(?:結婚|仕事)に(?:向いている|向かない|不向き))/u }),
  Object.freeze({ id: "FAKE_RESEARCH_VALIDATION",
    pattern: /(?:科学的に(?:証明|実証|保証)|(?:論文|研究)(?:で|が)(?:証明|実証)(?:した|された)|心理学的に(?:保証|確実))/u }),
  Object.freeze({ id: "UNJUSTIFIED_TYPE_ESSENTIALISM",
    pattern: /(?:このタイプは必ず|このタイプ同士は必ず|この組合せは絶対に)/u })
]);

/** Only assess proposed *C-layer assertions*, not safety disclaimers. */
export function inspectCopyText(value) {
  const issues = [];
  if (typeof value !== "string" || !value.trim()) {
    issues.push("EMPTY_COPY");
  } else {
    for (const forbidden of BLOCKED_CLAIMS) {
      if (forbidden.pattern.test(value)) issues.push(forbidden.id);
    }
  }
  return Object.freeze({
    findings: Object.freeze(issues),
    automatedClear: issues.length === 0,
    humanApproved: false,
    productionApproved: false
  });
}

function compactHypotheses(pair) {
  return [
    pair.editorial.story,
    ...pair.editorial.hypotheses.flatMap(x => [x.friction, x.complement]),
    ...pair.editorial.conversationPrompts
  ];
}

function inspectPair(pair) {
  const issues = new Set();
  if (pair.facts.tier !== "A_DRAFT_DEFINITION_FACT" ||
      pair.generalResearch.tier !== "B_GENERAL_RESEARCH_NOT_A05_VALIDATION" ||
      pair.editorial.tier !== "C_EDITORIAL_HYPOTHESIS")
    issues.add("INCORRECT_EVIDENCE_TIER");
  if (pair.facts.sharedAxesCount + pair.facts.differentAxesCount !== 4)
    issues.add("INVALID_AXIS_COUNT");
  if (pair.facts.shared.some(x => x.axis === "E") ||
      pair.facts.differences.some(x => x.axis === "E") ||
      pair.editorial.hypotheses.some(x => x.axis === "E"))
    issues.add("E_AXIS_INCLUDED");
  if (pair.directPairValidation !== false || pair.sourcePairsValidated !== 0 ||
      pair.productionApproved !== false || pair.predictedSuccess !== null ||
      pair.compatibilityScore !== null || pair.compatibilityRank !== null ||
      pair.original136WorkbookReconciled !== false ||
      pair.generalResearch.citationsApprovedForProduction !== false)
    issues.add("UNAUTHORIZED_EVIDENCE_OR_PUBLICATION");
  if (pair.facts.differences.length !== pair.editorial.hypotheses.length)
    issues.add("HYPOTHESIS_MAPPING_MISMATCH");
  if (!pair.editorial.title ||
      pair.editorial.title !== pair.editorial.title.trim() ||
      !pair.editorial.story)
    issues.add("MISSING_EDITORIAL_COPY");
  const allCopy = compactHypotheses(pair);
  for (const value of allCopy) for (const issue of inspectCopyText(value).findings)
    issues.add(issue);
  if (!pair.editorial.caveat.includes("B軸"))
    issues.add("MISSING_B_AXIS_WARNING");
  if (!pair.generalResearch.note.includes("A05") ||
      !pair.generalResearch.note.includes("一般研究"))
    issues.add("MISSING_GENERAL_RESEARCH_SCOPE");
  return Object.freeze({
    pairId: pair.id,
    typeIds: pair.typeIds,
    sourceEditorialVersion: EDITORIAL_DISPLAY_VERSION,
    sourceCopyAuditVersion: COPY_AUDIT_VERSION,
    copyTextsExamined: allCopy.length,
    automatedFindings: Object.freeze([...issues].sort()),
    automatedClear: issues.size === 0,
    humanReviewStatus: COPY_REVIEW_STATES.PENDING,
    humanReviewer: null,
    humanReviewedAt: null,
    researchClaimReviewed: false,
    BAxisStructureApproved: false,
    workbookV10Reconciled: false,
    nativeBrowserAccepted: false,
    scientificValidationEstablished: false,
    productionApproved: false
  });
}

if (EDITORIAL_DISPLAY_VERSION !== COPY_AUDIT_SOURCE_VERSION ||
    EVIDENCE_DECISIONS.productionPublication !== "BLOCKED" ||
    EDITORIAL_PAIRS.length !== 136)
  throw new Error("Copy audit source or release gate changed, review required");

export const COPY_REVIEW_QUEUE = Object.freeze(EDITORIAL_PAIRS.map(inspectPair));
const blockerCount = COPY_REVIEW_QUEUE.filter(x => !x.automatedClear).length;
export const COPY_AUDIT_SUMMARY = Object.freeze({
  version: COPY_AUDIT_VERSION,
  pairs: COPY_REVIEW_QUEUE.length,
  copyTextsExamined: COPY_REVIEW_QUEUE.reduce((n,p) => n + p.copyTextsExamined, 0),
  automatedFlaggedPairs: blockerCount,
  automatedClearPairs: COPY_REVIEW_QUEUE.length - blockerCount,
  humanReviewedPairs: 0,
  scientificValidatedPairs: 0,
  publicationApprovedPairs: 0,
  v10WorkbookReconciled: false,
  nativeNodeSuiteExecuted: false,
  realBrowserSuiteExecuted: false,
  researchApprovalGranted: false,
  productionPublication: "BLOCKED"
});

if (COPY_REVIEW_QUEUE.length !== 136 ||
    new Set(COPY_REVIEW_QUEUE.map(x => x.pairId)).size !== 136 ||
    COPY_REVIEW_QUEUE.some(x => x.productionApproved ||
      x.humanReviewStatus !== COPY_REVIEW_STATES.PENDING))
  throw new Error("C05 review queue must contain exactly 136 unapproved unique pairs");
