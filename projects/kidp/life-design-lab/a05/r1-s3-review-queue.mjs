/**
 * A05 R1 S3: review PRIORITIZATION of 136 unordered, draft editorial pairs.
 * This does not approve the axes, text, citations, 16-type schema, or release.
 * No respondent data, network, persistence, scoring or prediction.
 */
import { COMPATIBILITY_PAIRS, COMPATIBILITY_VERSION } from "./compatibility.mjs";
import { EDITORIAL_PAIRS, EDITORIAL_DISPLAY_VERSION } from "./compatibility-editorial.mjs";
import { COPY_REVIEW_QUEUE, COPY_AUDIT_SUMMARY } from "./compatibility-copy-audit.mjs";

export const S3_REVIEW_QUEUE_VERSION="A05-R1-S3-136PAIR-0.1.0-draft";
const EXPECTED={
  original:"A05-COMPAT-C01-0.1.0-editorial",
  editorial:"A05-COMPAT-C03-0.1.0-unapproved",
  total:136
};
if(COMPATIBILITY_VERSION!==EXPECTED.original ||
   EDITORIAL_DISPLAY_VERSION!==EXPECTED.editorial ||
   COMPATIBILITY_PAIRS.length!==EXPECTED.total ||
   EDITORIAL_PAIRS.length!==EXPECTED.total ||
   COPY_REVIEW_QUEUE.length!==EXPECTED.total)
  throw new Error("A05 S3 source changed: explicit versioned re-review required");

const originalById=new Map(COMPATIBILITY_PAIRS.map(x=>[x.id,x]));
const editorialById=new Map(EDITORIAL_PAIRS.map(x=>[x.id,x]));
const auditById=new Map(COPY_REVIEW_QUEUE.map(x=>[x.pairId,x]));
const priorityFor=(pair)=>{
  if(pair.sameType)return {id:"P0_SAME_TYPE",order:0,reason:"同型16組：同型＝好相性という誤認と同型の摩擦仮説欠落"};
  if(pair.differences.length===4)return {id:"P1_ALL_FOUR_DIFFERENT",order:1,reason:"4軸相違8組：相違＝不適合という誤認と暗黙の順位付け"};
  if(pair.differences.some(x=>x.axis==="B"))return {id:"P2_B1_DIFFERENCE",order:2,reason:"B軸相違56組：未検証の二極性を個人の対立と誤読"};
  return {id:"P3_OTHER",order:3,reason:"残る56組：軸ごとの機会制約、文章のテンプレート化を監査"};
};
function buildRecord(pair) {
  const editorial=editorialById.get(pair.id),copy=auditById.get(pair.id);
  if(!editorial||!copy||editorial.typeIds.join("|")!==pair.typeIds.join("|") ||
     copy.typeIds.join("|")!==pair.typeIds.join("|"))throw new Error("S3 source pair mismatch "+pair.id);
  if(pair.agreements.length+pair.differences.length!==4 ||
     editorial.facts.sharedAxesCount!==pair.agreements.length ||
     editorial.facts.differentAxesCount!==pair.differences.length ||
     editorial.directPairValidation!==false ||
     editorial.productionApproved!==false ||
     editorial.generalResearch.citationsApprovedForProduction!==false ||
     !copy.automatedClear || copy.humanReviewer!==null)
    throw new Error("S3 gate unexpectedly bypassed for "+pair.id);
  const priority=priorityFor(pair);
  const issues=[
    "S1_TAXONOMY_AND_B_AXIS_UNAPPROVED",
    "S2_GENERAL_LITERATURE_NOT_A05_PAIR_EVIDENCE",
    "S3_V1_WORKBOOK_ORIGINAL_UNAVAILABLE",
    "S4_C_LAYER_QUALITATIVE_HUMAN_REVIEW_REQUIRED",
    "S7_MISINTERPRETATION_STUDY_PENDING"
  ];
  if(pair.sameType)issues.push("SAME_TYPE_FRICTION_HYPOTHESES_ABSENT");
  else issues.push("STORY_DESCRIBES_ONLY_FIRST_DIFFERING_AXIS");
  if(pair.differences.some(x=>x.axis==="B") ||
     pair.agreements.some(x=>x.axis==="B"))
    issues.push("B1_UNVALIDATED_BIPOLARITY_PRESENT");
  if(pair.differences.length===4)issues.push("FOUR_AXIS_OPPOSITION_NOT_BAD_MATCH");
  return Object.freeze({
    pairId:pair.id,
    typeIds:pair.typeIds,
    sameType:pair.sameType,
    draftStructuralDistance:pair.differences.length,
    sharedAxes:Object.freeze(pair.agreements.map(x=>x.axis)),
    differentAxes:Object.freeze(pair.differences.map(x=>x.axis)),
    sourceVersions:Object.freeze({
      generator:COMPATIBILITY_VERSION,editorial:EDITORIAL_DISPLAY_VERSION,
      copyAudit:COPY_AUDIT_SUMMARY.version
    }),
    priority:priority.id,
    priorityReason:priority.reason,
    _prioritySort:priority.order,
    issueCodes:Object.freeze(issues),
    editorialTier:"C_UNTESTED_EDITORIAL_HYPOTHESIS",
    literatureTier:"B_GENERAL_UNAPPROVED_NOT_PAIR_SUPPORT",
    firstHumanReview:"PENDING",
    secondIndependentReview:"PENDING",
    firstReviewer:null,
    secondReviewer:null,
    reviewComment:null,
    draftTextApproved:false,
    sourcesApproved:false,
    originalWorkbookV10Reconciled:false,
    scientificPairValidation:false,
    publicationApproved:false
  });
}
const records=COMPATIBILITY_PAIRS.map(buildRecord)
  .sort((a,b)=>a._prioritySort-b._prioritySort || a.pairId.localeCompare(b.pairId))
  .map(row=>Object.freeze(Object.fromEntries(
    Object.entries(row).filter(([key])=>key!=="_prioritySort"))));
export const S3_REVIEW_QUEUE=Object.freeze(records);
const counts=Object.freeze(Object.fromEntries(
  ["P0_SAME_TYPE","P1_ALL_FOUR_DIFFERENT","P2_B1_DIFFERENCE","P3_OTHER"]
    .map(k=>[k,S3_REVIEW_QUEUE.filter(r=>r.priority===k).length])));
const distanceCounts=Object.freeze(Object.fromEntries(
  [0,1,2,3,4].map(n=>[String(n),S3_REVIEW_QUEUE.filter(r=>r.draftStructuralDistance===n).length])));
export const S3_REVIEW_SUMMARY=Object.freeze({
  version:S3_REVIEW_QUEUE_VERSION,
  records:S3_REVIEW_QUEUE.length,
  byPriority:counts,
  byDraftAxisDistance:distanceCounts,
  firstHumanApproved:0,
  independentSecondApproved:0,
  originalWorkbookV10Reconciled:false,
  sourceApprovedForPublication:0,
  sourceS1ModelFinalized:false,
  currentPublicationAllowed:false
});
if(S3_REVIEW_QUEUE.length!==136||new Set(S3_REVIEW_QUEUE.map(x=>x.pairId)).size!==136||
   counts.P0_SAME_TYPE!==16 || counts.P1_ALL_FOUR_DIFFERENT!==8 ||
   counts.P2_B1_DIFFERENCE!==56 || counts.P3_OTHER!==56 ||
   [16,32,48,32,8].some((n,i)=>distanceCounts[String(i)]!==n))
  throw new Error("S3 expected combinatorial structure changed");
