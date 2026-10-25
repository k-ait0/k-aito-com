/**
 * D-40: synthetic-only, pure desk exercise for proposed research data handling.
 *
 * Only internally defined scenario names can be passed in.
 * There is NO ability to accept real participant identifiers, answers, dates,
 * consents or contact details. NO IO, database, network, recording or deletion.
 * All research operations remain forbidden until human G1 approval.
 */
import { proposeRetentionDeadlines } from "./a05-research-retention-proposal.mjs";

export const D40_SCENARIOS = Object.freeze([
  "consent-refused",
  "consented-withdrawal",
  "withdrawal-after-contact-expiry",
  "unverified-withdrawal",
  "withdrawal-after-link-expiry",
  "retention-deadlines",
  "repeat-withdrawal",
  "recording-not-consented",
  "withdrawal-before-consent"
]);
const DAY0 = "2026-10-26";
const D1 = "2026-10-27";
const D15 = "2026-11-10";
const D29 = "2026-11-24";
const D31 = "2026-11-26";
const D90 = "2027-01-24";

const INTERNAL_CASES = Object.freeze({
  "consent-refused": [["decline", DAY0], ["attempt-note", DAY0]],
  "consented-withdrawal": [["consent-notes", DAY0], ["consent-contact", DAY0], ["attempt-note", DAY0], ["withdraw", D1]],
  "withdrawal-after-contact-expiry": [["consent-notes", DAY0], ["consent-contact", DAY0], ["attempt-note", DAY0], ["advance", D15], ["withdraw", D15]],
  "unverified-withdrawal": [["consent-notes", DAY0], ["attempt-note", DAY0], ["withdraw-unverified", D1]],
  "withdrawal-after-link-expiry": [["consent-notes", DAY0], ["consent-contact", DAY0], ["attempt-note", DAY0], ["advance", D31], ["withdraw", D31]],
  "retention-deadlines": [["consent-notes", DAY0], ["consent-contact", DAY0], ["attempt-note", DAY0], ["advance", "2026-11-09"], ["advance", "2026-11-25"], ["advance", D90]],
  "repeat-withdrawal": [["consent-notes", DAY0], ["attempt-note", DAY0], ["withdraw", D1], ["withdraw", D29]],
  "recording-not-consented": [["consent-notes", DAY0], ["attempt-recording", DAY0]],
  "withdrawal-before-consent": [["withdraw", DAY0], ["consent-notes", D1], ["attempt-note", D1]]
});
const EXERCISE_STATE = "SYNTHETIC_ONLY_G1_NOT_APPROVED";

export function runSyntheticD40Scenario(name) {
  if (typeof name !== "string" || !Object.hasOwn(INTERNAL_CASES, name)) {
    throw new RangeError("Only pre-defined synthetic D-40 case names are accepted");
  }
  const {deadlines} = proposeRetentionDeadlines(DAY0);
  // These are anonymous boolean markers, not stored personal records.
  const s = {notesConsent:false, closed:false, link:false, contact:false,
    note:false, recording:false, withdrawalStatus:"NOT_REQUESTED"};
  const trace=[];
  let previous=DAY0;
  for (const [event, date] of INTERNAL_CASES[name]) {
    if (date < previous) throw new Error("Synthetic dates are out of order");
    previous=date;
    // Proposed expiry uses day-only calendar comparison. This is a
    // simulated marker transition, not real scheduled deletion.
    if (s.contact && date>=deadlines.contact) s.contact=false;
    if (s.link && date>=deadlines.pseudonymLink) s.link=false;
    if (s.note && date>=deadlines.rawNotes) s.note=false;
    let outcome="NO_ACTION";
    switch(event) {
      case "decline":
        s.closed=true;
        outcome="DECLINED_NO_DATA";
        break;
      case "consent-notes":
        if (!s.closed) {
          s.notesConsent=true; s.link=true;
          outcome="SYNTHETIC_CONSENT_MARKER_ONLY";
        } else outcome="REFUSED_AFTER_CLOSURE";
        break;
      case "consent-contact":
        if (s.notesConsent && !s.closed) {
          s.contact=true; outcome="SYNTHETIC_SEPARATE_CONTACT_CONSENT_ONLY";
        } else outcome="CONTACT_NOT_RECORDED_WITHOUT_CONSENT";
        break;
      case "attempt-note":
        if (s.notesConsent && !s.closed && s.link) {
          s.note=true; outcome="SYNTHETIC_NOTE_MARKER_ONLY";
        } else outcome="NOT_RECORDED_WITHOUT_CONSENT";
        break;
      case "attempt-recording":
        outcome="RECORDING_REJECTED_NO_SEPARATE_CONSENT";
        break;
      case "withdraw-unverified":
        s.closed=true; s.notesConsent=false;
        s.withdrawalStatus="UNVERIFIED_REQUEST_REQUIRES_HUMAN_REVIEW";
        outcome="UNVERIFIED_NO_VERIFIABLE_INDIVIDUAL_DELETION";
        break;
      case "withdraw":
        // A verified, participant-held withdrawal token is ASSUMED ONLY.
        // D-40 cannot demonstrate the real verification procedure.
        if (!s.link && s.note) {
          s.withdrawalStatus="UNMATCHABLE_REQUIRES_HUMAN_REVIEW";
          outcome="WITHDRAWAL_NOT_VERIFIABLY_DELETED";
          s.closed=true; s.notesConsent=false;
        } else {
          s.note=false; s.contact=false; s.link=false;
          s.closed=true; s.notesConsent=false;
          s.withdrawalStatus="SIMULATED_IDENTIFIABLE_RECORDS_CLEARED";
          outcome="SYNTHETIC_MARKERS_CLEARED";
        }
        break;
      case "advance":
        outcome="PROPOSED_DEADLINE_MARKERS_APPLIED";
        break;
      default: throw new Error("Unexpected synthetic event");
    }
    trace.push(Object.freeze({
      event, day:date, outcome, noteMarker:s.note,
      contactMarker:s.contact, linkMarker:s.link, recordingMarker:s.recording,
      withdrawalStatus:s.withdrawalStatus
    }));
  }
  const remaining = Object.freeze({
    contact:s.contact, pseudonymLink:s.link, rawNote:s.note,
    recording:s.recording
  });
  return Object.freeze({
    scenario:name, state:EXERCISE_STATE, authorized:false,
    actualDataCollected:false, actualDeletionPerformed:false,
    participantIdentifiersHandled:false, hypotheticalSessionDate:DAY0,
    retentionApproval:"UNAPPROVED_14_30_90_DAY_PROPOSAL",
    trace:Object.freeze(trace), remaining, withdrawalStatus:s.withdrawalStatus
  });
}
