'use strict';
(function(){
  const core=window.KAitoAnalyticsPreviewCore;
  const $=id=>document.getElementById(id);
  const money=x=>Number(x).toLocaleString('ja-JP')+' 円';
  const yen=x=>Math.abs(x)>=100000000?((x/100000000).toLocaleString('ja-JP',{maximumFractionDigits:2})+' 億円'):money(x);
  const value=id=>{const text=$(id).value;if(text.trim()==='')throw Error('空欄の入力があります');const n=Number(text);if(!Number.isFinite(n))throw Error('入力は有限の数値にしてください');return n;};
  function config(){return {
    initial_yen:value('initial_yen'),monthly_contribution_yen:value('monthly_contribution_yen'),
    monthly_living_yen:value('monthly_living_yen'),horizon_years:value('horizon_years'),
    annual_return_pct:value('annual_return_pct'),annual_cpi_pct:value('annual_cpi_pct'),
    cashflow_timing:$('cashflow_timing').value,stress_profile:$('stress_profile').value
  };}
  const NS='http://www.w3.org/2000/svg';
  function svg(type,attrs,content){const e=document.createElementNS(NS,type);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(content!==undefined)e.textContent=content;return e;}
  function graph(points){
    const root=$('balance-chart');while(root.firstChild)root.removeChild(root.firstChild);
    const left=68,right=16,top=18,bottom=33,width=800,height=280;
    const vals=points.flatMap(x=>[x.fixed_yen,x.cpi_yen]);
    const max=Math.max(1,...vals)*1.05;const x=i=>left+i/(points.length-1)*(width-left-right),y=v=>height-bottom-v/max*(height-top-bottom);
    for(let q=0;q<=4;q++){
      const v=max*q/4,yy=y(v);
      root.appendChild(svg('line',{x1:left,y1:yy,x2:width-right,y2:yy,stroke:'#e5edf5','stroke-width':1}));
      root.appendChild(svg('text',{x:2,y:yy+4,fill:'#718294','font-size':12},v>=100000000?(v/100000000).toFixed(1)+'億':Math.round(v/10000)+'万'));
    }
    for(const [field,color] of [['fixed_yen','#345b91'],['cpi_yen','#0f8b8d']]){
      const values=points.map((p,i)=>x(i).toFixed(1)+','+y(p[field]).toFixed(1)).join(' ');
      root.appendChild(svg('polyline',{points:values,stroke:color,'stroke-width':3,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'}));
    }
    for(const i of [...new Set([0,Math.floor((points.length-1)/2),points.length-1])])
      root.appendChild(svg('text',{x:x(i),y:height-8,fill:'#718294','font-size':12,'text-anchor':'middle'},String(points[i].offset_year)+'年'));
    root.setAttribute('aria-label','合成データの年次資産残高。固定生活費の最終残高 '+money(points.at(-1).fixed_yen)+'、CPI連動生活費の最終残高 '+money(points.at(-1).cpi_yen));
  }
  function detail(label,value){const outer=document.createElement('div');outer.className='detail';
    outer.appendChild(document.createTextNode(label));const strong=document.createElement('strong');strong.textContent=value;outer.appendChild(strong);return outer;}
  function render(result){
    $('fixed-final').textContent=yen(result.fixed.ending_assets_yen);
    $('cpi-final').textContent=yen(result.cpi_linked.ending_assets_yen);
    $('result-state').textContent='合成データ専用｜'+result.config.horizon_years+'年・'+(result.phase==='MONTH_START'?'月初':'月末')+'決済｜実市場データは不使用';
    const d=$('details');while(d.firstChild)d.removeChild(d.firstChild);
    d.appendChild(detail('固定生活費・資金不足月数',result.fixed.shortfall_months+'か月'));
    d.appendChild(detail('CPI連動・資金不足月数',result.cpi_linked.shortfall_months+'か月'));
    d.appendChild(detail('CPI連動・初月の生活費',money(result.cpi_linked.first_living_yen)));
    d.appendChild(detail('CPI連動・最終月の生活費',money(result.cpi_linked.final_living_yen)));
    d.appendChild(detail('固定生活費・未払総額',money(result.fixed.total_unfunded_yen)));
    d.appendChild(detail('CPI連動・未払総額',money(result.cpi_linked.total_unfunded_yen)));
    $('audit-state').textContent='Core間一致：'+result.cpi_cross_engine_concordance+'｜入力・台帳監査 '+result.independent_input_audits+'/2 PASS｜実測データ認証：未実施';
    graph(result.timeline);
    document.body.setAttribute('data-preview-status','READY');
  }
  function execute(){
    $('error-msg').textContent='';
    try{const result=core.calculatePreview(config());render(result);}
    catch(e){
      document.body.setAttribute('data-preview-status','ERROR');
      $('fixed-final').textContent='—';$('cpi-final').textContent='—';
      $('result-state').textContent='入力エラー：前回の計算結果は表示していません';
      const details=$('details');while(details.firstChild)details.removeChild(details.firstChild);
      const chart=$('balance-chart');while(chart.firstChild)chart.removeChild(chart.firstChild);
      chart.setAttribute('aria-label','入力エラーのためグラフは非表示');
      $('audit-state').textContent='監査：未実施（入力エラー）';
      $('error-msg').textContent=String(e.message||e);
    }
  }
  $('scenario-form').addEventListener('submit',e=>{e.preventDefault();execute();});
  execute();
})();
