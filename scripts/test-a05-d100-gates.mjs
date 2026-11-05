import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const report=JSON.parse(readFileSync(new URL('../docs/A05_D100_RELEASE_PREFLIGHT_20261106.json',import.meta.url),'utf8'));
const ids=report.release_gates.map(x=>x.id);
test('D100 release is deliberately blocked while manual requirements remain',()=>{
 assert.equal(report.schema,'A05-D100-RELEASE-PREFLIGHT-1');
 assert.equal(report.publication_decision,'NO_GO_PRODUCTION');
 assert.equal(report.production_release_authorized,false);
 assert.equal(report.candidate.status,'DRAFT_NON_DIAGNOSTIC_UNAPPROVED');
 assert.deepEqual(ids,['G01','G02','G03','G04','G05','G06','G07','G08','G09']);
 assert.equal(new Set(ids).size,9);
});
test('Browser injection does not substitute real URL and HTTP headers',()=>{
 assert.equal(report.security.production_csp_header_verified,false);
 assert.equal(report.security.hosting_provider_header_capability_verified,false);
 for(const id of ['G05','G06','G07','G08','G09'])
  assert.notEqual(report.release_gates.find(x=>x.id===id).status,'PASS');
 assert.equal(report.release_gates.find(x=>x.id==='G02').status,'PASS_LIMITED');
});
test('All risky release and research actions remain explicitly prohibited',()=>{
 for(const [key,value] of Object.entries(report.guardrails))assert.equal(value,true,key);
 assert.equal(report.candidate.automated_score,false);
 assert.equal(report.candidate.type_classification,false);
 assert.equal(report.candidate.does_not_collect_user_responses,true);
 assert.equal(report.candidate.historical_result_migration,false);
 assert.equal(report.candidate.noindex,true);
});
test('QA evidence claims actual run only for Node and injected browser',()=>{
 assert.deepEqual(report.qa_executed.map(x=>x.id),['NODE_NATIVE','CHROME_INJECTED_CSP','CHROME_CSP_TAMPER']);
 assert.ok(report.qa_executed.every(x=>x.result==='PASS'));
 assert.equal(report.qa_executed[0].count,5);
 assert.equal(report.qa_executed[1].count,5);
 assert.deepEqual(report.qa_executed[1].viewports,[280,320,390,820,1280]);
 assert.ok(report.qa_registered_not_executed.every(x=>x.status.startsWith('NOT_')));
});
