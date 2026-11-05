/**
 * A05 D-37: deterministic *proposal* for twelve interview presentation slots.
 * This module has no browser, network, storage, consent, scoring or participant I/O.
 * A slot is a presentation sequence, not a person's identity.
 *
 * This is an editorial test fixture. Not approved for recruiting participants.
 */
export const RESEARCH_PROTOCOL_VERSION = "A05-R-PROTOCOL-1";
export const PLANNED_SLOTS = 12;
const CODES_REVISE = Object.freeze(["D31", "A", "B"]);
const CODES_BLOCK = Object.freeze(["A", "B"]);

function assertResearchOnly(base, overlay) {
  if (base?.status !== "RESEARCH_ONLY_UNAPPROVED" ||
      overlay?.status !== "RESEARCH_ONLY_UNAPPROVED" ||
      base.researchVersion !== overlay.baseResearchVersion ||
      base.policy?.scoringAllowed !== false ||
      base.policy?.productionUseAllowed !== false ||
      base.policy?.autosaveAllowed !== false ||
      base.policy?.personalDataCollectionApproved !== false ||
      overlay.permissions?.scoringAllowed !== false ||
      overlay.permissions?.productionUseAllowed !== false ||
      overlay.permissions?.autosaveAllowed !== false ||
      overlay.permissions?.personalDataCollectionApproved !== false) {
    throw new Error("The research-only protocol requires explicit disabled-permission flags");
  }
  if (!Array.isArray(base.items) || base.items.length !== 30 ||
      !Array.isArray(overlay.entries) || overlay.entries.length !== 13) {
    throw new Error("Unsupported candidate corpus size");
  }
}

/**
 * No responses are accepted, scored, saved or uploaded by this function.
 * Every slot gets 30 primary items. Exactly four focus IDs receive a
 * separate semantic comparison prompt: three P0 and one P1.
 * E05-C is a *separate* exploratory format, never part of bipolar scores.
 */
export function buildInterviewAssignment(base, overlay, slot) {
  assertResearchOnly(base, overlay);
  if (!Number.isInteger(slot) || slot < 1 || slot > PLANNED_SLOTS) {
    throw new RangeError("Slot must be an integer from 1 to 12");
  }
  const reviseById = new Map(overlay.entries.map(entry => [entry.id, entry]));
  const blocked = base.items.filter(item => item.editorialStatus === "BLOCK");
  const revised = base.items.filter(item => item.editorialStatus === "REVISE");
  const trial = base.items.filter(item => item.editorialStatus === "TRIAL");
  if (blocked.length !== 7 || revised.length !== 13 || trial.length !== 10 ||
      new Set(base.items.map(item => item.id)).size !== 30 ||
      new Set(overlay.entries.map(entry => entry.id)).size !== 13 ||
      revised.some(item => !reviseById.has(item.id)) ||
      blocked.some(item => item.variants.length !== 2) ||
      revised.some(item => item.variants.length !== 1 ||
        reviseById.get(item.id).variants.length !== 2)) {
    throw new Error("Editorial corpus is incomplete or incompatible");
  }

  const core = base.items.map(item => {
    const index = item.editorialStatus === "BLOCK"
      ? blocked.findIndex(record => record.id === item.id)
      : revised.findIndex(record => record.id === item.id);
    const code = item.editorialStatus === "BLOCK"
      ? CODES_BLOCK[(slot - 1 + index) % 2]
      : item.editorialStatus === "REVISE"
        ? CODES_REVISE[(slot - 1 + index) % 3]
        : "D31";
    const variants = item.editorialStatus === "REVISE"
      ? [...item.variants, ...reviseById.get(item.id).variants]
      : item.variants;
    const selected = variants.find(v => v.code === code);
    if (!selected || !selected.left || !selected.right) {
      throw new Error("Candidate missing: " + item.id + " / " + code);
    }
    return {
      id: item.id, position: item.sourcePosition, editorialStatus: item.editorialStatus,
      variantCode: code, left: selected.left, right: selected.right
    };
  });

  const p0 = base.items.filter(item => item.editorialStatus === "BLOCK" ||
    reviseById.get(item.id)?.priority === "P0").map(item => item.id);
  const p1 = base.items.filter(item => reviseById.get(item.id)?.priority === "P1")
    .map(item => item.id);
  if (p0.length !== 15 || p1.length !== 5) {
    throw new Error("Priority matrix is not 15 P0 + 5 P1");
  }
  const focusIds = [
    ...[0, 1, 2].map(index => p0[((slot - 1) * 3 + index) % p0.length]),
    p1[(slot - 1) % p1.length]
  ];
  if (new Set(focusIds).size !== 4) throw new Error("Duplicate follow-up selection");
  // Follow-up is a *different* wording of the same item, not another
  // independently sampled response. Label its order for interviewer notes.
  const focus = focusIds.map(id => {
    const item = base.items.find(entry => entry.id === id);
    const variants = item.editorialStatus === "REVISE"
      ? [...item.variants, ...reviseById.get(id).variants] : item.variants;
    const current = core.find(entry => entry.id === id);
    const from = variants.findIndex(v => v.code === current.variantCode);
    if (from < 0 || variants.length < 2) throw new Error("No focus alternative for " + id);
    const next = variants[(from + 1) % variants.length];
    return {
      id, primaryCode: current.variantCode, comparisonCode: next.code,
      left: next.left, right: next.right, comparisonOnly: true
    };
  });
  const separate = base.responseFormat?.E05IndependentResearchOnly;
  if (!separate || separate.scoringAllowed !== false ||
      separate.questions?.length !== 2) {
    throw new Error("E05 independent research condition is missing");
  }
  return {
    protocol: RESEARCH_PROTOCOL_VERSION,
    status: "UNAPPROVED_SCHEDULE_ONLY",
    slot,
    baseVersion: base.researchVersion,
    overlayVersion: overlay.researchVersion,
    core,
    focus,
    e05Independent: {
      // 2×2 balance: each E05 A/B wording appears three times before
      // and three times after the independent format over twelve slots.
      timing: Math.floor((slot - 1) / 2) % 2 === 0 ? "before-core" : "after-core",
      questions: separate.questions.map(({ id, domain, prompt }) => ({ id, domain, prompt }))
    },
    permissions: {
      scoringAllowed: false,
      savingAllowed: false,
      personalDataCollectionApproved: false,
      productionUseAllowed: false
    }
  };
}

export function buildInterviewPlan(base, overlay) {
  return Array.from({ length: PLANNED_SLOTS }, (_, index) =>
    buildInterviewAssignment(base, overlay, index + 1));
}
