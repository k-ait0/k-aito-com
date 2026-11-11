#!/usr/bin/env node
'use strict';
const {inventoryRestoredEvidence}=require('../lib/analytics/restored-evidence-inventory.cjs');
function main(argv=process.argv.slice(2)){
 if(argv.length!==2||argv[0]!=='--restore-dir')throw Error('Usage: --restore-dir /ABS/PRIVATE/analytics_private_evidence_v11');
 const report=inventoryRestoredEvidence(argv[1]);
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(!report.ready_for_v10)process.exitCode=2;
 return report;
}
if(require.main===module)try{main()}catch(e){console.error('ANALYTICS_RESTORED_EVIDENCE_INVENTORY_FAILED '+e.message);process.exitCode=1;}
module.exports={main};
