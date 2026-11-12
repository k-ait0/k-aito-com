'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {simulatePortfolio}=require('../lib/analytics/portfolio-core.cjs');
const {auditPortfolioLedger}=require('../lib/analytics/portfolio-ledger-audit.cjs');
const {auditPortfolioAgainstInputs}=require('../lib/analytics/portfolio-input-audit.cjs');
const {formatMonth,monthSerial}=require('../lib/analytics/cashflow-core.cjs');
const sample=(mode='NONE')=>({
 initial_holdings_yen:{STOCK:6000,BOND:4000},target_weights:{STOCK:.6,BOND:.4},
 monthly_returns:Array.from({length:4},(_,i)=>({month:formatMonth(monthSerial('2020-01')+i),origin:'SYNTHETIC',asset_returns:{STOCK:[.1,-.3,.2,0][i],BOND:[0,.01,-.02,0][i]}})),
 monthly_contribution_yen:101,monthly_withdrawal_yen:700,
 rebalance:mode==='PERIODIC'?{mode,interval_months:2}:mode==='THRESHOLD'?{mode,threshold:.01}:{mode}
});
const run=(x)=>auditPortfolioAgainstInputs(x,simulatePortfolio(x));
const json=x=>JSON.parse(JSON.stringify(x));
for(const m of ['NONE','PERIODIC','THRESHOLD'])test('passes independently for '+m,()=>{
 const proof=run(sample(m));assert.equal(proof.status,'INPUT_CONCORDANCE_AND_INTERNAL_LEDGER_PASSED');assert.equal(proof.checked_asset_months,8);assert.equal(proof.publication_approved,false);
});
test('cashflow schedule input directly bound to monthly ledger',()=>{
 const x=sample();delete x.monthly_contribution_yen;delete x.monthly_withdrawal_yen;
 x.monthly_cashflows=x.monthly_returns.map((r,i)=>({month:r.month,contribution_yen:i*17,withdrawal_yen:i*101}));
 const proof=run(x);assert.equal(proof.total_requested_withdrawals_yen,606);
});
test('external return changes detected even when whole internal ledger is arithmetically self-consistent',()=>{
 const x=sample(),y=json(x);y.monthly_returns[0].asset_returns.STOCK=.2;
 const fake=simulatePortfolio(y);assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/source market return/);
});
test('external contribution differs while internal accounting still passes',()=>{
 const x=sample(),y={...x,monthly_contribution_yen:900};const fake=simulatePortfolio(y);
 assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/external contribution/);
});
test('external requested withdrawal differs while internal accounting still passes',()=>{
 const x=sample(),y={...x,monthly_withdrawal_yen:800};const fake=simulatePortfolio(y);
 assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/external requested withdrawal/);
});
test('external starting positions tampering caught (internally self-consistent)',()=>{
 const x=sample(),y=json(x);y.initial_holdings_yen.STOCK=8000;const fake=simulatePortfolio(y);
 assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/initial\/rolling holdings/);
});
test('external target weights tampering caught',()=>{
 const x=sample(),y=json(x);y.target_weights={STOCK:.8,BOND:.2};const fake=simulatePortfolio(y);
 assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/target contribution allocation|external rebalance trigger/);
});
test('external rebalance rule tampering caught',()=>{
 const x=sample('PERIODIC'),y={...x,rebalance:{mode:'PERIODIC',interval_months:1}};const fake=simulatePortfolio(y);
 assert.equal(auditPortfolioLedger(fake).status,'INTERNAL_LEDGER_ARITHMETIC_PASSED');
 assert.throws(()=>auditPortfolioAgainstInputs(x,fake),/external rebalance trigger/);
});
test('external portfolio universe mismatch blocked',()=>{
 const x=sample(),y={...x,monthly_returns:x.monthly_returns.map(r=>({...r,asset_returns:{STOCK:r.asset_returns.STOCK}})),initial_holdings_yen:{STOCK:10000},target_weights:{STOCK:1}};
 assert.throws(()=>auditPortfolioAgainstInputs(x,simulatePortfolio(y)),/asset identity\/order/);
});
test('auditor cannot mark source or production approval',()=>{
 const a=run(sample());assert.equal(a.original_market_source_authenticated,false);assert.equal(a.source_rights_approved,false);
});
test('bad annualized fake cashflow calendar rejected',()=>{
 const x=sample();delete x.monthly_contribution_yen;delete x.monthly_withdrawal_yen;
 x.monthly_cashflows=x.monthly_returns.map(r=>({month:r.month,contribution_yen:10,withdrawal_yen:100}));
 const y=json(x);y.monthly_cashflows[2].withdrawal_yen=200;
 assert.throws(()=>auditPortfolioAgainstInputs(x,simulatePortfolio(y)),/external requested withdrawal/);
});
test('audit preserves independent inputs',()=>{
 const x=sample('THRESHOLD'),before=JSON.stringify(x);run(x);assert.equal(JSON.stringify(x),before);
});
test('hand calculated integer yen and 50/50 tie allocation',()=>{
 const x={initial_holdings_yen:{A:100,B:100},target_weights:{A:.5,B:.5},monthly_returns:[{month:'2020-01',origin:'SYNTHETIC',asset_returns:{A:.1,B:0}}],monthly_contribution_yen:1,monthly_withdrawal_yen:0,rebalance:{mode:'PERIODIC',interval_months:1}};
 const s=simulatePortfolio(x),proof=auditPortfolioAgainstInputs(x,s);
 assert.equal(s.rows[0].holdings.A.contribution_yen,1);
 assert.equal(s.rows[0].pre_rebalance_yen,211); // 101*1.1 -> 111, B=100
 assert.equal(s.rows[0].holdings.A.closing_yen,106); // 211 / 2 = 105.5, A tie first
 assert.equal(s.rows[0].holdings.B.closing_yen,105);
 assert.equal(proof.ending_assets_yen,211);
});
test('zero balance, no-asset-creation, shortfall and high contribution cycling',()=>{
 const x=sample('PERIODIC');x.initial_holdings_yen={STOCK:0,BOND:0};x.monthly_contribution_yen=1_000_000_000_000;x.monthly_withdrawal_yen=1_000_000_000_000;
 const a=run(x);assert.equal(a.ending_assets_yen,0);assert.equal(a.total_requested_withdrawals_yen,4_000_000_000_000);
});
test('fixed 0/CPI-flat randomized parity across 300 paths and source ledger',()=>{
 let seed=20261112,random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<300;i++){
   const n=1+Math.floor(random()*35),p=sample(i%3===0?'NONE':i%3===1?'PERIODIC':'THRESHOLD');
   p.initial_holdings_yen={STOCK:Math.floor(random()*5000000),BOND:Math.floor(random()*1000000)};
   p.monthly_contribution_yen=Math.floor(random()*10000);p.monthly_withdrawal_yen=Math.floor(random()*150000);
   p.monthly_returns=Array.from({length:n},(_,j)=>({month:formatMonth(monthSerial('1990-01')+j),origin:'SYNTHETIC',asset_returns:{STOCK:random()*.6-.4,BOND:random()*.12-.05}}));
   assert.equal(auditPortfolioAgainstInputs(p,simulatePortfolio(p)).checked_months,n);
 }
});
