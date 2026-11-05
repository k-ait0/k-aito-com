/**
 * D90: read-only comparison and separately versioned scoring for unapproved B/C pilot.
 * No data collection, version conversion, 16-type issue, or compatibility claims.
 */
export const D87_SCHEMA = "A05-BC-PILOT-0.1-draft";
export const D90_SCHEMA = "A05-BC-PILOT-0.2-draft";
export const D90_SCORING_VERSION = "A05-BC-SCORE-0.2-draft";
export const D90_CHANGED_IDS = Object.freeze([
  "B-S03", "B-R01", "B-R03", "C-F03", "C-P02", "C-P03"
]);
const FACETS = Object.freeze([
  ["B","self"], ["B","related"], ["C","future"], ["C","present"]
]);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const validScore = v => Number.isInteger(v) && v >= 1 && v <= 7;
function requireBank(bank,schema) {
  if (!bank || typeof bank !== "object" || Array.isArray(bank) ||
      bank.schema !== schema || bank.status !== "UNAPPROVED_RESEARCH_ONLY" ||
      !Array.isArray(bank.facets) || !Array.isArray(bank.items) ||
      bank.facets.length !== 4 || bank.items.length !== 12 ||
      bank.response?.cannot_judge !== null ||
      !same(bank.response?.values,[1,2,3,4,5,6,7]) ||
      bank.scoring?.aggregation !== "complete_case_arithmetic_mean" ||
      bank.scoring?.required_answers_per_facet !== 3 ||
      bank.scoring?.classify !== false ||
      bank.scoring?.type_id !== null ||
      bank.scoring?.group_id !== null ||
      bank.scoring?.classification_status !== "WITHHELD" ||
      bank.scoring?.allow_old_record_rescoring !== false)
    throw new TypeError("Invalid or unsafe pilot bank " + schema);
  if (!FACETS.every(([axis,id],index) =>
      bank.facets[index]?.axis === axis && bank.facets[index]?.id === id &&
      typeof bank.facets[index]?.label === "string"))
    throw new TypeError("Pilot facets changed unexpectedly");
  const ids = new Set();
  for (const item of bank.items) {
    if (!item || typeof item.id !== "string" || ids.has(item.id) ||
        typeof item.text !== "string" || !item.text.trim() ||
        !FACETS.some(([axis,id])=>item.axis === axis && item.facet === id))
      throw new TypeError("Invalid pilot question");
    ids.add(item.id);
  }
  for (const [axis,id] of FACETS) {
    if (bank.items.filter(q => q.axis === axis && q.facet === id).length !== 3)
      throw new TypeError("Every pilot facet requires exactly three items");
  }
  return bank;
}

export function compareBCPilotBanks(v01,v02) {
  requireBank(v01,D87_SCHEMA);
  requireBank(v02,D90_SCHEMA);
  if (v02.scoring.version !== D90_SCORING_VERSION ||
      v02.scoring.persist !== false ||
      v02.scoring.old_result_compatibility !== "NOT_ESTABLISHED" ||
      v02.revision?.predecessor_schema !== D87_SCHEMA ||
      !/^[0-9a-f]{40}$/.test(v02.revision?.predecessor_git_blob_sha || "") ||
      v02.revision?.equivalence !== "NOT_ESTABLISHED" ||
      v02.revision?.response_migration !== "PROHIBITED" ||
      v02.revision?.classification !== "WITHHELD" ||
      !same(v01.facets,v02.facets) ||
      !same(v01.response,v02.response) ||
      !same(v01.fixtures,v02.fixtures))
    throw new TypeError("Pilot bank version or invariants mismatch");
  const fields=["aggregation","required_answers_per_facet","missing","range",
    "classify","type_id","group_id","classification_status","allow_old_record_rescoring"];
  for (const field of fields) if (!same(v01.scoring[field],v02.scoring[field]))
    throw new TypeError("Scoring contract changed: " + field);
  const rows=v01.items.map((previous,index) => {
    const revised=v02.items[index];
    if (!revised || revised.id !== previous.id ||
        revised.axis !== previous.axis || revised.facet !== previous.facet)
      throw new TypeError("Question identity or order changed");
    return Object.freeze({
      id:previous.id, axis:previous.axis, facet:previous.facet,
      before:previous.text, after:revised.text,
      status:previous.text===revised.text?"UNCHANGED":"REVISED"
    });
  });
  const changes=rows.filter(row=>row.status==="REVISED").map(row=>row.id);
  if (!same(changes,D90_CHANGED_IDS) ||
      !same(changes,v02.revision?.changed_item_ids) ||
      v02.revision?.changed_count !== 6 ||
      v02.revision?.unchanged_count !== 6 ||
      !D90_CHANGED_IDS.every(id => typeof v02.revision?.item_reasons?.[id] === "string"))
    throw new TypeError("Unreviewed changes detected");
  return Object.freeze({
    from:D87_SCHEMA, to:D90_SCHEMA,
    rows:Object.freeze(rows), changed:changes.length, unchanged:rows.length-changes.length,
    scoringFormulaUnchanged:true, psychometricEquivalence:"NOT_ESTABLISHED",
    typeId:null, groupId:null, classificationStatus:"WITHHELD",
    historicalResultsMigrated:false, productionApproved:false
  });
}

/**
 * Explicit v0.2 calculation for synthetic fixtures, not a validation study.
 * Do not apply to old answer records or infer cross-version score equivalence.
 */
export function scoreD90Pilot(v02,answers={}) {
  requireBank(v02,D90_SCHEMA);
  if (v02.scoring.version !== D90_SCORING_VERSION)
    throw new TypeError("Unsupported D90 scoring version");
  if (!answers || typeof answers!=="object" || Array.isArray(answers) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(answers)))
    throw new TypeError("Invalid answer record");
  const allowed=new Set(v02.items.map(q=>q.id));
  for (const [id,value] of Object.entries(answers))
    if (!allowed.has(id) || !(value === null || validScore(value)))
      throw new TypeError("Invalid answer: "+id);
  const scales=v02.facets.map(f=>{
    const questions=v02.items.filter(q=>q.facet===f.id);
    const ratings=questions.filter(q=>own(answers,q.id)&&answers[q.id]!==null);
    const cannotJudge=questions.filter(q=>own(answers,q.id)&&answers[q.id]===null).length;
    const unselected=questions.length-ratings.length-cannotJudge;
    return Object.freeze({
      id:f.id, label:f.label, axis:f.axis,
      rated:ratings.length,cannotJudge,unselected,
      complete:ratings.length===3,
      mean:ratings.length===3?
        ratings.reduce((sum,q)=>sum+answers[q.id],0)/3:null
    });
  });
  return Object.freeze({
    schema:D90_SCHEMA,scoringVersion:D90_SCORING_VERSION,
    scales:Object.freeze(scales),selectedCount:Object.keys(answers).length,
    completeAll:scales.every(x=>x.complete),
    typeId:null,groupId:null,classificationStatus:"WITHHELD",
    oldResultCompatible:false,persisted:false,measurementValidity:"UNVALIDATED"
  });
}
