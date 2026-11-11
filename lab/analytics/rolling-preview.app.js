(() => {
'use strict';
const {makeSyntheticFlatPath,monthSerial}=__require('./cashflow-core.cjs');
const {compareRollingLifecyclePlans}=__require('./rolling-plan-compare.cjs');
const $=id=>document.getElementById(id);
const ids=['assets','expense','years','market','gap','alt-expense','inflation','pension-years','pension','event','event-years'];
const numberFmt=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1});
let current=null,selected=0,pageIndex=0;
const PAGE_SIZE=25;
function money(v){return numberFmt.format(v/10000)+'万円';}
function val(id,min,max,{integer=false}={}){
  const el=$(id),raw=el.value.trim(),n=Number(raw);
  if(raw===''||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))
    throw Error('入力値を確認してください：'+el.closest('label').textContent.trim());
  return n;
}
function yenFromWan(n){
  const v=n*10000;
  if(!Number.isSafeInteger(v))throw Error('金額を整数円として扱えません');
  return v;
}
function hypotheticalPath(preset,addGap){
  const path=makeSyntheticFlatPath({start_month:'2027-01',months:420,monthly_return:0});
  for(let i=0;i<path.length;i++){
    let r=0;
    if(preset==='calm')r=0.002+0.006*Math.sin(i/8)+0.003*Math.cos(i/23);
    else if(preset==='normal')r=0.004+0.024*Math.sin(i/7)+0.013*Math.cos(i/19)-(i===83||i===255?0.12:0);
    else if(preset==='shock')r=0.004+0.017*Math.sin(i/6)+0.009*Math.cos(i/17)-(i===83?0.34:i===190?0.23:i===294?0.19:0);
    else throw Error('未対応の仮想経路です');
    path[i].monthly_return=Number(r.toFixed(9));
  }
  // A simulated missing observation. Do not forward-fill or replace it with zero.
  return addGap?path.filter(x=>x.month!=='2041-01'):path;
}
function readParameters(){
  const assets=yenFromWan(val('assets',0,100000)),expense=yenFromWan(val('expense',0,1000)),
    altExpense=yenFromWan(val('alt-expense',0,1000)),inflation=val('inflation',-5,15)/100,
    years=val('years',10,20,{integer:true}),pensionYears=val('pension-years',0,19,{integer:true}),
    pension=yenFromWan(val('pension',0,1000)),eventYears=val('event-years',0,19,{integer:true}),
    event=yenFromWan(val('event',0,100000));
  if(pension>0&&pensionYears>=years)throw Error('年金開始は対象期間内に設定してください');
  if(event>0&&eventYears>=years)throw Error('臨時支出の発生年は対象期間内に設定してください');
  const basic={id:'basic',label:'基本（生活費固定）',initial_assets_yen:assets,monthly_withdrawal_yen:expense};
  const alternate={id:'alternate',label:'比較（年金・物価・臨時支出）',initial_assets_yen:assets,
    monthly_withdrawal_yen:altExpense,annual_expense_inflation:inflation,
    relative_pension_schedule:pension?[{id:'pension',start_offset_months:pensionYears*12,monthly_yen:pension}]:[],
    relative_one_time_events:event?[{id:'event',offset_months:eventYears*12,kind:'EXPENSE',amount_yen:event}]:[]};
  return {monthly_returns:hypotheticalPath($('market').value,$('gap').checked),
    horizon_months:years*12,plans:[basic,alternate],baseline_id:'basic',market_mode:'SYNTHETIC_DEMO'};
}
function plotColor(id){return id==='basic'?'#1f68b5':'#d17a3c';}
function svgElement(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function svgText(svg,x,y,value,anchor='start'){
  const t=svgElement('text',{x,y,fill:'#6a7c91','font-size':12,'text-anchor':anchor});t.textContent=value;svg.append(t);
}
function renderGraph(data){
  const svg=$('plot');svg.replaceChildren();
  const W=850,H=315,L=81,R=23,T=17,B=43,innerW=W-L-R,innerH=H-T-B;
  if(data.length===0){svgText(svg,40,50,'計算に十分な連続データがありません');return;}
  const max=Math.max(1,...data.flatMap(w=>w.scenarios.map(s=>s.ending_assets_yen)))*1.06;
  const X=i=>L+(data.length===1?0:i/(data.length-1)*innerW),Y=v=>T+innerH-v/max*innerH;
  for(let tick=0;tick<=4;tick++){
    const py=Y(max*tick/4);
    svg.append(svgElement('line',{x1:L,y1:py,x2:W-R,y2:py,stroke:'#e2e9f2','stroke-width':1}));
    svgText(svg,L-9,py+4,numberFmt.format(max*tick/4/10000)+'万','end');
  }
  for(let tick=0;tick<=4;tick++){
    const j=Math.min(data.length-1,Math.round((data.length-1)*tick/4));
    svgText(svg,X(j),H-14,data[j].market_start_month,'middle');
  }
  for(let scenario=0;scenario<2;scenario++){
    let d='';
    for(let i=0;i<data.length;i++){
      const previous=i>0?monthSerial(data[i-1].market_start_month):null;
      const contiguous=previous!==null&&monthSerial(data[i].market_start_month)===previous+1;
      d+=(contiguous?' L ':' M ')+X(i).toFixed(2)+' '+Y(data[i].scenarios[scenario].ending_assets_yen).toFixed(2);
    }
    svg.append(svgElement('path',{d,fill:'none',stroke:plotColor(scenario===0?'basic':'alternate'),'stroke-width':2.5,'stroke-linejoin':'round'}));
  }
  for(let k=0;k<2;k++){
    const v=data[selected].scenarios[k].ending_assets_yen;
    svg.append(svgElement('circle',{cx:X(selected),cy:Y(v),r:5,fill:plotColor(k===0?'basic':'alternate'),stroke:'#fff','stroke-width':2}));
  }
}
function completionText(s){return s.status==='FUNDED'?'充足':'不足あり';}
function drawSelected(){
  if(!current||!current.windows.length)return;
  const w=current.windows[selected],a=w.scenarios[0],b=w.scenarios[1];
  $('selected-month').textContent='仮想開始：'+w.market_start_month+'／仮想最終：'+w.market_end_month;
  $('selected-basic').textContent=money(a.ending_assets_yen);
  $('selected-alt').textContent=money(b.ending_assets_yen);
  $('selected-basic-detail').textContent=completionText(a)+'／不足額：'+money(a.total_unfunded_yen)+'／初回不足：'+(a.first_shortfall_offset_months===null?'期間内なし':a.first_shortfall_offset_months+'か月後');
  $('selected-alt-detail').textContent=completionText(b)+'／不足額：'+money(b.total_unfunded_yen)+'／初回不足：'+(b.first_shortfall_offset_months===null?'期間内なし':b.first_shortfall_offset_months+'か月後');
  $('window-rows').querySelectorAll('tr').forEach((tr,i)=>{
    const active=(pageIndex*PAGE_SIZE+i)===selected;
    tr.classList.toggle('selected',active);
    tr.setAttribute('aria-selected',active?'true':'false');
  });
  renderGraph(current.windows);
}
function render(result){
  if(result.market_mode!=='SYNTHETIC_DEMO'||result.market_provenance!=='SYNTHETIC'||result.summary.some(s=>s.historical_funded_fraction!==null))
    throw Error('仮想デモ専用のデータ分離チェックに失敗しました');
  current=result;selected=0;pageIndex=0;
  $('stat-windows').textContent=numberFmt.format(result.complete_windows)+'件';
  $('stat-excluded').textContent=numberFmt.format(result.excluded_windows_due_to_missing_months)+'件';
  $('stat-period').textContent='各'+result.horizon_months/12+'年／仮想経路420か月';
  for(const [label,s] of [['basic',result.summary[0]],['alt',result.summary[1]]]){
    $('stat-'+label).textContent=s.funded_windows+' / '+result.complete_windows;
    $('stat-'+label+'-ratio').textContent=s.demo_funded_fraction===null?'算出不可':'仮想例内の割合：'+(100*s.demo_funded_fraction).toFixed(1)+'%';
  }
  $('overview').textContent='基本と比較は同じ仮想市場経路を使用。除外された'+result.excluded_windows_due_to_missing_months+'件は不足の分母に含めません。実測成功率・予測確率ではありません。';
  drawTable();
  if(result.windows.length)drawSelected();else renderGraph([]);
  $('results').classList.remove('stale');
  $('error').hidden=true;
  $('status').textContent='再計算済み（全系列は仮想データ、保存・外部通信なし）';
}
function drawTable(){
 const tbody=$('window-rows');tbody.replaceChildren();if(!current)return;
 const result=current;
 const total=result.windows.length,pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 pageIndex=Math.min(pageIndex,pages-1);
 const start=pageIndex*PAGE_SIZE,end=Math.min(total,start+PAGE_SIZE);
 $('page-count').textContent=total?`${start+1}–${end}件 / 全${total}件（${pageIndex+1}/${pages}ページ）`:'対象の開始月がありません';
 $('prev-page').disabled=pageIndex===0;
 $('next-page').disabled=pageIndex>=pages-1;
 if(!total){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='連続した検証期間が足りません';tr.append(td);tbody.append(tr);return;}
 result.windows.slice(start,end).forEach((w,offset)=>{
   const i=start+offset,tr=document.createElement('tr');tr.tabIndex=0;
   const a=w.scenarios[0],b=w.scenarios[1];
   const cells=[w.market_start_month,money(a.ending_assets_yen),money(b.ending_assets_yen),money(b.delta_ending_assets_vs_baseline_yen),completionText(a),completionText(b)];
   cells.forEach((value,j)=>{const td=document.createElement('td');td.textContent=value;if(j===4||j===5)td.className=value==='充足'?'good':'bad';tr.append(td);});
   tr.addEventListener('click',()=>{selected=i;drawSelected();});
   tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=i;drawSelected();}});
   tbody.append(tr);
 });
}
$('prev-page').addEventListener('click',()=>{if(pageIndex>0){pageIndex--;selected=pageIndex*PAGE_SIZE;drawTable();drawSelected();}});
$('next-page').addEventListener('click',()=>{if(current&&pageIndex<Math.ceil(current.windows.length/PAGE_SIZE)-1){pageIndex++;selected=pageIndex*PAGE_SIZE;drawTable();drawSelected();}});
function compute(e){if(e)e.preventDefault();try{render(compareRollingLifecyclePlans(readParameters()));}
  catch(err){$('error').hidden=false;$('error').textContent='計算保留：'+err.message;
    $('status').textContent='入力条件を修正して再計算してください';$('results').classList.add('stale');}}
$('analysis-form').addEventListener('submit',compute);
$('analysis-form').addEventListener('input',()=>{if(current){$('results').classList.add('stale');$('status').textContent='条件を変更しました。再計算してください';}});
$('analysis-form').addEventListener('change',()=>{if(current){$('results').classList.add('stale');$('status').textContent='条件を変更しました。再計算してください';}});
$('reset').addEventListener('click',()=>{for(const id of ids){const e=$(id);if(e.type==='checkbox')e.checked=e.defaultChecked;
  else if(e.tagName==='SELECT'){const defaultOption=[...e.options].find(o=>o.defaultSelected);e.value=(defaultOption??e.options[0]).value;}
  else e.value=e.defaultValue;}compute();});
compute();
})();
