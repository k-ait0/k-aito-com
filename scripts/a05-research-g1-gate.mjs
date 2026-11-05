/**
 * A05 D-38 - G1 desk-review helper. Pure and read-only.
 * A passing checklist is NOT permission to recruit, record or collect data.
 * There is deliberately no automatic "authorized" or "active" state.
 */
export const G1_REGISTER_SCHEMA = "A05-G1-APPROVAL-REGISTER-1";
export const G1_REQUIRED_IDS = Object.freeze(
  Array.from({ length: 12 }, (_, index) =>
    "G1-" + String(index + 1).padStart(2, "0")));
export const G1_NONAUTHORIZATION = "NOT_AUTHORIZED_FOR_RESEARCH";

function populated(text) {
  return typeof text === "string" && text.trim().length > 0;
}
function approvedDecision(record) {
  return record?.status === "DECIDED" &&
    populated(record.decision) &&
    populated(record.evidenceRef) &&
    populated(record.approvedByRole) &&
    populated(record.approvedAt);
}

/**
 * Returns a nonauthorizing audit of completeness for human G1 review.
 * The user/owner must separately approve research operations, through
 * a process established outside this repository.
 */
export function inspectG1Readiness(register) {
  const blockers = [];
  if (!register || typeof register !== "object" || Array.isArray(register)) {
    return Object.freeze({
      state:G1_NONAUTHORIZATION, allDecisionsRecorded:false,
      manualReviewEligible:false, authorized:false,
      blockers:["Invalid G1 approval register"]
    });
  }
  if (register.schema !== G1_REGISTER_SCHEMA)
    blockers.push("Unsupported G1 schema");
  if (register.state !== "DRAFT_NOT_APPROVED")
    blockers.push("Unexpected G1 record state; never infer authorization");
  if (register.automatedGate !== "NEVER_AUTHORISES_RECRUITMENT_OR_COLLECTION")
    blockers.push("Explicit no-authorization boundary is absent");
  if (register.dataCollected !== false || register.interviewsConducted !== 0)
    blockers.push("The pre-research register must not imply actual participation");

  const decisions = register.operationalDecisions;
  if (!Array.isArray(decisions) || decisions.length !== G1_REQUIRED_IDS.length) {
    blockers.push("Expected exactly twelve documented operational decisions");
  }
  const byId = new Map();
  if (Array.isArray(decisions)) {
    for (const item of decisions) {
      if (!item || !G1_REQUIRED_IDS.includes(item.id) || byId.has(item.id))
        blockers.push("Missing, duplicate or unknown G1 item ID");
      else byId.set(item.id, item);
    }
  }
  for (const id of G1_REQUIRED_IDS) {
    const record = byId.get(id);
    if (!record) {
      blockers.push(id + ": missing");
      continue;
    }
    if (!populated(record.title) || !populated(record.purpose))
      blockers.push(id + ": title or purpose missing");
    if (record.status === "PENDING") {
      blockers.push(id + ": decision pending");
    } else if (!approvedDecision(record)) {
      blockers.push(id + ": decision evidence or responsible role missing");
    }
  }

  const forbidden = register.forbiddenUntilExplicitApproval;
  const needed = ["participant-recruitment", "personal-data-collection",
    "response-storage", "recording", "screen-capture",
    "production-scoring", "public-release"];
  if (!Array.isArray(forbidden) || needed.some(x => !forbidden.includes(x)))
    blockers.push("Forbidden-activity boundary incomplete");

  const signoff = register.finalSignoff;
  if (!signoff || signoff.state !== "PENDING") {
    blockers.push("Final G1 approval is not permitted in this draft register");
  } else {
    blockers.push("External human G1 sign-off pending");
  }
  const allDecisionsRecorded = G1_REQUIRED_IDS.every(id => approvedDecision(byId.get(id)));
  const manualReviewEligible =
    allDecisionsRecorded && blockers.length === 1 &&
    blockers[0] === "External human G1 sign-off pending";
  return Object.freeze({
    state:G1_NONAUTHORIZATION,
    allDecisionsRecorded,
    manualReviewEligible,
    authorized:false,
    blockers:Object.freeze([...blockers])
  });
}
