'use strict';
/** Cashflow life events v0.3. Research only; gross-of-tax nominal JPY cashflows. */
const {monthSerial,validateMonthlyReturns}=require('./cashflow-core.cjs');
const MAX_EVENTS=500,MAX_SCHEDULES=20;
function yen(n,label){if(!Number.isSafeInteger(n)||n<0)throw Error(label+' must be a nonnegative safe integer (JPY)');return n;}
function safeRound(n,label){if(!Number.isFinite(n)||n<0||n>Number.MAX_SAFE_INTEGER-0.5)throw Error('Unsafe monetary result: '+label);return Math.round(n);}
function safeAdd(a,b,label){return safeRound(a+b,label);}
function list(input,label,max){if(!Array.isArray(input)||input.length>max)throw Error(label+' must be an array with at most '+max+' records');return input;}
function id(value,label){if(typeof value!=='string'||!(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).test(value)||['constructor','prototype','__proto__'].includes(value))throw Error('Invalid '+label);return value;}
function parsePensions(entries,first,last){
 const seen=new Set();return list(entries,'pension_schedule',MAX_SCHEDULES).map((x,i)=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Malformed pension schedule '+i);
  id(x.id,'pension id');if(seen.has(x.id))throw Error('Duplicate pension id '+x.id);seen.add(x.id);
  const from=monthSerial(x.start_month),to=x.end_month===undefined?Number.MAX_SAFE_INTEGER:monthSerial(x.end_month);
  if(to<from)throw Error('Pension end before start');
  if(from>last||to<first)throw Error('Pension schedule does not overlap simulation horizon');
  return {id:x.id,from,to,amount:yen(x.monthly_yen,'pension monthly_yen')};
 });
}
function parseEvents(entries,returnMonths){
 const seen=new Set(),byMonth=new Map();
 for(const [i,x] of list(entries,'one_time_events',MAX_EVENTS).entries()){
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Malformed event '+i);
  id(x.id,'event id');if(seen.has(x.id))throw Error('Duplicate event id '+x.id);seen.add(x.id);
  monthSerial(x.month);if(!returnMonths.has(x.month))throw Error('One-time event is outside simulation calendar: '+x.month);
  if(!['INCOME','EXPENSE'].includes(x.kind))throw Error('Invalid event kind');
  const amount=yen(x.amount_yen,'event amount_yen');
  const totals=byMonth.get(x.month)||{income:0,expense:0};
  totals[x.kind==='INCOME'?'income':'expense']=safeAdd(totals[x.kind==='INCOME'?'income':'expense'],amount,'events '+x.month);
  byMonth.set(x.month,totals);
 }
 return byMonth;
}
const ALLOWED_INPUTS=new Set(['initial_assets_yen','monthly_withdrawal_yen','monthly_contribution_yen','monthly_returns','provenance','annual_expense_inflation','pension_schedule','one_time_events']);
function simulateLifecycleCashflow(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid lifecycle input');
 for(const key of Object.keys(input))if(!ALLOWED_INPUTS.has(key))throw Error('Unsupported lifecycle input: '+key);
 const {initial_assets_yen,monthly_withdrawal_yen,monthly_contribution_yen=0,monthly_returns,
   provenance='SYNTHETIC',annual_expense_inflation=0,pension_schedule=[],one_time_events=[]}=input;
 const initial=yen(initial_assets_yen,'initial_assets_yen');
 const spending=yen(monthly_withdrawal_yen,'monthly_withdrawal_yen');
 const contribution=yen(monthly_contribution_yen,'monthly_contribution_yen');
 if(typeof annual_expense_inflation!=='number'||!Number.isFinite(annual_expense_inflation)||
    annual_expense_inflation< -0.5||annual_expense_inflation>1)
    throw Error('annual_expense_inflation must be a decimal between -0.5 and 1');
 const returns=validateMonthlyReturns(monthly_returns,provenance);
 const first=returns[0].serial,last=returns.at(-1).serial;
 const pensions=parsePensions(pension_schedule,first,last);
 const events=parseEvents(one_time_events,new Set(returns.map(x=>x.month)));
 let assets=initial,totalUnfunded=0,firstShortfall=null,shortfallMonths=0;
 const rows=[];
 for(let i=0;i<returns.length;i++){
  const r=returns[i],yearFraction=i/12;
  const living=safeRound(spending*Math.pow(1+annual_expense_inflation,yearFraction),'inflated living expense '+r.month);
  let pension=0;
  for(const p of pensions)if(r.serial>=p.from&&r.serial<=p.to)pension=safeAdd(pension,p.amount,'pensions '+r.month);
  const event=events.get(r.month)||{income:0,expense:0};
  const available=safeAdd(safeAdd(safeAdd(assets,contribution,'assets plus contribution '+r.month),pension,'pension '+r.month),event.income,'event income '+r.month);
  const due=safeAdd(living,event.expense,'total expense '+r.month);
  const paid=Math.min(available,due),unfunded=due-paid,invested=available-paid;
  const closing=safeRound(invested*(1+r.rate),'closing '+r.month);
  if(unfunded>0){shortfallMonths++;if(firstShortfall===null)firstShortfall=r.month;}
  totalUnfunded=safeAdd(totalUnfunded,unfunded,'total unfunded');
  rows.push({month:r.month,opening_yen:assets,contribution_yen:contribution,
    pension_income_yen:pension,one_time_income_yen:event.income,one_time_expense_yen:event.expense,
    living_expense_yen:living,requested_withdrawal_yen:due,paid_withdrawal_yen:paid,
    unfunded_yen:unfunded,invested_before_return_yen:invested,monthly_return:r.rate,
    investment_gain_yen:closing-invested,closing_yen:closing});
  assets=closing;
 }
 return {status:shortfallMonths?'SHORTFALL':'FUNDED',provenance,publication_approved:false,
   timing:'MONTH_START_CONTRIBUTION_PENSION_EVENTS_THEN_EXPENSE_THEN_RETURN',
   inflation_model:'ASSUMED_COMPOUND_ANNUAL_RATE_APPLIED_TO_LIVING_EXPENSE_ONLY',
   horizon_months:rows.length,first_shortfall_month:firstShortfall,shortfall_months:shortfallMonths,
   total_unfunded_yen:totalUnfunded,ending_assets_yen:assets,rows};
}
module.exports={simulateLifecycleCashflow};
