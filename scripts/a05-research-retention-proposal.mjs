/**
 * D-39: PURE date-only calculator for an unapproved retention proposal.
 *
 * NO participant information is accepted: pass an illustrative YYYY-MM-DD
 * only. No storage, collection, expiry scheduler or deletion is performed.
 * These are proposed limits, not a legal retention policy or consent.
 */
export const RETENTION_PROPOSAL_VERSION = "A05-D39-RETENTION-0.1";
export const RETENTION_PROPOSAL_STATE = "PROPOSAL_ONLY_NOT_APPROVED";
export const PROPOSED_DAYS = Object.freeze({
  contact: 14,
  pseudonymLink: 30,
  rawNotes: 90
});

function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new TypeError("Expected date-only YYYY-MM-DD");
  const valueAsDate = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(valueAsDate.getTime()) ||
      valueAsDate.toISOString().slice(0, 10) !== value)
    throw new RangeError("Invalid calendar date");
  return valueAsDate;
}
function addCalendarDays(utcDate, dayCount) {
  const result = new Date(utcDate.getTime());
  result.setUTCDate(result.getUTCDate() + dayCount);
  return result.toISOString().slice(0, 10);
}

/**
 * Date-only deadlines are indicative *maximum* windows, counted from each
 * hypothetical interview session; earlier purpose completion or withdrawal
 * may require earlier deletion. Human G1 review must settle each period.
 */
export function proposeRetentionDeadlines(sessionDate) {
  const date = parseDay(sessionDate);
  return Object.freeze({
    state: RETENTION_PROPOSAL_STATE,
    version: RETENTION_PROPOSAL_VERSION,
    sessionDate,
    proposalOnly: true,
    authorized: false,
    storageOrDeletionPerformed: false,
    withdrawalMatchingPossibleAfterLinkDeadline: false,
    deadlines: Object.freeze({
      contact: addCalendarDays(date, PROPOSED_DAYS.contact),
      pseudonymLink: addCalendarDays(date, PROPOSED_DAYS.pseudonymLink),
      rawNotes: addCalendarDays(date, PROPOSED_DAYS.rawNotes)
    })
  });
}
