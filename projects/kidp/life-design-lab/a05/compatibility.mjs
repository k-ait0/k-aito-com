/**
 * A05 C-01: read-only, type-only compatibility EDITORIAL preview.
 * This module does not predict relationship quality, success, or suitability.
 * No survey answers, snapshots, storage, network, scores or ranking.
 * 136 unordered pairs are generated deterministically from the frozen draft type registry.
 */
import { TYPES, GROUPS, TYPE_VERSION, CONTENT_VERSION } from "./types.mjs";
import { AXES } from "./questions.mjs";

export const COMPATIBILITY_VERSION = "A05-COMPAT-C01-0.1.0-editorial";
export const SOURCE_TYPE_VERSION = "A05-T-1.0.0-draft";
export const SOURCE_CONTENT_VERSION = "A05-C-1.0.0-draft";
export const EVIDENCE_STATUS = "NO_DIRECT_A05_PAIR_VALIDATION";

const SIDES = Object.freeze([
  Object.freeze({ id: "A", negative: "安定", positive: "変化",
    tension: "生活の変化や安心できる環境について、希望が異なる可能性があります。",
    complement: "一方の基盤づくりと他方の新しい視点を、話し合いの材料にできます。",
    prompt: "安心できる基盤と新しい挑戦を、どのように両立したいですか？" }),
  Object.freeze({ id: "B", negative: "自律", positive: "つながり",
    tension: "個人で決める範囲と、一緒に考える範囲の希望を確認する必要があります。",
    complement: "自分で選ぶことと他者を大切にすることは両立し得ます。二極性は未検証です。",
    prompt: "一人で決めたいことと、相手と相談したいことは何ですか？" }),
  Object.freeze({ id: "C", negative: "将来", positive: "現在",
    tension: "将来に備える時間と、今日を楽しむ時間の配分が異なるかもしれません。",
    complement: "長期的な見通しと今の充実を、両方考えるきっかけになります。",
    prompt: "将来への備えと今日の充実を、どう両立させたいですか？" }),
  Object.freeze({ id: "D", negative: "探索", positive: "深耕",
    tension: "新しい経験を広げることと、一つを続けることの優先度が違うかもしれません。",
    complement: "新しい選択肢の発見と継続的な深まりを、互いに紹介し合えます。",
    prompt: "新しいことを試す時間と、一つを深める時間をどう分けたいですか？" })
]);
export const COMPATIBILITY_AXES = SIDES;

function assertRegistry() {
  if (TYPE_VERSION !== SOURCE_TYPE_VERSION || CONTENT_VERSION !== SOURCE_CONTENT_VERSION ||
      TYPES.length !== 16 || GROUPS.length !== 4 ||
      AXES.slice(0, 4).map(x => x.id).join(",") !== "A,B,C,D" ||
      AXES.slice(0, 4).some((axis, i) =>
        axis.negative !== SIDES[i].negative || axis.positive !== SIDES[i].positive)) {
    throw new Error("A05 draft registry changed: explicit compatibility review and versioning required");
  }
  for (let i = 0; i < TYPES.length; i++) {
    if (TYPES[i].id !== "T" + String(i + 1).padStart(2, "0") ||
        TYPES[i].group !== Math.floor(i / 4)) {
      throw new Error("A05 type order/group changed: compatibility mapping requires review");
    }
  }
}
assertRegistry();

const typeById = new Map(TYPES.map(type => [type.id, type]));
const profileById = new Map(TYPES.map((type, index) => {
  const group = Math.floor(index / 4), within = index % 4;
  return [type.id, Object.freeze({
    A: group >= 2 ? 1 : -1,
    B: group % 2 ? 1 : -1,
    C: within >= 2 ? 1 : -1,
    D: within % 2 ? 1 : -1
  })];
}));

function requireTypeId(typeId) {
  if (typeof typeId !== "string" || !typeById.has(typeId)) {
    throw new TypeError("Select an existing draft T01-T16 type ID; no type is inferred");
  }
  return typeId;
}

export function getTypeAxisProfile(typeId) {
  return profileById.get(requireTypeId(typeId));
}

function buildPair(a, b) {
  const left = profileById.get(a), right = profileById.get(b);
  const agreements = [], differences = [];
  for (const axis of SIDES) {
    const l = left[axis.id], r = right[axis.id];
    const firstLabel = l === 1 ? axis.positive : axis.negative;
    const secondLabel = r === 1 ? axis.positive : axis.negative;
    if (l === r) {
      agreements.push(Object.freeze({
        axis: axis.id, label: firstLabel,
        description: "両タイプの設定上は「" + firstLabel + "」が共通します。実際の重視度や行動の一致は不明です。",
        prompt: "同じ「" + firstLabel + "」でも、あなたたちにとって具体的に何を意味しますか？"
      }));
    } else {
      differences.push(Object.freeze({
        axis: axis.id, first: firstLabel, second: secondLabel,
        tensionHypothesis: axis.tension,
        complementHypothesis: axis.complement,
        prompt: axis.prompt,
        constructCaution: axis.id === "B" ? "Bの自律／つながりの二極性は未検証です。" : null
      }));
    }
  }
  const prompts = [...differences.map(x => x.prompt), ...agreements.map(x => x.prompt)].slice(0, 3);
  return Object.freeze({
    id: a + "-" + b,
    typeIds: Object.freeze([a, b]),
    groupIds: Object.freeze([GROUPS[typeById.get(a).group].id, GROUPS[typeById.get(b).group].id]),
    sameType: a === b,
    agreements: Object.freeze(agreements),
    differences: Object.freeze(differences),
    conversationPrompts: Object.freeze(prompts),
    interpretationKind: "EDITORIAL_RULE_BASED_HYPOTHESIS",
    evidence: Object.freeze({
      directPairValidation: false,
      status: EVIDENCE_STATUS,
      researchReview: "PENDING",
      literatureIds: Object.freeze([]),
      limitations: "A05の軸・16分類・136組に直接の心理測定上の検証はありません。一般的な対人研究から個別の相性を推定できません。"
    }),
    score: null,
    rank: null
  });
}

const registry = [];
const pairById = new Map();
for (let i = 0; i < TYPES.length; i++) {
  for (let j = i; j < TYPES.length; j++) {
    const pair = buildPair(TYPES[i].id, TYPES[j].id);
    registry.push(pair);
    pairById.set(pair.id, pair);
  }
}
export const COMPATIBILITY_PAIRS = Object.freeze(registry);
if (COMPATIBILITY_PAIRS.length !== 136 || pairById.size !== 136) {
  throw new Error("Expected 136 unique unordered type pairs");
}

/** Order-independent lookup; no actual participant results are accepted. */
export function getCompatibilityPair(typeIdA, typeIdB) {
  const ids = [requireTypeId(typeIdA), requireTypeId(typeIdB)].sort();
  return pairById.get(ids.join("-"));
}
