'use strict';
const {potentialRollingWindows}=require('./analytics-history-coverage.cjs');
function buildBls10YearRequests(firstYear,lastYear){
 if(!Number.isInteger(firstYear)||!Number.isInteger(lastYear)||firstYear<1913||lastYear<firstYear||lastYear>2100)throw Error('Invalid CPI year range');
 const ranges=[];
 for(let start=firstYear;start<=lastYear;start+=10){
  const end=Math.min(lastYear,start+9);
  ranges.push({source:'BLS_CPI_US',year_from:start,year_to:end,command:'node scripts/acquire-analytics-approved-source.cjs BLS_CPI_US '+start+' '+end,run_mode:'MANUAL_ONE_REQUEST_NO_BACKGROUND',expected_max_monthly_observations:(end-start+1)*12});
 }
 return ranges;
}
function targetCoverage(first_month,last_month){
 return potentialRollingWindows({first_month,last_month,kind:'LEVEL'},360);
}
module.exports={buildBls10YearRequests,targetCoverage};
if(require.main===module){
 const from=Number(process.argv[2]||1966),to=Number(process.argv[3]||2026);
 console.log(JSON.stringify({metadata_only:true,requests:buildBls10YearRequests(from,to)},null,2));
}
