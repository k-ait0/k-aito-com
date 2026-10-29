/**
 * C03 editorial display model: A = draft configuration facts,
 * B = general research context (not evidence for this pair),
 * C = untested editorial interpretation/dialogue.
 * Entirely pure/read-only and does not accept actual respondent data.
 */
import { COMPATIBILITY_PAIRS, COMPATIBILITY_VERSION,
         getCompatibilityPair } from "./compatibility.mjs";
import { TYPES } from "./types.mjs";
import { LITERATURE_CANDIDATES, SOURCE_BY_ID } from "./compatibility-literature-candidates.mjs";
import { reviewPairEvidence, EVIDENCE_DECISIONS } from "./compatibility-evidence.mjs";

export const EDITORIAL_DISPLAY_VERSION = "A05-COMPAT-C03-0.1.0-unapproved";
export const DISPLAY_SOURCE_COMPATIBILITY_VERSION = "A05-COMPAT-C01-0.1.0-editorial";
export const STRUCTURAL_LABELS = Object.freeze([
  "同型", "近接", "混合", "対照", "反対頂点"
]);

const typeById = new Map(TYPES.map(x => [x.id, x]));
const generalSources = Object.freeze(["LIT-R001", "LIT-R002", "LIT-R003", "LIT-R004"]
  .map(id => SOURCE_BY_ID[id]));
const articleNote = "研究例は主に恋愛・夫婦関係に関する一般研究です。A05のタイプ・軸・個別組合せの有効性を示すものではありません。";
const explicitCaution = "A05の4軸と16分類は未検証です。B軸の自律とつながりは両立し得ます。";

function sentenceFor(pair) {
  const first = typeById.get(pair.typeIds[0]);
  const second = typeById.get(pair.typeIds[1]);
  if (pair.sameType) {
    return "「" + first.name + "」同士。設定上の4軸は共通していますが、" +
      "現実の優先順位や経験まで同じとは限りません。";
  }
  const d = pair.differences[0];
  const lead = d ? d.axis + "軸の「" + d.first + "／" + d.second + "」" : "";
  return "「" + first.name + "」と「" + second.name + "」。" +
    "設定上は" + lead + "などに違いがあります。" +
    "どちらが優れているかではなく、互いの意味づけを確かめるきっかけにできます。";
}

function fromC01(pair) {
  const review = reviewPairEvidence(...pair.typeIds);
  if (review.directA05PairValidation !== false ||
      review.productionAllowed !== false ||
      review.originalWorkbookReconciled !== false ||
      EVIDENCE_DECISIONS.productionPublication !== "BLOCKED")
    throw new Error("Evidence gate unexpectedly opened");
  const differenceCount = pair.differences.length;
  const shared = Object.freeze(pair.agreements.map(x => Object.freeze({
    axis: x.axis, label: x.label
  })));
  const differences = Object.freeze(pair.differences.map(x => Object.freeze({
    axis: x.axis, first: x.first, second: x.second
  })));
  const hypotheses = Object.freeze(pair.differences.map(x => Object.freeze({
    axis: x.axis,
    friction: x.tensionHypothesis,
    complement: x.complementHypothesis,
    evidence: "C_EDITORIAL_HYPOTHESIS_NOT_ESTABLISHED"
  })));
  return Object.freeze({
    id: pair.id,
    typeIds: pair.typeIds,
    evidenceContractVersion: review.evidenceContractVersion,
    displayVersion: EDITORIAL_DISPLAY_VERSION,
    facts: Object.freeze({
      tier: "A_DRAFT_DEFINITION_FACT",
      shared, differences,
      sharedAxesCount: shared.length,
      differentAxesCount: differenceCount,
      structure: STRUCTURAL_LABELS[differenceCount],
      disclaimer: "4軸の設定上の構造差です。心理学的距離・相性の優劣を意味しません。"
    }),
    generalResearch: Object.freeze({
      tier: "B_GENERAL_RESEARCH_NOT_A05_VALIDATION",
      note: articleNote,
      sourceIds: Object.freeze(generalSources.map(x => x.id)),
      researchSummary: "恋愛関係の研究では、類似性と関係アウトカムの関連は領域・測定方法により混在し、タイプIDから関係の良し悪しを予測できません。",
      citationsApprovedForProduction: false
    }),
    editorial: Object.freeze({
      tier: "C_EDITORIAL_HYPOTHESIS",
      title: typeById.get(pair.typeIds[0]).name + " × " + typeById.get(pair.typeIds[1]).name,
      story: sentenceFor(pair),
      hypotheses,
      conversationPrompts: pair.conversationPrompts,
      caveat: explicitCaution
    }),
    directPairValidation: false,
    sourcePairsValidated: 0,
    productionApproved: false,
    compatibilityScore: null,
    compatibilityRank: null,
    predictedSuccess: null,
    original136WorkbookReconciled: false
  });
}

if (COMPATIBILITY_VERSION !== DISPLAY_SOURCE_COMPATIBILITY_VERSION ||
    LITERATURE_CANDIDATES.length !== 7 ||
    COMPATIBILITY_PAIRS.length !== 136)
  throw new Error("C03 requires exact C01 and candidate register versions");

export const EDITORIAL_PAIRS = Object.freeze(COMPATIBILITY_PAIRS.map(fromC01));
const pairById = new Map(EDITORIAL_PAIRS.map(x => [x.id, x]));

if (EDITORIAL_PAIRS.length !== 136 || pairById.size !== 136 ||
    EDITORIAL_PAIRS.some(x => x.productionApproved || x.compatibilityScore !== null ||
       x.compatibilityRank !== null || x.predictedSuccess !== null))
  throw new Error("C03 invariants violated");

/** Deterministic and order-independent. Includes same-type combinations. */
export function getEditorialPair(typeIdA, typeIdB) {
  const pair = getCompatibilityPair(typeIdA, typeIdB);
  return pairById.get(pair.id);
}

/** Displayable B-layer sources are only abstract-checked, not A05-approved. */
export const EDITORIAL_GENERAL_SOURCES = generalSources;
