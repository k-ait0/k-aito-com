/**
 * A05 D94: editorial-only CP1 content coverage and overlap review.
 * Never compute an individual score or treat editorial pair tags as statistics.
 */
export const D94_SCHEMA = "A05-D94-CP1-CONTENT-COVERAGE-1";
export const D94_ITEM_IDS = Object.freeze(["C-P01", "C-P02", "C-P03"]);
export const D94_PAIRS = Object.freeze(["C-P01/C-P02", "C-P01/C-P03", "C-P02/C-P03"]);
const EXPECTED_SOURCE_PATHS = Object.freeze([
  "docs/A05_D93_ITEM_CONSTRUCT_MAPPING_20261105.json",
  "docs/A05_D92_CONSTRUCT_CHOICE_MATRIX_20261105.json",
  "docs/A05_D90_BC_PILOT_0_2_20261105.json"
]);
const RISKS = Object.freeze([
  "HEDONIC_CONFLATION", "IMPLICIT_FUTURE_CONTRAST",
  "WELLBEING_STATE_CONFLATION", "CURRENT_RESOURCE_DEPENDENCE",
  "ATTENTION_SKILL_CONFLATION", "NON_DISTINCT_DOMAIN"
]);
const PAIR_TAGS = Object.freeze([
  "CONCEPTUAL_OVERLAP_WITH_DISTINCT_CONTAMINATION",
  "STRONG_EDITORIAL_SEMANTIC_OVERLAP"
]);
const requireValid = (okay, why) => {
  if (!okay) throw new TypeError("Invalid D94 content review: " + why);
};
const plainText = value => typeof value === "string" && value.trim().length >= 8;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function validateD94Coverage(model, bank, matrix, d93, sourceShas) {
  requireValid(model?.schema === D94_SCHEMA &&
    model.status === "EDITORIAL_ANALYSIS_ONLY_UNVALIDATED", "schema/status");
  requireValid(bank?.schema === "A05-BC-PILOT-0.2-draft" &&
    Array.isArray(bank.items) && bank.items.length === 12, "bank");
  requireValid(matrix?.schema === "A05-D92-CONSTRUCT-CHOICE-MATRIX-1" &&
    matrix.scales?.find(s => s.id === "C_present")?.editorial_preference === "CP1",
    "concept approval source");
  requireValid(d93?.schema === "A05-D93-ITEM-TO-CONSTRUCT-MAP-1" &&
    Array.isArray(d93.items), "mapping source");
  requireValid(model?.target?.option === "CP1" &&
    model.target.scale === "C_present" &&
    model.target.formal_approval === "PENDING" &&
    model.target.definition === matrix.options.find(x => x.id === "CP1")?.definition,
    "CP1 definition");
  requireValid(Array.isArray(sourceShas) && sourceShas.length === 3 &&
    Array.isArray(model.sources) && model.sources.length === 3, "lineage");
  for (let i = 0; i < 3; i++) {
    requireValid(model.sources[i]?.path === EXPECTED_SOURCE_PATHS[i] &&
      sourceShas[i]?.path === EXPECTED_SOURCE_PATHS[i] &&
      model.sources[i].git_blob_sha === sourceShas[i].sha &&
      /^[0-9a-f]{40}$/.test(sourceShas[i].sha), "source " + i);
  }
  requireValid(model.method?.type === "manual_qualitative_semantic_content_review" &&
    model.method.semantic_overlap_is_numeric === false &&
    model.method.item_response_data_collected === false &&
    model.method.psychometric_analysis_performed === false,
    "methodological boundaries");

  requireValid(Array.isArray(model.items) && model.items.length === 3 &&
    same(model.items.map(x => x.id), D94_ITEM_IDS), "items/order");
  for (const entry of model.items) {
    const question = bank.items.find(q => q.id === entry.id);
    const mapped = d93.items.find(x => x.id === entry.id);
    requireValid(entry.text === question?.text &&
      mapped?.source_text === entry.text && entry.source_unchanged === true &&
      entry.status === "BLOCK_FOR_CP1_AGGREGATE", "item trace " + entry.id);
    for (const key of ["domain_claim", "elicits", "why", "counterexample", "must_demonstrate"])
      requireValid(plainText(entry[key]), "missing " + key + " " + entry.id);
    requireValid(Array.isArray(entry.method_risks) &&
      entry.method_risks.length >= 1 &&
      entry.method_risks.every(x => RISKS.includes(x)),
      "unsupported item risk " + entry.id);
  }
  requireValid(Array.isArray(model.pairs) && model.pairs.length === 3 &&
    same(model.pairs.map(x => x.ids.join("/")), D94_PAIRS), "pair completeness");
  for (const pair of model.pairs) {
    requireValid(PAIR_TAGS.includes(pair.category) &&
      plainText(pair.shared_target) && plainText(pair.difference) &&
      plainText(pair.problem), "pair editorial evidence");
  }
  requireValid(Array.isArray(model.candidate_domains) &&
    model.candidate_domains.length === 3 &&
    same(model.candidate_domains.map(x => x.id),
      ["process_value", "ordinary_experience", "third_nonredundant_domain"]) &&
    model.candidate_domains[2].status === "NOT_IDENTIFIED" &&
    model.candidate_domains[2].current_items.length === 0,
    "third domain cannot be invented");
  requireValid(Array.isArray(model.architecture_options) &&
    model.architecture_options.length === 3 &&
    same(model.architecture_options.map(o => o.id), ["O1", "O2", "O3"]),
    "architecture coverage");
  for (const option of model.architecture_options) {
    requireValid(option.numeric_score_allowed === false &&
      plainText(option.benefit) && plainText(option.limitation),
      "score / architecture");
  }
  requireValid(model.architecture_options[0].number_of_items === 3 &&
    model.architecture_options[0].disposition === "NO_GO_FOR_MEASUREMENT" &&
    model.architecture_options[1].number_of_items === 2 &&
    model.architecture_options[1].disposition === "CONDITIONAL_EDITORIAL_PREFERENCE" &&
    model.architecture_options[2].number_of_items === 3 &&
    model.architecture_options[2].disposition === "DEFER_UNTIL_CONSTRUCT_BOUNDARY_AND_ITEM_COVERAGE",
    "option meaning");
  requireValid(Array.isArray(model.draft_editorial_prompts) &&
    model.draft_editorial_prompts.length === 2 &&
    same(model.draft_editorial_prompts.map(x => x.id), ["DRAFT-PROCESS","DRAFT-ORDINARY"]) &&
    model.draft_editorial_prompts.every(p => p.status === "NOT_A_BANK_ITEM" &&
      p.never_reuse_old_id === true && plainText(p.text)),
    "unapproved drafts");
  requireValid(Array.isArray(model.cognitive_scenarios) &&
    model.cognitive_scenarios.length === 5 &&
    model.cognitive_scenarios.every(s => s.empirical_evidence === "NONE" &&
      plainText(s.description) && plainText(s.expected)),
    "unrun cognitive checks");
  const decision = model.decision;
  requireValid(decision?.needs_third_distinct_domain_before_three_item_design === true &&
    decision.next_editorial_option === "O2" &&
    ["existing_three_items_ready_for_mean", "existing_three_items_editorial_go",
      "option_approved_by_owner", "new_items_formally_approved",
      "two_item_mean_allowed", "three_item_mean_allowed",
      "do_not_create_v03", "do_not_modify_d90_bank",
      "no_rescoring_legacy", "no_type_id", "no_participant_collection",
      "production_release_allowed"].every(key => {
        const expected = ["do_not_create_v03","do_not_modify_d90_bank","no_rescoring_legacy",
          "no_type_id","no_participant_collection"].includes(key);
        return decision[key] === expected;
      }), "approval/safety gates");
  return Object.freeze({
    schema: D94_SCHEMA,
    reviewedItems: 3,
    assessedPairs: 3,
    distinctThirdDomainIdentified: false,
    approvedNumericScore: false,
    editorialNextOption: "O2",
    typeId: null,
    humanApproval: "PENDING",
    psychometricValidity: "NOT_ESTABLISHED"
  });
}
