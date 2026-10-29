/**
 * A05 S1 / R1 pre-release candidate: manual editorial character comparison only.
 * This adapter never infers a real person's type, ranks relationships or predicts
 * match outcomes. It is not connected to production or the diagnostic engine.
 */
import { TYPES } from "./types.mjs";
import { getCompatibilityPair, COMPATIBILITY_VERSION } from "./compatibility.mjs";

export const R1_MANUAL_PAIR_CONTRACT_VERSION = "A05-R1-S1-MANUAL-PAIR-0.1.0-unapproved";
export const R1_SOURCE_COMPATIBILITY_VERSION = "A05-COMPAT-C01-0.1.0-editorial";
const DISCLAIMER = "暫定的な16キャラクターの価値観ラベルを比較しています。個人の性格や二者の相性・関係の将来を判定するものではありません。";
const B_WARNING = "B軸「自律／つながり」は研究中の編集上の対比であり、相反する心理的特性として検証されたものではありません。";
const names = new Map(TYPES.map(type => [type.id,type.name]));
function frozenList(a) { return Object.freeze(a.map(x => Object.freeze(x))); }
if (COMPATIBILITY_VERSION !== R1_SOURCE_COMPATIBILITY_VERSION || TYPES.length !== 16)
  throw new Error("R1 draft source changed: new scientific and editorial review required");

/** Accept exactly two manually selected editorial T-IDs; reject all assessment data. */
export function compareManualCharacterPair(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(input,"leftTypeId") ||
      !Object.prototype.hasOwnProperty.call(input,"rightTypeId") ||
      typeof input.leftTypeId !== "string" ||
      typeof input.rightTypeId !== "string")
    throw new TypeError("R1 requires exactly two manually selected draft type IDs");
  const leftId=input.leftTypeId, rightId=input.rightTypeId;
  const pair=getCompatibilityPair(leftId,rightId); // validates T01..T16; order independent
  const reversed=pair.typeIds[0] !== leftId;
  const shared=frozenList(pair.agreements.map(x=>({
    axis:x.axis,label:x.label,
    draftDefinitionOnly:true
  })));
  const differences=frozenList(pair.differences.map(x=>({
    axis:x.axis,
    left:reversed?x.second:x.first,
    right:reversed?x.first:x.second,
    draftDefinitionOnly:true
  })));
  if (shared.length+differences.length!==4 ||
      [...shared,...differences].some(x=>x.axis==="E"))
    throw new Error("R1 four-axis draft pairing invariant broken");
  return Object.freeze({
    version:R1_MANUAL_PAIR_CONTRACT_VERSION,
    mode:"TWO_DRAFT_CHARACTERS_SELECTED_MANUALLY",
    pairId:pair.id,
    canonicalTypeIds: Object.freeze([...pair.typeIds]),
    selectedTypes:frozenList([{id:leftId,name:names.get(leftId)},{id:rightId,name:names.get(rightId)}]),
    sameType:pair.sameType,
    structure:Object.freeze({
      sharedAxisCount:shared.length,differentAxisCount:differences.length,
      isRelationshipQualityMeasure:false
    }),
    shared,differences,
    axisBState:"B1_BIPOLAR_DRAFT_ONLY_B2_RESEARCH_PRIORITY",
    axisBWarning:B_WARNING,
    disclaimer:DISCLAIMER,
    personalAssessmentPerformed:false,
    inferredPersonalTypeId:null,
    compatibilityScore:null,
    compatibilityRank:null,
    successPrediction:null,
    researchValidated:false,
    publicationApproved:false
  });
}
