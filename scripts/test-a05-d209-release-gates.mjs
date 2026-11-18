import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {drawResearchManifest,validateBank, BANK} from "./a05-d208-research-sampler.mjs";
const cfg=JSON.parse(readFileSync(new URL("../research/a05/d209-milestone-gates.json",import.meta.url),"utf8"));
const engine=readFileSync(new URL("../projects/kidp/life-design-lab/a05/engine.mjs",import.meta.url),"utf8");
const byId=Object.fromEntries(cfg.gates.map(g=>[g.id,g]));
const core=BANK.items.filter(x=>"ABCD".includes(x.axis));
function verifyGateContract(c){
 const reasons=[];
 const sorted=c.gates.map(g=>g.id);
 if(new Set(sorted).size!==sorted.length)reasons.push("Duplicate gate identifier");
 if(c.gates.length!==6)reasons.push("G0-G5 gate count mismatch");
 for(let i=0;i<6;i++)if(!sorted.some(s=>s.startsWith("G"+i+"_")))reasons.push("Missing gate G"+i);
 const vals=c.immutable_project_constraints;
 if(vals.items_in_bank!==BANK.items.length||vals.run_items!==30)reasons.push("Bank/draw numbers disagree");
 for(const axis of ["A","B","C","D","E"]){
   if(vals.bank_by_axis[axis]!==BANK.items.filter(x=>x.axis===axis).length)reasons.push("Bank axis mismatch");
 }
 if(c.release.allowed && c.gates.some(g=>g.status!=="PASS"))reasons.push("Release authorized with incomplete gates");
 if(c.release.allowed && core.some(x=>x.semantic_family_confirmed!==true))reasons.push("Release authorized without semantic evidence");
 if(c.release.allowed && BANK.items.some(x=>x.production_scoring_approved!==true))reasons.push("Release authorized with unapproved scoring bank");
 if(c.release.allowed && c.provisional_measurement_policy.no_auto_classification)reasons.push("Release authorized while classification forbidden");
 return reasons;
}
test("D209 contract is consistent with actual D206 bank, D208 manifest and current engine",()=>{
 assert.equal(validateBank(),true);
 assert.deepEqual(verifyGateContract(cfg),[]);
 const m=drawResearchManifest("D209-regression");
 assert.equal(m.mode,"RESEARCH_ONLY");
 assert.equal(m.productionEligible,false);
 assert.equal(m.classification,null);
 assert.equal(m.scoreVersion,null);
 assert.match(engine,/validCount > 6/);
 assert.match(engine,/e\.n < 4/);
 assert.match(engine,/length !== 30/);
});
test("Technical pass does not masquerade as semantic or psychometric success",()=>{
 assert.equal(byId.G0_TECHNICAL_BASELINE.status,"PASS");
 assert.equal(core.filter(x=>x.semantic_family_confirmed===true).length,0);
 assert.equal(BANK.items.filter(x=>x.production_scoring_approved===true).length,0);
 assert.equal(byId.G1_CONTENT_AND_CONSTRUCT.status,"BLOCKED");
 assert.notEqual(byId.G3_HUMAN_COGNITIVE_REVIEW.status,"PASS");
 assert.notEqual(byId.G4_FORMS_AND_SCORE_CALIBRATION.status,"PASS");
 assert.equal(cfg.release.allowed,false);
});
test("Reject premature release in the machine-readable contract",()=>{
 const copy=JSON.parse(JSON.stringify(cfg));
 copy.release.allowed=true;
 assert.ok(verifyGateContract(copy).some(x=>x.includes("Release authorized")));
});
test("Explicit pilot policy preserves two-sided B/C intensities and E auxiliary status",()=>{
 assert.equal(cfg.provisional_measurement_policy.scoring_after_evidence_only,true);
 assert.equal(cfg.provisional_measurement_policy.no_auto_classification,true);
 assert.equal(cfg.provisional_measurement_policy.no_cross_form_equivalence_claim,true);
 assert.equal(cfg.immutable_project_constraints.auxiliary_axis,"E");
 assert.deepEqual(cfg.immutable_project_constraints.core_axes,["A","B","C","D"]);
 assert.equal(cfg.immutable_project_constraints.base_types,16);
});
