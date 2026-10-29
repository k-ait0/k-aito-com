/**
 * A05 C-02: evidence-intake and claim-permission contract for an UNAPPROVED
 * editorial 136-pair preview. This file contains no reviewed studies.
 *
 * It must never turn general literature into evidence for an A05 type, pair,
 * compatibility score, individual comparison, or relationship prediction.
 * No participant data, I/O, storage, network, or release authorization.
 */
import { COMPATIBILITY_PAIRS, COMPATIBILITY_VERSION, EVIDENCE_STATUS,
  getCompatibilityPair } from "./compatibility.mjs";
import { TYPE_VERSION, CONTENT_VERSION } from "./types.mjs";

export const EVIDENCE_CONTRACT_VERSION = "A05-COMPAT-C02-0.1.0-draft";
export const EVIDENCE_SOURCE_STATUS = "NO_SOURCES_REVIEWED";
export const EVIDENCE_SOURCE_RECORDS = Object.freeze([]);

const axis = (id, title, caveat, included) => Object.freeze({
  id, title, includedInC01PairLabels: included,
  a05ConstructValidation: "NOT_ESTABLISHED",
  literatureReview: "PENDING",
  sourceIds: Object.freeze([]),
  caveat
});

export const EVIDENCE_AXIS_REGISTER = Object.freeze([
  axis("A", "安定／変化", "単一二極尺度としての妥当性、境界付近の分類精度は未検証です。", true),
  axis("B", "自律／つながり", "両者は両立し得ます。B1/B2/B3は未決裁で、Bの一致・相違は人の特性を証明しません。", true),
  axis("C", "将来／現在", "将来と現在を同時に重視し得ます。二極性と時間的安定性は未検証です。", true),
  axis("D", "探索／深耕", "探索と深耕を同時に重視し得ます。二極性と独立性は未検証です。", true),
  axis("E", "経済的余裕／時間的自由", "金銭と時間は独立して重視し得ます。C01の136組には使用していません。", false)
]);

export const EVIDENCE_DECISIONS = Object.freeze({
  bAxisMode: "PENDING_HUMAN_DECISION",
  a05TypeStructure: "PENDING_HUMAN_DECISION",
  original136WorkbookReconciliation: "NOT_DONE",
  researchParticipantAuthorization: "BLOCKED_G1_PENDING",
  researchOperationalAcceptance: "BLOCKED_D42_PENDING",
  pairSpecificValidation: EVIDENCE_STATUS,
  scientificLiteratureReview: "PENDING",
  productionPublication: "BLOCKED"
});

export const CLAIM_KINDS = Object.freeze({
  DRAFT_LABEL_COMPARISON: "DRAFT_LABEL_COMPARISON",
  CONVERSATION_PROMPT: "CONVERSATION_PROMPT",
  GENERAL_RESEARCH_ASSOCIATION: "GENERAL_RESEARCH_ASSOCIATION",
  A05_CONSTRUCT_VALIDITY: "A05_CONSTRUCT_VALIDITY",
  A05_PAIR_COMPATIBILITY: "A05_PAIR_COMPATIBILITY",
  TWO_PERSON_VALUE_COMPARISON: "TWO_PERSON_VALUE_COMPARISON",
  COMPATIBILITY_SCORE_OR_RANK: "COMPATIBILITY_SCORE_OR_RANK",
  RELATIONSHIP_OUTCOME_PREDICTION: "RELATIONSHIP_OUTCOME_PREDICTION"
});
const kinds = new Set(Object.values(CLAIM_KINDS));
const previewOnly = new Set([
  CLAIM_KINDS.DRAFT_LABEL_COMPARISON, CLAIM_KINDS.CONVERSATION_PROMPT
]);

/**
 * Fail-closed permission for an editorial claim category. This is a product
 * policy decision, not a scientific appraisal. No sources have been verified.
 */
export function reviewClaimPermission(kind, axisIds = []) {
  if (!kinds.has(kind)) throw new TypeError("Unknown claim kind");
  if (!Array.isArray(axisIds) ||
      axisIds.some(id => !EVIDENCE_AXIS_REGISTER.some(axis => axis.id === id)))
    throw new TypeError("Unknown evidence axis");
  // E is excluded from the C01 136-pair label generator; do not imply otherwise.
  const editorialPreviewAllowed = previewOnly.has(kind) &&
    !(kind === CLAIM_KINDS.DRAFT_LABEL_COMPARISON && axisIds.includes("E"));
  const cautions = ["A05の軸・16分類・136組は未検証です。"];
  if (axisIds.includes("B")) cautions.push(EVIDENCE_AXIS_REGISTER[1].caveat);
  if (axisIds.includes("E")) cautions.push(EVIDENCE_AXIS_REGISTER[4].caveat);
  if (!editorialPreviewAllowed)
    cautions.push("原典確認、A05固有の妥当性検証、必要な同意・人手決裁が未完了です。");
  return Object.freeze({
    kind, editorialPreviewAllowed, productionAllowed: false,
    scientificSupportEstablished: false,
    sourceIds: Object.freeze([]),
    cautions: Object.freeze(cautions)
  });
}

/** Attach evidence status without altering the immutable C01 pair registry. */
export function reviewPairEvidence(typeIdA, typeIdB) {
  const pair = getCompatibilityPair(typeIdA, typeIdB);
  if (pair.evidence.status !== EVIDENCE_STATUS ||
      pair.evidence.directPairValidation !== false ||
      pair.score !== null || pair.rank !== null)
    throw new Error("C01 evidence boundary changed: re-review required");
  return Object.freeze({
    pairId: pair.id,
    sourceTypeVersion: TYPE_VERSION,
    sourceContentVersion: CONTENT_VERSION,
    sourceCompatibilityVersion: COMPATIBILITY_VERSION,
    evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
    editorialPreviewAllowed: true,
    directA05PairValidation: false,
    generalLiteratureReviewed: false,
    sourceIds: Object.freeze([]),
    productionAllowed: false,
    bAxisCautionRequired: true,
    originalWorkbookReconciled: false
  });
}

const studyDesigns = new Set([
  "META_ANALYSIS", "SYSTEMATIC_REVIEW", "LONGITUDINAL", "DYADIC_APIM",
  "CROSS_SECTIONAL", "EXPERIMENT", "QUALITATIVE", "OTHER"
]);
const causalClasses = new Set([
  "ASSOCIATION_ONLY", "CAUSAL_IDENTIFICATION_CLAIM_REQUIRES_REVIEW", "NOT_APPLICABLE"
]);
const contexts = new Set([
  "ROMANTIC", "FRIENDSHIP", "WORK", "FAMILY", "MULTIPLE", "OTHER"
]);
const nonblank = value => typeof value === "string" && value.trim().length > 0;

/**
 * Validate only the completeness of a PROPOSED bibliographic intake row.
 * Complete != reviewed, true, causally established, or safe to publish.
 * effectEstimate/uncertainty may be null ONLY with an explicit reporting note.
 */
export function inspectResearchCandidate(record) {
  const issues = [];
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return Object.freeze({ structurallyComplete: false, scientificallyVerified: false,
      publishable: false, issues: Object.freeze(["record must be an object"]) });
  }
  if (!/^LIT-\d{3,}$/.test(record.id ?? "")) issues.push("id");
  for (const field of ["title", "authors", "population", "constructs",
    "limitations", "reportingNote"])
    if (!nonblank(record[field])) issues.push(field);
  if (!Number.isInteger(record.year) || record.year < 1900 || record.year > 2100)
    issues.push("year");
  if (!nonblank(record.doi) && !/^https:\/\//.test(record.url ?? ""))
    issues.push("doi or https url");
  if (!studyDesigns.has(record.studyDesign)) issues.push("studyDesign");
  if (!contexts.has(record.relationshipContext)) issues.push("relationshipContext");
  if (!causalClasses.has(record.causalInterpretation)) issues.push("causalInterpretation");
  if (record.effectEstimate !== null && !Number.isFinite(record.effectEstimate))
    issues.push("effectEstimate");
  if (record.uncertainty !== null && !nonblank(record.uncertainty))
    issues.push("uncertainty");
  if (record.effectEstimate == null && !/未報告|不明|not reported/i.test(record.reportingNote ?? ""))
    issues.push("missing effect explanation");
  if (record.reviewStatus !== "UNREVIEWED") issues.push("reviewStatus must be UNREVIEWED");
  if (record.directA05PairValidation !== false) issues.push("directA05PairValidation must be false");
  return Object.freeze({
    structurallyComplete: issues.length === 0,
    scientificallyVerified: false,
    publishable: false,
    issues: Object.freeze(issues)
  });
}

if (COMPATIBILITY_PAIRS.length !== 136 || EVIDENCE_AXIS_REGISTER.length !== 5 ||
    EVIDENCE_SOURCE_RECORDS.length !== 0)
  throw new Error("C02 evidence contract must start with 136 unvalidated pairs and zero reviewed sources");
