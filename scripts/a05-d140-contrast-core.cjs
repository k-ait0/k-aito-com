/* A05 D-140. Research-only comparison of responses; NO psychometric scoring or type assignment. */
'use strict';
const A05Contrast = (() => {
  const VERSION = 'A05-D140-RESEARCH-0.1';
  const INPUT_VERSION = 'A05-D139-OFFLINE-0.1';
  const META = Object.freeze([
    ['B-FU04','B','relative','self','consensus'],
    ['B-IND-R1','B','importance','self',null],
    ['B-IND-R2','B','importance','consensus',null],
    ['C-FU14','C','relative','future','present'],
    ['C-FU15','C','relative','future','present'],
    ['C-IND-R1','C','importance','future',null],
    ['C-IND-R2','C','importance','present',null],
    ['E01','E','relative','money','time'],
    ['E-IND-R1','E','importance','money',null],
    ['E-IND-R2','E','importance','time',null]
  ]);
  const allowedMissing = ['unsure','not_applicable'];
  const reject = msg => { throw new Error(`入力エラー: ${msg}`); };
  function isPlainObject(v){return v!==null && typeof v==='object' && !Array.isArray(v);}
  function validate(data){
    if(!isPlainObject(data))reject('JSONの最上位はオブジェクトである必要があります');
    if(data.schema!==INPUT_VERSION || data.kind!=='research_only_unscored')reject('D-139研究用のJSONではありません');
    if(data.scoring_performed!==false || data.type_assigned!==false)reject('採点・タイプ発行済みデータを受け付けません');
    if(!['relative-first','independent-first'].includes(data.order_group))reject('回答順の値が不正です');
    if(data.total_items!==10 || !Array.isArray(data.answers) || data.answers.length!==10)reject('全10設問の原本が必要です');
    if(!Number.isInteger(data.answered) || data.answered<0 || data.answered>10)reject('回答件数が不正です');
    const ids = new Set(), normalized = Object.create(null), display = new Set();
    let count = 0;
    for(const row of data.answers){
      if(!isPlainObject(row))reject('回答形式が不正です');
      const m = META.find(x=>x[0]===row.item_id);
      if(!m || ids.has(row.item_id))reject('未登録または重複した設問IDです');
      if(row.axis!==m[1]||row.item_kind!==m[2])reject(`${row.item_id}の軸または形式が一致しません`);
      if(!Number.isInteger(row.display_index) || row.display_index<1 || row.display_index>10 || display.has(row.display_index))reject('表示順が不正です');
      display.add(row.display_index);ids.add(row.item_id);
      const valid = m[2]==='relative'?['left','right',...allowedMissing]:['1','2','3','4','5',...allowedMissing];
      if(row.response!==null && (!valid.includes(row.response) || typeof row.response!=='string'))reject(`${row.item_id}の回答選択肢が不正です`);
      const expected = row.response===null?'unanswered':allowedMissing.includes(row.response)?row.response:m[2];
      if(row.response_kind!==expected)reject(`${row.item_id}の未回答・非該当・中立の区別が不正です`);
      if(row.response!==null)count++;
      normalized[row.item_id]=row.response;
    }
    if(ids.size!==META.length || count!==data.answered)reject('回答件数・設問IDの整合がありません');
    // Explicitly do not preserve any unexpected personal fields in input JSON.
    return {order_group:data.order_group,answers:normalized,answered:count};
  }
  function inspectAxis(a,answerMap){
    const cfg = {
      B:{relative:['B-FU04'],independent:['B-IND-R1','B-IND-R2'],poles:['self','consensus']},
      C:{relative:['C-FU14','C-FU15'],independent:['C-IND-R1','C-IND-R2'],poles:['future','present']},
      E:{relative:['E01'],independent:['E-IND-R1','E-IND-R2'],poles:['money','time']}
    }[a];
    if(!cfg)reject('未知の軸');
    const raw = cfg.independent.map(id=>answerMap[id]);
    const numeric=raw.map(x=>['1','2','3','4','5'].includes(x)?Number(x):null);
    const comparable=numeric.every(Number.isInteger);
    const equal=comparable && numeric[0]===numeric[1];
    const stronger=!comparable?null:equal?'same_reported_importance':numeric[0]>numeric[1]?cfg.poles[0]:cfg.poles[1];
    const cases=cfg.relative.map(id=>{
      const x=answerMap[id];
      const chosen=x==='left'?cfg.poles[0]:x==='right'?cfg.poles[1]:null;
      return {item_id:id,response:x,selected_pole:chosen,
        contrast:chosen===null?'not_comparable':!comparable?'incomplete_importance':equal?'equal_independent_ratings':chosen===stronger?'same_descriptive_direction':'different_descriptive_direction'};
    });
    return {axis:a,independent_ids:cfg.independent,importance_raw:raw,importance_values:numeric,
      importance_comparable:comparable,reported_importance_difference:comparable?numeric[0]-numeric[1]:null,
      relative_answers:cases,
      context_shift_observed:a==='C' && cases.every(x=>x.selected_pole!==null)?cases[0].selected_pole!==cases[1].selected_pole:null,
      scored:false,type_assigned:false};
  }
  function summarize(data){
    const p=validate(data);
    const axes=['B','C','E'].map(a=>inspectAxis(a,p.answers));
    const counts={unanswered:0,unsure:0,not_applicable:0,answered:0};
    for(const m of META){const v=p.answers[m[0]];if(v===null)counts.unanswered++;else if(v==='unsure')counts.unsure++;else if(v==='not_applicable')counts.not_applicable++;else counts.answered++;}
    return {schema:VERSION,source_schema:INPUT_VERSION,kind:'descriptive_research_comparison_only',source_order_group:p.order_group,
      answer_counts:counts,axes,scoring_performed:false,type_assigned:false,
      warning:'独立重要度の差や二極との方向一致は分類の妥当性・同一尺度・人格特性を示しません。',
      privacy:'入力の追加フィールドや個人情報は出力にコピーしません。'};
  }
  function exhaustiveLoss(){
    const buckets=Object.create(null);for(let i=1;i<=5;i++)for(let j=1;j<=5;j++){const d=String(i-j);buckets[d]=(buckets[d]||0)+1;}
    return {distinct_raw_pairs:25,difference_outcomes:Object.keys(buckets).length,distinct_two_axis_raw_pairs:625,two_axis_difference_outcomes:Object.keys(buckets).length**2,
      difference_collisions:25-Object.keys(buckets).length,buckets,
      interpretation:'5件法2項目を単純な差1値へ縮約すると、異なる重視度の組み合わせが同じ値になる。これは純粋な組合せ計算で、実ユーザー分布ではない。'};
  }
  const api={VERSION,INPUT_VERSION,META,validate,summarize,exhaustiveLoss};
  return Object.freeze(api);
})();
if(typeof module!=='undefined'&&module.exports)module.exports=A05Contrast;
