/**
 * Export the C05 editorial review queue as offline CSV. No person data,
 * approved pair scores, analytics, network, GitHub Actions or persistent
 * storage. Redirect stdout manually to a local file when needed.
 *
 * Usage:
 *   node scripts/export-a05-compatibility-copy-audit.mjs > /tmp/a05-c05-review.csv
 */
import { COPY_AUDIT_SUMMARY, COPY_REVIEW_QUEUE } from
  "../projects/kidp/life-design-lab/a05/compatibility-copy-audit.mjs";
import { getEditorialPair } from
  "../projects/kidp/life-design-lab/a05/compatibility-editorial.mjs";

const columns = [
  "pair_id","type_id_1","type_id_2","shared_axis_ids",
  "different_axis_ids","story_C_editorial_draft",
  "friction_C_editorial_draft","complement_C_editorial_draft",
  "dialogue_prompts_C_editorial_draft","general_research_candidate_ids_B",
  "text_automated_findings","text_automated_clear",
  "human_review_status","human_reviewer","human_review_date",
  "direct_pair_validation","workbook_v10_reconciled",
  "production_approved","audit_contract_version"
];
const csv = value => {
  const str = value == null ? "" : String(value);
  // Neutralize spreadsheet-formula prefixes on any copied prose.
  const safe = /^[=+\-@]/.test(str) ? "'" + str : str;
  return '"' + safe.replace(/"/g, '""') + '"';
};
if (COPY_AUDIT_SUMMARY.pairs !== 136 ||
    COPY_AUDIT_SUMMARY.productionPublication !== "BLOCKED")
  throw new Error("C05 queue is not safe to export");
console.log(columns.map(csv).join(","));
for (const item of COPY_REVIEW_QUEUE) {
  const pair = getEditorialPair(...item.typeIds);
  const cells = [
    item.pairId, ...item.typeIds,
    pair.facts.shared.map(x => x.axis).join("|"),
    pair.facts.differences.map(x => x.axis).join("|"),
    pair.editorial.story,
    pair.editorial.hypotheses.map(x => x.friction).join(" | "),
    pair.editorial.hypotheses.map(x => x.complement).join(" | "),
    pair.editorial.conversationPrompts.join(" | "),
    pair.generalResearch.sourceIds.join("|"),
    item.automatedFindings.join("|"),
    item.automatedClear,
    item.humanReviewStatus, item.humanReviewer, item.humanReviewedAt,
    item.scientificValidationEstablished, item.workbookV10Reconciled,
    item.productionApproved, item.sourceCopyAuditVersion
  ];
  if (cells.length !== columns.length)
    throw new Error("C05 row-column count mismatch: " + item.pairId);
  console.log(cells.map(csv).join(","));
}
