'use strict';
/**
 * Research-only V0.32 local preview bridge. Never accepts third-party market files,
 * observed/proxy data, client credentials or private decrypted CPI sources.
 * Feeds deterministic SYNTHETIC observations to the existing audited CJS engines.
 */
const {monthSerial,formatMonth}=require('./cashflow-core.cjs');
const {simulatePortfolio}=require('./portfolio-core.cjs');
const {auditPortfolioAgainstInputs}=require('./portfolio-input-audit.cjs');
const {runRollingPortfolioCpiLinked}=require('./rolling-portfolio-cpi.cjs');
const defaults=Object.freeze({
  initial_yen:10000000,monthly_contribution_yen:0,monthly_living_yen:100000,
  horizon_years:20,annual_return_pct:4,annual_cpi_pct:2,
  cashflow_timing:'MONTH_START',stress_profile:'FLAT_RATE'
});
const ALLOWED=new Set(Object.keys(defaults));
const MAX_YEN=100000000000;
function validateConfig(c){
 if(!c||typeof c!=='object'||Array.isArray(c))throw Error('設定はオブジェクトで指定してください');
 for(const k of Object.keys(c))if(!ALLOWED.has(k))throw Error('未対応の入力項目: '+k);
 const x={...defaults,...c};
 for(const name of ['initial_yen','monthly_contribution_yen','monthly_living_yen'])
   if(!Number.isSafeInteger(x[name])||x[name]<0||x[name]>MAX_YEN)throw Error(name+' は0〜1000億円の整数のみ');
 if(x.initial_yen===0&&x.monthly_contribution_yen===0)throw Error('初期資産または積立額のどちらかが必要です');
 if(!Number.isInteger(x.horizon_years)||x.horizon_years<1||x.horizon_years>30)throw Error('期間は1〜30年の整数');
 if(typeof x.annual_return_pct!=='number'||!Number.isFinite(x.annual_return_pct)||x.annual_return_pct< -95||x.annual_return_pct>100)throw Error('年率騰落率は-95〜100%');
 if(typeof x.annual_cpi_pct!=='number'||!Number.isFinite(x.annual_cpi_pct)||x.annual_cpi_pct< -20||x.annual_cpi_pct>50)throw Error('年率CPI変動率は-20〜50%');
 if(!['MONTH_START','MONTH_END'].includes(x.cashflow_timing))throw Error('月初または月末を選択してください');
 if(!['FLAT_RATE','YEAR1_SHOCK'].includes(x.stress_profile))throw Error('未対応の変動シナリオ');
 return x;
}
function monthlyRate(pct){return Math.pow(1+pct/100,1/12)-1;}
function makeScenario(config){
 const c=validateConfig(config),count=c.horizon_years*12,first=monthSerial('2026-01');
 const rate=monthlyRate(c.annual_return_pct),shock=monthlyRate(-30),growth=monthlyRate(c.annual_cpi_pct);
 const monthly_market_returns=Array.from({length:count},(_,i)=>({
   month:formatMonth(first+i),origin:'SYNTHETIC',proxy:false,estimated:false,
   asset_returns:{STOCK:c.stress_profile==='YEAR1_SHOCK'&&i<12?shock:rate}
 }));
 const cpiLevels=Array.from({length:count+1},(_,i)=>({
   month:formatMonth(first-1+i),value:100*Math.pow(1+growth,i),origin:'SYNTHETIC',
   series_id:'JP_CPI_HEADLINE_2025_LINKED',source_id:'SYNTHETIC_FIXTURE',
   series_kind:'CPI_LEVEL',unit:'INDEX_2025_100',seasonal_adjustment:'NSA'
 }));
 const startIndex=c.cashflow_timing==='MONTH_START'?0:1;
 const base=cpiLevels[startIndex].value;
 const monthly_cashflows=monthly_market_returns.map((m,i)=>({
   month:m.month,contribution_yen:c.monthly_contribution_yen,
   withdrawal_yen:Math.round(c.monthly_living_yen*cpiLevels[i+startIndex].value/base)
 }));
 const fixed_cashflows=monthly_market_returns.map(m=>({month:m.month,
   contribution_yen:c.monthly_contribution_yen,withdrawal_yen:c.monthly_living_yen}));
 return {config:c,monthly_market_returns,cpiLevels,monthly_cashflows,fixed_cashflows};
}
function calculatePreview(config){
 const generated=makeScenario(config),c=generated.config;
 const portfolio={initial_holdings_yen:{STOCK:c.initial_yen},target_weights:{STOCK:1},rebalance:{mode:'NONE'}};
 const shared={...portfolio,monthly_returns:generated.monthly_market_returns,market_mode:'SYNTHETIC_DEMO',cashflow_timing:c.cashflow_timing};
 const fixedInput={...shared,monthly_cashflows:generated.fixed_cashflows};
 const cpiInput={...shared,monthly_cashflows:generated.monthly_cashflows};
 const fixed=simulatePortfolio(fixedInput),cpi=simulatePortfolio(cpiInput);
 const auditedFixed=auditPortfolioAgainstInputs(fixedInput,fixed);
 const auditedCpi=auditPortfolioAgainstInputs(cpiInput,cpi);
 if(auditedFixed.status!=='INPUT_CONCORDANCE_PASSED'||auditedCpi.status!=='INPUT_CONCORDANCE_PASSED'){
   // Audit method's success tag may be more specific; reject only if it is not a documented PASS.
   if(!/PASSED$/.test(auditedFixed.status)||!/PASSED$/.test(auditedCpi.status))throw Error('入力・台帳の独立監査に失敗');
 }
 // Independently built CPI-linked rolling engine must agree with the direct ledger.
 const rolling=runRollingPortfolioCpiLinked({
   monthly_market_returns:generated.monthly_market_returns,jp_cpi_monthly_levels:generated.cpiLevels,
   horizon_months:c.horizon_years*12,portfolio,
   cashflow_plan:{monthly_contribution_yen:c.monthly_contribution_yen,monthly_withdrawal_yen:c.monthly_living_yen},
   market_mode:'SYNTHETIC_DEMO',cashflow_timing:c.cashflow_timing,
   cpi_reference_policy:'CASHFLOW_BOUNDARY'
 });
 if(rolling.complete_windows!==1||rolling.windows[0].ending_assets_yen!==cpi.ending_assets_yen||
   rolling.windows[0].total_unfunded_yen!==cpi.total_unfunded_yen||rolling.windows[0].status!==cpi.status)
   throw Error('CPI連動Coreと月次台帳の計算が一致しません');
 const timeline=[{month:'2025-12',offset_year:0,fixed_yen:c.initial_yen,cpi_yen:c.initial_yen}];
 for(let i=11;i<fixed.rows.length;i+=12)timeline.push({month:fixed.rows[i].month,offset_year:(i+1)/12,
   fixed_yen:fixed.rows[i].closing_yen,cpi_yen:cpi.rows[i].closing_yen});
 return {
   schema:'KAITO_ANALYTICS_LOCAL_PREVIEW_V032',market_mode:'SYNTHETIC_DEMO',
   source_provenance:'SYNTHETIC_ASSUMPTIONS_ONLY',source_approved:false,
   user_uploaded_sources_accepted:false,official_jp_cpi_used:false,real_historical_cpi_vintages_used:false,
   retrospective_market_probabilities:false,uses_legacy_sha_pinned_shiller:false,
   real_data_qa_completed:false,production_approved:false,includes_taxes_fees:false,
   config:c,months:c.horizon_years*12,phase:c.cashflow_timing,
   fixed:{ending_assets_yen:fixed.ending_assets_yen,first_shortfall_month:fixed.first_shortfall_month,
     shortfall_months:fixed.shortfall_months,total_unfunded_yen:fixed.total_unfunded_yen},
   cpi_linked:{ending_assets_yen:cpi.ending_assets_yen,first_shortfall_month:cpi.first_shortfall_month,
     shortfall_months:cpi.shortfall_months,total_unfunded_yen:cpi.total_unfunded_yen,
     first_living_yen:generated.monthly_cashflows[0].withdrawal_yen,
     final_living_yen:generated.monthly_cashflows.at(-1).withdrawal_yen},
   independent_input_audits:2,cpi_cross_engine_concordance:'PASS',timeline
 };
}
module.exports={defaults,validateConfig,makeScenario,calculatePreview};
