/* K. Aito Analytics Personal Multi Asset Client -- bundled into offline HTML. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const serial=m=>{if(typeof m!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))throw Error('年月はYYYY-MM形式です');return +m.slice(0,4)*12+(+m.slice(5)-1);};
const month=n=>String(Math.floor(n/12)).padStart(4,'0')+'-'+String(n%12+1).padStart(2,'0');
const money=v=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(v);
const comma=v=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}).format(v);
const state={data:null,result:null,roll:null,weights:null};
const knownProviders=new Set(['JPX','SPDJI','MSCI','NOMURA_BPI','BLOOMBERG_INDEX','FTSE_RUSSELL']);
function error(message){$('message').textContent=message;$('message').classList.remove('hidden');$('download').disabled=true;}
function clearError(){$('message').textContent='';$('message').classList.add('hidden');}
function strictNum(id,max=1e12){const raw=$(id).value;if(typeof raw!=='string'||raw.trim()==='')throw Error('入力欄「'+id+'」が空欄です');
 const n=Number(raw);if(!Number.isSafeInteger(n)||n<0||n>max)throw Error(id+'：0以上の整数範囲で指定してください');return n;}
function decimal(id,min,max){const raw=$(id).value;if(!raw||!raw.trim())throw Error(id+' が空欄です');const n=Number(raw);if(!Number.isFinite(n)||n<min||n>max)throw Error(id+' は'+min+'〜'+max+'の範囲です');return n;}
function csvParse(source){
 const text=source.replace(/^\uFEFF/,'');let rows=[],row=[],v='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')quoted=false;else v+=c;}
  else if(c==='"')quoted=true;else if(c===','){row.push(v);v='';}
  else if(c==='\n'){row.push(v);rows.push(row);row=[];v='';}else if(c!=='\r')v+=c;}
 if(quoted)throw Error('CSVの引用符が閉じられていません');
 if(row.length||v){row.push(v);rows.push(row);}
 if(rows.length<2)throw Error('CSVには見出しとデータ行が必要です');
 const head=rows.shift();
 if(new Set(head).size!==head.length)throw Error('CSVの見出しが重複しています');
 return {head,rows};
}
function indexCsv(content){
 const {head,rows}=csvParse(content);
 const required=['month','series_id','value','unit','currency','series_kind','origin','source_id','raw_response_sha256'];
 if(!required.every(k=>head.includes(k)))throw Error('TR CSVに必要な列がありません');
 const at=Object.fromEntries(head.map((x,i)=>[x,i])),records=new Map();
 let meta=null;
 for(const r of rows){
   if(r.length!==head.length)throw Error('TR CSVの列数が不一致');
   const x=k=>r[at[k]],date=x('month'),value=Number(x('value'));
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(date)||records.has(date))throw Error('TR CSVの年月重複・不正：'+date);
   if(x('origin')!=='OBSERVED'||x('series_kind')!=='INDEX_TOTAL_RETURN')throw Error('TR以外の価格・予測系列は拒否します');
   if(x('currency')!=='JPY')throw Error('新しい多資産画面では円換算済みJPY建てTRだけ対応。USDは事前に正規換算してください');
   if(!knownProviders.has(x('source_id')))throw Error('未登録の指数提供元');
   if(!/^[a-f0-9]{64}$/.test(x('raw_response_sha256')))throw Error('原本ハッシュ形式が不正');
   if(!/^[A-Za-z0-9._:-]{3,90}$/.test(x('series_id'))||x('unit')!=='INDEX_TR')throw Error('TR指数の単位はINDEX_TRに限定します');
   if(!Number.isFinite(value)||value<=0||!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(x('value')))throw Error('TR指数の水準値が不正');
   const m={series:x('series_id'),source:x('source_id'),unit:x('unit'),currency:x('currency'),hash:x('raw_response_sha256')};
   if(meta&&Object.keys(m).some(k=>m[k]!==meta[k]))throw Error('同一CSVに異なるTR系列・出典が混在');
   meta=m;records.set(date,value);
 }
 const months=[...records.keys()].sort();
 if(months.length<13)throw Error('TR指数は連続した13か月以上が必要');
 for(let i=1;i<months.length;i++)if(serial(months[i])!==serial(months[i-1])+1)throw Error('TR指数の途中月が欠損：'+months[i-1]);
 return {meta,records,first:months[0],last:months.at(-1)};
}
function cpiCsv(content){
 const {head,rows}=csvParse(content);
 const required=['month','series_id','value','source_id','origin','series_kind','unit','currency','raw_response_sha256'];
 if(!required.every(k=>head.includes(k)))throw Error('CPI CSVに必要な列がありません');
 const at=Object.fromEntries(head.map((x,i)=>[x,i]));
 const map=new Map();
 for(const r of rows){
  const get=k=>r[at[k]];
  if(r.length!==head.length)throw Error('CPI CSVの列数が不正');
  if(get('series_id')!=='JP_CPI_HEADLINE_2025_LINKED')continue;
  if(get('source_id')!=='ESTAT'||get('origin')!=='OBSERVED'||get('series_kind')!=='CPI_LEVEL'||
     get('unit')!=='INDEX_2025_100'||get('currency')!=='NOT_APPLICABLE'||
     !/^[a-f0-9]{64}$/.test(get('raw_response_sha256')))
    throw Error('指定e-Stat全国総合CPIのOBSERVED・2025基準以外を拒否');
  const k=get('month'),v=Number(get('value'));
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)||map.has(k)||!Number.isFinite(v)||v<=0)
    throw Error('日本CPIの年月重複または値不正');
  map.set(k,{month:k,value:v,origin:'OBSERVED'});
 }
 if(map.size<13)throw Error('全国総合CPIの連続13か月が必要');
 return map;
}
function synthetic(count){
 const ids=Array.from({length:count},(_,i)=>i===0?'CASH_JPY':i===1?'DEMO_STOCK':i===2?'DEMO_BOND':'DEMO_'+String(i+1));
 const first=serial('1971-01'),cpi=[],monthly_market_returns=[];
 for(let t=0;t<=600;t++){
  const m=month(first+t);
  cpi.push({month:m,value:35*Math.pow(1.002,t),origin:'SYNTHETIC'});
  if(t===0)continue;
  const asset_returns={};
  for(let j=0;j<ids.length;j++){
    asset_returns[ids[j]]=j===0?0:(j===1?.0045+.027*Math.sin(t*.19)+.018*Math.sin(t*.047):
       j===2?.002+.008*Math.cos(t*.15):.003+.015*Math.sin(t*.13+j*.7));
  }
  monthly_market_returns.push({month:m,origin:'SYNTHETIC',asset_returns});
 }
 return {ids,monthly_market_returns,cpi_levels:cpi,mode:'SYNTHETIC_DEMO',
  refs:Object.fromEntries(ids.map(id=>[id,{series:id,source:'SYNTHETIC_ONLY'}])),
  description:'全て合成値：市場実績・将来予測ではありません'};
}
function buildMarketFromLevels(indexes,includeCash,cpiMap){
 if(!Array.isArray(indexes)||indexes.length<1||indexes.length+(includeCash?1:0)>12)
  throw Error('本人用指数CSVは合計1〜12資産の範囲');
 const sources=new Set();
 for(const x of indexes){if(sources.has(x.meta.series))throw Error('TR系列IDが重複');sources.add(x.meta.series);}
 const start=Math.max(...indexes.map(x=>serial(x.first)));
 const end=Math.min(...indexes.map(x=>serial(x.last)));
 if(end-start<12)throw Error('各指数の共通期間が13か月未満');
 const ids=indexes.map((_,i)=>'ASSET_'+String(i+1));
 if(includeCash)ids.unshift('CASH_JPY');
 const levels=Array.from({length:end-start+1},(_,i)=>month(start+i));
 for(const x of indexes)for(const m of levels)if(!x.records.has(m))throw Error('TR指数の共通期間に欠損：'+m);
 const monthly_market_returns=[];
 for(let t=1;t<levels.length;t++){
  const returns={};if(includeCash)returns.CASH_JPY=0;
  for(let i=0;i<indexes.length;i++){
   const a=indexes[i].records.get(levels[t-1]),b=indexes[i].records.get(levels[t]);
   const rate=b/a-1;if(!Number.isFinite(rate)||rate< -1||rate>10)throw Error('月次TR変動の入力範囲外：'+levels[t]);
   returns['ASSET_'+String(i+1)]=rate;
  }
  monthly_market_returns.push({month:levels[t],origin:'OBSERVED',asset_returns:returns});
 }
 const refs={};if(includeCash)refs.CASH_JPY={series:'PERSONAL_CASH_0',source:'MODEL_ZERO_INTEREST'};
 for(let i=0;i<indexes.length;i++)refs['ASSET_'+String(i+1)]=indexes[i].meta;
 const cpi_levels=cpiMap?levels.map(m=>cpiMap.get(m)||null):null;
 return {ids,monthly_market_returns,cpi_levels,mode:'OBSERVED_RESEARCH',refs,
  description:'本人の自己申告TR指数 '+indexes.length+'系列。市場と権利は独立認証なし。基準月 '+levels[0]};
}
function parseTextSchedule(text,kind){
 if(!text.trim())return [];
 return text.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean).map((line,i)=>{
  const cols=line.split(',').map(s=>s.trim());
  if(cols.length!==4)throw Error(kind+'行'+(i+1)+'：4列(ID,開始,終了,月額)で記入');
  const [id,start,end,amount]=cols;
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(id)||![start,end,amount].every(x=>/^\d+$/.test(x)))
    throw Error(kind+'行'+(i+1)+'：IDまたは整数が不正');
  return {id,start_offset:Number(start),end_offset_exclusive:Number(end),monthly_yen:Number(amount)};
 });
}
function parseEvents(text){
 if(!text.trim())return [];
 return text.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean).map((line,i)=>{
  const c=line.split(',').map(s=>s.trim());
  if((c.length!==4&&c.length!==5)||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(c[0])||
     !/^\d+$/.test(c[1])||!['INCOME','EXPENSE'].includes(c[2])||!/^\d+$/.test(c[3])||
     (c.length===5&&!['MONTH_START','MONTH_END'].includes(c[4])))
   throw Error('臨時イベント行'+(i+1)+'：ID,経過月,INCOME/EXPENSE,整数円[,MONTH_START/MONTH_END]');
  return {id:c[0],offset_months:Number(c[1]),kind:c[2],amount_yen:Number(c[3]),
   ...(c.length===5?{timing:c[4]}:{})};
 });
}
function weightsFromEditor(){
 const ids=state.data.ids,values=ids.map((id,i)=>decimal('weight_'+i,0,100));
 const sum=values.reduce((a,b)=>a+b,0);
 if(Math.abs(sum-100)>1e-7)throw Error('資産配分の合計を100%にしてください（現在 '+sum.toFixed(2)+'%）');
 const keys=ids.map((id,i)=>({id,pct:values[i]})).sort((a,b)=>a.id.localeCompare(b.id));
 return {ids:keys.map(x=>x.id),weights:keys.map(x=>x.pct/100)};
}
function renderEditor(){
 const ids=state.data.ids;$('assetEditor').textContent='';
 const percentages=ids.map((_,i)=>Math.floor(100/ids.length)+(i<100%ids.length?1:0));
 if(ids.includes('CASH_JPY')&&ids.length>1){
  percentages[0]=20;const other=(80/(ids.length-1));
  for(let i=1;i<percentages.length;i++)percentages[i]=Math.floor(other);
  percentages[percentages.length-1]+=80-percentages.slice(1).reduce((a,b)=>a+b,0);
 }
 ids.forEach((id,i)=>{
  const line=document.createElement('div');line.className='assetrow';
  const info=document.createElement('div'),title=document.createElement('label');title.htmlFor='weight_'+i;title.textContent=id;
  const sub=document.createElement('div');sub.className='meta';
  const d=state.data.refs[id];sub.textContent=(d?.source||'')+(d?.series?' / '+d.series:'');
  info.append(title,sub);
  const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='.1';input.value=String(percentages[i]);input.id='weight_'+i;input.addEventListener('change',()=>{updateWeights();invalidate();});
  line.append(info,input);$('assetEditor').appendChild(line);
 });
 updateWeights();
}
function updateWeights(){const t=state.data.ids.map((_,i)=>Number($('weight_'+i).value)).reduce((a,b)=>a+b,0);
 $('weightSummary').textContent='配分合計：'+t.toFixed(2)+'%'+(Math.abs(t-100)>1e-7?'（100%にしてください）':'');}
function syncStart(){
 if(!state.data)return;
 const horizon=Number($('horizon').value),end=state.data.monthly_market_returns.length-horizon;
 const sel=$('startOffset');const old=Number(sel.value)||0;sel.textContent='';
 for(let i=0;i<=end;i++){
  const option=document.createElement('option');option.value=String(i);
  const first=state.data.monthly_market_returns[i]?.month;
  option.textContent=first?month(serial(first)-1):'—';sel.appendChild(option);
 }
 sel.value=String(Math.max(0,Math.min(old,end)));
}
function invalidate(){state.result=null;state.roll=null;$('download').disabled=true;
 $('balance').textContent='—';$('inflows').textContent='—';$('windows').textContent='—';
 $('balanceFoot').textContent='条件変更後、再計算が必要です';
 $('inflowsFoot').textContent='未計算';$('windowsFoot').textContent='未計算';
 $('assetResult').textContent='';$('ledgerRows').textContent='';
}
function bindData(data){
 state.data=data;invalidate();renderEditor();syncStart();
 $('dataStatus').textContent=data.description+' / 月次リターン '+data.monthly_market_returns.length+'行 / '+data.ids.length+'資産';
 run();
}
function getPlan(){
 const mode=$('expenseMode').value;
 const contribution=strictNum('monthlyContribution');
 const selectedSource=$('monthlyContributionSource').value;
 if(contribution>0&&selectedSource==='UNSELECTED')
  throw Error('二重計上を防ぐため、積立額がある場合は給与・年金と別の外部資金か内部振替かを選択してください');
 return {monthly_contribution_yen:contribution,
  monthly_contribution_source:selectedSource==='UNSELECTED'?'EXTERNAL_NEW_MONEY':selectedSource,
  monthly_expense_yen:strictNum('monthlyExpense'),
  expense_mode:mode,expense_priority:$('expensePriority').value,
  annual_expense_inflation:mode==='ANNUAL_ASSUMPTION'?decimal('inflationRate',-50,100)/100:0,
  salary_schedules:parseTextSchedule($('salaries').value,'給与'),
  pension_schedules:parseTextSchedule($('pensions').value,'年金'),
  one_time_events:parseEvents($('events').value)};
}
function getRebalance(){
 const mode=$('rebalance').value,p=decimal('rebalanceParam',0.0001,1200);
 if(mode==='NONE')return {mode:'NONE'};
 if(mode==='PERIODIC'){if(!Number.isInteger(p)||p<1)return (()=>{throw Error('定期リバランスは整数月');})();return {mode,interval_months:p};}
 if(mode==='THRESHOLD')return {mode,threshold:p/100};
 throw Error('リバランス指定が不正');
}
function csvCell(v){const s=String(v);return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
function run(){
 try{
  clearError();if(!state.data)throw Error('データがありません');
  const w=weightsFromEditor(),initial=strictNum('initial'),horizon=Number($('horizon').value),start=Number($('startOffset').value);
  if(!Number.isSafeInteger(start)||start<0||start+horizon>state.data.monthly_market_returns.length)
   throw Error('指定期間を満たす月次データがありません');
  const holdings=corePortfolio.apportion(initial,w.weights,w.ids);
  const strategy=$('withdrawalStrategy').value;
  if(strategy!=='PRO_RATA'&&!w.ids.includes('CASH_JPY'))
   throw Error('現金優先・投資優先の売却には現金0%モデルのCASH_JPYが必要です');
  const p={initial_holdings_yen:Object.fromEntries(w.ids.map((id,i)=>[id,holdings[i]])),
   target_weights:Object.fromEntries(w.ids.map((id,i)=>[id,w.weights[i]])),
   rebalance:getRebalance(),withdrawal_strategy:strategy,withdrawal_timing:$('withdrawalTiming').value};
  if(strategy!=='PRO_RATA')p.cash_asset_id='CASH_JPY';
  const plan=getPlan(),market=state.data.monthly_market_returns.slice(start,start+horizon);
  const cpi=state.data.cpi_levels?.slice(start,start+horizon+1);
  const result=coreBridge.simulatePersonalMultiAsset({monthly_market_returns:market,portfolio:p,plan,
    market_mode:state.data.mode,cpi_levels:cpi});
  const rolling=coreBridge.rollingPersonalMultiAsset({monthly_market_returns:state.data.monthly_market_returns,
   horizon_months:horizon,portfolio:p,plan,market_mode:state.data.mode,cpi_levels:state.data.cpi_levels??undefined});
  state.result=result;state.roll=rolling;state.weights=w;
  $('balance').textContent=money(result.ending_assets_yen);
  $('balanceFoot').textContent=market[0].month+' ～ '+market.at(-1).month+' ／ '+w.ids.length+
   '資産 ／ 期間外イベント '+result.skipped_events_after_horizon.length+'件';
  $('inflows').textContent=money(result.expected_deposits_yen);
  $('inflowsFoot').textContent='積立（新規外部）'+money(result.external_contribution_yen)+
    '／（内部振替）'+money(result.internal_from_income_yen)+
    '／予定支出 '+money(result.scheduled_expenses_yen)+
    '／未払 '+money(result.total_unfunded_yen);
  const funded=rolling.windows.filter(x=>x.status==='FUNDED').length;
  $('windows').textContent=funded+' / '+rolling.complete_windows;
  $('windowsFoot').textContent='過去の開始月・不足なし／完全窓。暦月基準で除外 '+
    comma(rolling.excluded_calendar_windows_due_to_gap_or_cpi)+
    ' 窓（市場欠損・CPI欠損）。将来予測確率ではありません。';
  $('chartDescription').textContent=result.accounting_contract+' / '+result.rounding_contract+
    ' / '+(state.data.mode==='SYNTHETIC_DEMO'?'SYNTHETIC':'PRIVATE USER-DECLARED');
  $('chartRange').textContent='期間 '+result.period_start_month+' ～ '+market.at(-1).month;
  $('assetResult').textContent='';
  for(const a of w.ids){
   const tr=document.createElement('tr');const vals=[a,
    (p.target_weights[a]*100).toFixed(1)+'%',money(result.ending_holdings_yen[a]),
    (state.data.refs[a]?.source||'UNKNOWN')];
   vals.forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});$('assetResult').appendChild(tr);
  }
  $('ledgerRows').textContent='';
  for(const [i,r] of result.rows.entries())if(i===0||i===result.rows.length-1||i%Math.max(1,Math.ceil(horizon/18))===0){
   const t=document.createElement('tr'),b=r.cashflow_breakdown;
   [r.month,b.total_income_yen,b.external_contribution_yen,b.internal_from_income_yen,
    b.salary_yen,b.pension_yen,b.one_time_income_yen,
    b.living_expense_yen,b.paid_living_expense_yen,b.unfunded_living_expense_yen,
    b.one_time_expense_yen,b.paid_event_expense_yen,b.unfunded_event_expense_yen,
    r.paid_withdrawal_yen,r.unfunded_yen,
    r.investment_gain_yen,r.closing_yen].forEach((x,j)=>{
    const td=document.createElement('td');td.textContent=j===0?x:money(x);t.appendChild(td);
   });$('ledgerRows').appendChild(t);
  }
  draw(result.rows.map(x=>x.closing_yen));$('download').disabled=false;
 }catch(e){invalidate();error(e.message);}
}
function draw(values){
 const canvas=$('chart'),ctx=canvas.getContext('2d');const bounds=canvas.getBoundingClientRect();
 const w=Math.max(240,bounds.width),h=Math.max(160,bounds.height),dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 if(!values?.length)return;
 const L=63,T=17,R=18,B=32,dx=w-L-R,dy=h-T-B,max=Math.max(...values,1)*1.12;
 ctx.font='11px sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';
 for(let k=0;k<=4;k++){
  const y=T+dy*k/4;ctx.strokeStyle='#e6edf4';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();
  ctx.fillStyle='#8497a9';ctx.fillText(comma(Math.round(max*(1-k/4)/10000))+'万',L-9,y);
 }
 ctx.beginPath();ctx.strokeStyle='#256bd1';ctx.lineWidth=2.2;
 for(let i=0;i<values.length;i++){
  const x=L+i/Math.max(1,values.length-1)*dx,y=T+dy*(1-values[i]/max);
  if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }ctx.stroke();
 ctx.fillStyle='#7b8fa3';ctx.textAlign='left';ctx.fillText('開始',L,h-12);ctx.textAlign='right';ctx.fillText('終了',w-R,h-12);
}
function download(){
 if(!state.result)return;
 const r=state.result,ids=state.weights.ids;
 const columns=['market_end_month','relative_offset','monthly_income_yen','regular_deposit_yen',
  'contribution_source','external_contribution_yen','internal_from_income_yen',
  'salary_yen','pension_yen','event_income_yen',
  'living_expense_due_yen','living_expense_paid_yen','living_expense_unfunded_yen',
  'event_expense_due_yen','event_expense_paid_yen','event_expense_unfunded_yen','event_payment_allocations',
  'expense_price_level_month','withdrawal_timing',
  'month_start_income_gross_yen','month_start_expenses_due_gross_yen',
  'month_start_expenses_paid_yen','month_start_unfunded_yen',
  'month_end_income_gross_yen','month_end_expenses_due_gross_yen',
  'month_end_expenses_paid_yen','month_end_unfunded_yen',
  'month_start_net_cashflow_yen','month_end_net_cashflow_yen',
  'month_start_realized_net_yen','month_end_realized_net_yen',
  'planned_net_cashflow_total_yen','realized_net_cashflow_total_yen',
  'two_phase_enabled',
  'expense_priority','withdrawal_strategy','outside_horizon_events',
  'paid_withdrawal_yen','unfunded_yen','investment_gain_yen','rebalance_turnover_yen',
  'closing_total_yen',...ids.map(id=>'closing_'+id+'_yen'),'market_mode','source_series_ids','source_provider_ids','calculation_contract','not_for_publication'];
 const rows=[columns.join(',')];
 for(const x of r.rows){
  const b=x.cashflow_breakdown;
  const vals=[x.month,x.relative_offset,b.total_income_yen,b.monthly_contribution_yen,
   b.monthly_contribution_source,b.external_contribution_yen,b.internal_from_income_yen,
   b.salary_yen,b.pension_yen,
   b.one_time_income_yen,b.living_expense_yen,b.paid_living_expense_yen,b.unfunded_living_expense_yen,
   b.one_time_expense_yen,b.paid_event_expense_yen,b.unfunded_event_expense_yen,
   b.event_payment_allocations.map(e=>e.id+':'+e.timing+':'+e.due_yen+':'+e.paid_yen+':'+e.unfunded_yen).join('|'),
   b.expense_price_level_month,r.withdrawal_timing,
   b.start_contribution_yen,b.start_withdrawal_yen,
   x.phases?.MONTH_START?.paid_withdrawal_yen??(r.withdrawal_timing==='MONTH_START'?x.paid_withdrawal_yen:0),
   x.phases?.MONTH_START?.unfunded_yen??(r.withdrawal_timing==='MONTH_START'?x.unfunded_yen:0),
   b.end_contribution_yen,b.end_withdrawal_yen,
   x.phases?.MONTH_END?.paid_withdrawal_yen??(r.withdrawal_timing==='MONTH_END'?x.paid_withdrawal_yen:0),
   x.phases?.MONTH_END?.unfunded_yen??(r.withdrawal_timing==='MONTH_END'?x.unfunded_yen:0),
   b.net_month_start_yen,b.net_month_end_yen,
   b.realized_net_month_start_yen,b.realized_net_month_end_yen,
   r.scheduled_net_cashflow_total_yen,r.realized_net_cashflow_total_yen,
   r.two_phase_enabled,
   r.expense_priority,r.withdrawal_strategy,r.skipped_events_after_horizon.length,
   x.paid_withdrawal_yen,x.unfunded_yen,x.investment_gain_yen,x.rebalance_turnover_yen,x.closing_yen,
   ...ids.map(id=>x.holdings[id].closing_yen),state.data.mode,
   ids.map(id=>state.data.refs[id]?.series||'UNKNOWN').join('|'),
   ids.map(id=>state.data.refs[id]?.source||'UNKNOWN').join('|'),
   r.accounting_contract,true];
  rows.push(vals.map(csvCell).join(','));
 }
 const blob=new Blob(['\uFEFF'+rows.join('\n')+'\n'],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Kaito_Personal_Multiasset_'+state.data.mode+'_'+r.period_start_month+'.csv';
 a.click();window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
async function loadPrivate(){
 try{
  clearError();if(!$('privateAck').checked)throw Error('本人用の権限確認欄をチェックしてください');
  const files=Array.from($('filesTr').files||[]);
  if(!files.length)throw Error('TR指数CSVを少なくとも1ファイル選択してください');
  if(files.length>12)throw Error('TR指数ファイルは最大12件');
  for(const file of files)if(file.size>8e6)throw Error('TR CSVファイルは各8MB以内');
  const indexes=[];
  for(const file of files)indexes.push(indexCsv(await file.text()));
  let cpi=null;if($('fileCpi').files?.[0]){
   const file=$('fileCpi').files[0];if(file.size>8e6)throw Error('CPI CSVが8MB超');
   cpi=cpiCsv(await file.text());
  }
  const data=buildMarketFromLevels(indexes,$('includeCash').checked,cpi);
  if(data.monthly_market_returns.length<Number($('horizon').value))throw Error('選択した年数の連続データが不足。短い期間に切り替えるか正式データを取得してください');
  bindData(data);
 }catch(e){error(e.message);}
}
function handleMode(){
 const isDemo=$('dataMode').value==='demo';
 $('demoControls').classList.toggle('hidden',!isDemo);$('privateControls').classList.toggle('hidden',isDemo);
 if(isDemo)bindData(synthetic(Number($('assetCount').value)));
 else {invalidate();state.data=null;$('assetEditor').textContent='';$('startOffset').textContent='';
 $('dataStatus').textContent='CSVを選択してローカル読込を実行してください';}
}
$('dataMode').onchange=handleMode;
$('assetCount').onchange=()=>bindData(synthetic(Number($('assetCount').value)));
$('loadPrivate').onclick=loadPrivate;$('run').onclick=run;$('download').onclick=download;
$('horizon').onchange=()=>{syncStart();invalidate();};
$('startOffset').onchange=invalidate;
$('rebalance').onchange=invalidate;
['rebalanceParam','initial','monthlyContribution','monthlyExpense','expenseMode','inflationRate',
 'salaries','pensions','events','expensePriority','withdrawalStrategy','withdrawalTiming','monthlyContributionSource'].forEach(id=>$(id).addEventListener('change',invalidate));
window.addEventListener('resize',()=>{if(state.result)draw(state.result.rows.map(r=>r.closing_yen));});
window.__KAI_MULTI_TEST__={synthetic,indexCsv,cpiCsv,buildMarketFromLevels,
 parseTextSchedule,parseEvents,getState:()=>({
  mode:state.data?.mode,assets:state.data?.ids.length,months:state.data?.monthly_market_returns.length,
  resultMonths:state.result?.rows.length,ending:state.result?.ending_assets_yen,
  rollingWindows:state.roll?.complete_windows,downloadEnabled:!$('download').disabled,
  twoPhaseEnabled:state.result?.two_phase_enabled,
  firstStartDue:state.result?.rows?.[0]?.phases?.MONTH_START?.requested_withdrawal_yen,
  firstEndDue:state.result?.rows?.[0]?.phases?.MONTH_END?.requested_withdrawal_yen,
  firstStartUnfunded:state.result?.rows?.[0]?.phases?.MONTH_START?.unfunded_yen,
  firstEndUnfunded:state.result?.rows?.[0]?.phases?.MONTH_END?.unfunded_yen
 }),run};
handleMode();
})();