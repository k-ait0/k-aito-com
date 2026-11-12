/**
 * A05 D-130: isolated, SIMULATION-ONLY 50->30 item-bank sampler.
 * This is NOT a psychological instrument, nor compatible with A05 v1/v2 snapshots.
 * No DOM/storage/network dependencies; no user data.
 */
export const D130_VERSION = "D130-POC-0.1";
const AXIS_ORDER = ["A", "B", "C", "D", "E"];
const COUNTS = { A: 12, B: 12, C: 12, D: 12, E: 2 };
const DRAW = { A: 7, B: 7, C: 7, D: 7, E: 2 };

function assert(ok, reason) { if (!ok) throw new Error(reason); }

// FNV-1a: stable DEMO checksum; non-cryptographic, NOT a production security proof.
function fnv32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function seededRng(seed) {
  let n = parseInt(fnv32(seed), 16) >>> 0;
  return () => {
    n = (n + 0x6D2B79F5) >>> 0;
    let z = Math.imul(n ^ (n >>> 15), n | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(input, rng) {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function validateSimulationBank(bank) {
  assert(bank?.schema === "A05-D130-50BANK-EDITORIAL-SIMULATION-0.1", "Wrong bank schema");
  assert(bank.mode === "SIMULATION_ONLY" && bank.productionEligible === false && bank.questionBankValidated === false,
    "PoC must remain simulation-only");
  assert(Array.isArray(bank.items) && bank.items.length === 50, "Bank must contain 50 records");
  const ids = new Set();
  for (const q of bank.items) {
    assert(q && typeof q.id === "string" && q.id.length > 0 && !ids.has(q.id), "Bad or repeated item ID");
    ids.add(q.id);
    assert(AXIS_ORDER.includes(q.axis), "Invalid axis");
    assert(typeof q.negative === "string" && typeof q.positive === "string", "Missing endpoint");
    assert(q.eligibility !== "APPROVED_BASE" && q.eligibility !== "PRODUCTION", "Approved-item claims forbidden");
    assert(q.format === "BIPOLAR_7" || q.format === "BIPOLAR_7_MOCK", "Mixed answer format forbidden");
    assert(!("weights" in q) && !("secondaryAxes" in q), "Cross-axis scoring forbidden in PoC");
  }
  for (const a of AXIS_ORDER) {
    assert(bank.items.filter(q => q.axis === a).length === COUNTS[a], "Wrong pool count: " + a);
  }
  const draftCount = bank.items.filter(q => q.source === "D130_NEW_RESEARCH_DRAFT").length;
  assert(draftCount === 8, "The candidate fixture must contain exactly eight unapproved drafted items");
  assert(bank.items.every(q => q.source !== "MISSING_UNWRITTEN_ITEM"), "Unwritten gaps must not be silently present");
  return true;
}
export function drawSimulationManifest(bank, seed, opts = {}) {
  validateSimulationBank(bank);
  assert(opts.production !== true && opts.persistToA05 !== true, "Production/persistence forbidden");
  assert(typeof seed === "string" && seed.length > 0 && seed.length <= 128, "Explicit seed required");
  const random = seededRng(bank.bankVersion + "|" + seed);
  const chosen = {};
  const usedOverlapGroups = new Set();
  for (const axis of [...shuffle(["A","B","C","D"], random), "E"]) {
    const pool = shuffle(bank.items.filter(x => x.axis === axis).sort((a,b) => a.id.localeCompare(b.id)), random);
    const result = [];
    for (const item of pool) {
      if (item.contentGroup && usedOverlapGroups.has(item.contentGroup)) continue;
      result.push(item);
      if (item.contentGroup) usedOverlapGroups.add(item.contentGroup);
      if (result.length === DRAW[axis]) break;
    }
    assert(result.length === DRAW[axis], "Unable to fill axis " + axis + " under overlap constraints");
    chosen[axis] = shuffle(result, random);
  }
  const ordered = [];
  for (let i = 0; i < 7; i++) {
    const round = shuffle(["A","B","C","D"].map(axis => chosen[axis][i]), random);
    if (i === 0 || i === 3) round.splice(2, 0, chosen.E[i === 0 ? 0 : 1]);
    ordered.push(...round);
  }
  assert(ordered.length === 30 && new Set(ordered.map(x=>x.id)).size === 30, "Invalid selection output");
  const questionRecords = ordered.map((q, position) => ({
    position: position + 1, id: q.id, axis: q.axis, itemVersion: q.itemVersion,
    sourceId: q.sourceId, source: q.source, format: q.format,
    stem: q.stem, negative: q.negative, positive: q.positive,
    eligibility: q.eligibility, contentGroup: q.contentGroup || null
  }));
  const manifest = {
    schema:"A05-D130-SESSION-0.1", mode:"SIMULATION_ONLY",
    seed, bankVersion:bank.bankVersion, scoringVersion:"NONE_UNCALIBRATED",
    questionCount:30, counts:{...DRAW}, questions:questionRecords,
    warnings:["Contains draft and/or placeholder questions; never issue 16-type classifications.",
      "FNV-1a demo checksum is not a cryptographic content signature.",
      "Different sampled sets are NOT score-equated."]
  };
  manifest.demoChecksum = fnv32(JSON.stringify(manifest));
  return manifest;
}
export function verifySimulationManifest(bank, manifest) {
  assert(manifest?.schema === "A05-D130-SESSION-0.1" && manifest.mode === "SIMULATION_ONLY", "Invalid manifest mode");
  const rebuilt = drawSimulationManifest(bank, manifest.seed);
  assert(JSON.stringify(rebuilt) === JSON.stringify(manifest), "Manifest changed or no longer matches seed+bank");
  return true;
}
export function makeSimulationCheckpoint(bank, manifest, answers = {}) {
  verifySimulationManifest(bank, manifest);
  assert(answers && typeof answers === "object" && !Array.isArray(answers), "Invalid answer bag");
  const ids = new Set(manifest.questions.map(q => q.id));
  for (const [id, value] of Object.entries(answers)) {
    assert(ids.has(id), "Answer references unasked item " + id);
    assert(value === null || (Number.isInteger(value) && value >= 1 && value <= 7),
      "Invalid 7-point or null answer " + id);
  }
  return { schema:"A05-D130-CHECKPOINT-0.1", mode:"SIMULATION_ONLY",
    manifest, answers:{...answers}, nextPosition:manifest.questions.findIndex(q=>!(q.id in answers)) + 1 || 31 };
}
export function restoreSimulationCheckpoint(bank, checkpoint) {
  assert(checkpoint?.schema === "A05-D130-CHECKPOINT-0.1" && checkpoint.mode === "SIMULATION_ONLY", "Invalid checkpoint");
  const restored = makeSimulationCheckpoint(bank, checkpoint.manifest, checkpoint.answers);
  assert(JSON.stringify(restored) === JSON.stringify(checkpoint), "Modified checkpoint");
  return restored;
}
export function routeSimulationFollowup(manifest, answers) {
  assert(manifest?.mode === "SIMULATION_ONLY" && manifest.questions?.length === 30, "Wrong manifest");
  assert(answers && typeof answers === "object" && !Array.isArray(answers), "Invalid answers");
  const ids = new Set(manifest.questions.map(q=>q.id));
  for (const [id,val] of Object.entries(answers)) {
    assert(ids.has(id), "Unknown answer ID");
    assert(val===null || (Number.isInteger(val)&&val>=1&&val<=7), "Bad answer");
  }
  const axes = {};
  for (const a of AXIS_ORDER) {
    let n = 0, sum = 0;
    for (const q of manifest.questions.filter(q=>q.axis===a)) {
      const v=answers[q.id];
      if (v===undefined||v===null) continue;
      n++; sum+=v-4;
    }
    let action = a==="E" ? (n<2 ? "E_AUX_INCOMPLETE" : Math.abs(sum)*10<=3*n ? "E_AUX_OPTIONAL" : "E_AUX_NO_FOLLOWUP")
      : n<4 ? "INSUFFICIENT_VALID_ANSWERS" : Math.abs(sum)*10<=3*n ? "BORDERLINE_45_55" : "NO_FOLLOWUP";
    axes[a]={n,sum,illustrativePercent:n ? Math.round((50 + 50*sum/(3*n))*10)/10 : null, action};
  }
  return {mode:"SIMULATION_ONLY",classification:"WITHHELD",typeId:null,
    scoresComparableAcrossForms:false, axes};
}
