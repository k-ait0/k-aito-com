/**
 * A05 S1 research-only *synthetic fixture* representation for B2 candidate.
 * NOT a real-person questionnaire, scoring engine, validated measure, or API.
 * No IO, persistence, identity, scoring, legacy B-bit or T-ID conversion.
 */
export const B2_PROTOTYPE_VERSION = "A05-S1-B2-0.1.0-research-only";
export const B2_PROTOTYPE_SCENARIOS = Object.freeze(
  ["B2P01","B2P02","B2P03","B2P04","B2P05","B2P06"]
);
export const B2_PROTOTYPE_STATUSES = Object.freeze([
  "answered","not_applicable","cannot_judge","prefer_not_to_answer","unanswered"
]);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const exactKeys = (o, keys) => Object.keys(o).length === keys.length &&
  keys.every(k=>own(o,k));
function validateAxisResponse(answer) {
  if (typeof answer !== "object" || answer === null || Array.isArray(answer) ||
      !B2_PROTOTYPE_STATUSES.includes(answer.status)) throw new TypeError("Invalid B2 axis response");
  if (answer.status === "answered") {
    if (!exactKeys(answer, ["status","value"]) ||
        !Number.isInteger(answer.value) || answer.value < 1 || answer.value > 7)
      throw new TypeError("Answered B2 must have an integer 1..7");
  } else if (!exactKeys(answer, ["status"])) {
    throw new TypeError("Missing response status must not carry an imputed value");
  }
  return Object.freeze(answer.status==="answered"
    ? { status:"answered", value:answer.value }
    : { status:answer.status, value:null });
}
export function inspectSyntheticB2Fixture(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !exactKeys(input,["scenarioId","self","others"]) ||
      !B2_PROTOTYPE_SCENARIOS.includes(input.scenarioId))
    throw new TypeError("Research-only scenario ID and two explicit responses required");
  const self=validateAxisResponse(input.self);
  const others=validateAxisResponse(input.others);
  return Object.freeze({
    schema:B2_PROTOTYPE_VERSION,
    scenarioId:input.scenarioId,
    self,others,
    responseCompleteness:self.status==="answered" && others.status==="answered"
      ? "two_answered" : self.status!=="answered" && others.status!=="answered"
      ? "none_answered" : "partial",
    scoresGenerated:false,
    typeId:null,groupId:null,legacyBBinary:null,
    interpersonalCompatibility:null,productionApproved:false,
    measurementValidated:false,
    syntheticExampleOnly:true
  });
}
