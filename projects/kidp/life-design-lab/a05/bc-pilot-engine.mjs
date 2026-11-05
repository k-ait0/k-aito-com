/**
 * A05 D88: independent B/C preference-strength experiment.
 * No type issuance, persistence, legacy score conversion, or participant analytics.
 */
export const BC_PILOT_SCHEMA = "A05-BC-PILOT-0.1-draft";
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRating = value => Number.isInteger(value) && value >= 1 && value <= 7;

export function validateBCPilotBank(bank) {
  if (!bank || typeof bank !== "object" || Array.isArray(bank)
      || bank.schema !== BC_PILOT_SCHEMA
      || !Array.isArray(bank.items) || bank.items.length !== 12
      || !Array.isArray(bank.facets) || bank.facets.length !== 4)
    throw new TypeError("Unsupported B/C pilot bank");
  const ids = new Set();
  const facetIds = new Set();
  for (const facet of bank.facets) {
    if (!facet || !["B", "C"].includes(facet.axis)
        || typeof facet.id !== "string" || !facet.id
        || typeof facet.label !== "string" || !facet.label
        || facetIds.has(facet.id))
      throw new TypeError("Invalid pilot facet");
    facetIds.add(facet.id);
  }
  if (!["self", "related", "future", "present"].every(id => facetIds.has(id)))
    throw new TypeError("Missing pilot facet");
  for (const item of bank.items) {
    if (!item || typeof item.id !== "string" || !item.id
        || ids.has(item.id) || !facetIds.has(item.facet)
        || item.axis !== bank.facets.find(f => f.id === item.facet).axis
        || typeof item.text !== "string" || !item.text)
      throw new TypeError("Invalid pilot question");
    ids.add(item.id);
  }
  for (const facet of bank.facets)
    if (bank.items.filter(q => q.facet === facet.id).length !== 3)
      throw new TypeError("Each facet must contain three questions");
  return bank;
}

/**
 * Omitted property = not selected; null = explicit "cannot judge".
 * Scores require all three 1..7 ratings, never imputing a midpoint.
 */
export function scoreBCPilot(bank, answers = {}) {
  validateBCPilotBank(bank);
  if (!answers || typeof answers !== "object" || Array.isArray(answers)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(answers)))
    throw new TypeError("Invalid answers object");
  const allowed = new Set(bank.items.map(item => item.id));
  for (const [id, value] of Object.entries(answers))
    if (!allowed.has(id) || (value !== null && !isRating(value)))
      throw new TypeError("Unexpected question or answer value: " + id);
  const scales = bank.facets.map(facet => {
    const questions = bank.items.filter(q => q.facet === facet.id);
    let rated = 0, cannotJudge = 0, unselected = 0, sum = 0;
    for (const question of questions) {
      if (!hasOwn(answers, question.id)) { unselected++; continue; }
      if (answers[question.id] === null) { cannotJudge++; continue; }
      rated++;
      sum += answers[question.id];
    }
    return Object.freeze({
      axis: facet.axis,
      id: facet.id,
      label: facet.label,
      rated,
      cannotJudge,
      unselected,
      complete: rated === questions.length,
      mean: rated === questions.length ? sum / questions.length : null
    });
  });
  const selectedCount = Object.keys(answers).length;
  return Object.freeze({
    schema: BC_PILOT_SCHEMA,
    scales: Object.freeze(scales),
    selectedCount,
    totalCount: bank.items.length,
    completeAll: scales.every(scale => scale.complete),
    typeId: null,
    groupId: null,
    classificationStatus: "WITHHELD",
    measurementValidity: "UNVALIDATED",
    storagePolicy: "MEMORY_ONLY",
    oldTypeCompatible: false
  });
}
