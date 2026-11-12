'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('./a05-d140-contrast-core.cjs');
function mk(){return {schema:C.INPUT_VERSION,kind:'research_only_unscored',order_group:'relative-first',total_items:10,answered:0,scoring_performed:false,type_assigned:false,answers:C.META.map(([item_id,axis,item_kind],i)=>({axis,item_id,item_kind,display_index:i+1,response:null,response_kind:'unanswered'}))};}
function put(d,id,value){const row=d.answers.find(x=>x.item_id===id);row.response=value;row.response_kind=value===null?'unanswered':['unsure','not_applicable'].includes(value)?value:row.item_kind;d.answered=d.answers.filter(x=>x.response!==null).length;}
function change(fn){const d=mk();fn(d);return d;}
test('retain 5/5 and 1/1 separately despite same difference',()=>{const x=change(d=>{put(d,'B-IND-R1','5');put(d,'B-IND-R2','5')});const y=change(d=>{put(d,'B-IND-R1','1');put(d,'B-IND-R2','1')});const a=C.summarize(x).axes[0],b=C.summarize(y).axes[0];assert.equal(a.reported_importance_difference,0);assert.equal(b.reported_importance_difference,0);assert.notDeepEqual(a.importance_values,b.importance_values)});
test('5/4 and 2/1 distinct even with same difference',()=>{const x=change(d=>{put(d,'B-IND-R1','5');put(d,'B-IND-R2','4')});const y=change(d=>{put(d,'B-IND-R1','2');put(d,'B-IND-R2','1')});assert.equal(C.summarize(x).axes[0].reported_importance_difference,1);assert.equal(C.summarize(y).axes[0].reported_importance_difference,1)});
test('different descriptive direction is not type classification',()=>{const d=change(d=>{put(d,'B-FU04','right');put(d,'B-IND-R1','5');put(d,'B-IND-R2','2')});const r=C.summarize(d);assert.equal(r.axes[0].relative_answers[0].contrast,'different_descriptive_direction');assert.equal(r.type_assigned,false);assert.equal(r.scoring_performed,false)});
test('same reported importance does not mean same directional answer',()=>{const d=change(d=>{put(d,'B-FU04','left');put(d,'B-IND-R1','5');put(d,'B-IND-R2','5')});assert.equal(C.summarize(d).axes[0].relative_answers[0].contrast,'equal_independent_ratings')});
test('C context change observed only when both relative items answered',()=>{const d=change(d=>{put(d,'C-FU14','left');put(d,'C-FU15','right')});assert.equal(C.summarize(d).axes[1].context_shift_observed,true);put(d,'C-FU15',null);assert.equal(C.summarize(d).axes[1].context_shift_observed,null)});
test('unsure, n/a, unanswered and score 3 preserved',()=>{const d=change(d=>{put(d,'B-IND-R1','3');put(d,'B-IND-R2','unsure');put(d,'E-IND-R1','not_applicable')});const r=C.summarize(d);assert.deepEqual(r.answer_counts,{unanswered:7,unsure:1,not_applicable:1,answered:1});assert.deepEqual(r.axes[0].importance_values,[3,null])});
test('unrecognized schema blocked',()=>{const d=mk();d.schema='other';assert.throws(()=>C.validate(d),/D-139/)});
test('scored or typed imports blocked',()=>{const d=mk();d.type_assigned=true;assert.throws(()=>C.validate(d),/採点/);d.type_assigned=false;d.scoring_performed=true;assert.throws(()=>C.validate(d),/採点/)});
test('duplicate question IDs rejected',()=>{const d=mk();d.answers[1].item_id=d.answers[0].item_id;assert.throws(()=>C.validate(d),/重複/)});
test('axis metadata mismatch rejected',()=>{const d=mk();d.answers[0].axis='E';assert.throws(()=>C.validate(d),/軸/)});
test('invalid response rejected',()=>{const d=mk();put(d,'B-IND-R1','999');assert.throws(()=>C.validate(d),/選択肢/)});
test('invalid response kind rejected',()=>{const d=mk();put(d,'B-IND-R1','3');d.answers[1].response_kind='unsure';assert.throws(()=>C.validate(d),/区別/)});
test('answered count mismatch rejected',()=>{const d=mk();d.answered=1;assert.throws(()=>C.validate(d),/整合/)});
test('unrecognized numeric response rejected',()=>{const d=mk();put(d,'B-IND-R1',4);assert.throws(()=>C.validate(d),/選択肢/)});
test('unexpected private data excluded from report',()=>{const d=mk();d.secret='secret-value';d.answers[0].extra='secret-value';assert.equal(JSON.stringify(C.summarize(d)).includes('secret-value'),false)});
test('25 raw pair values collapse to 9 differences',()=>{const r=C.exhaustiveLoss();assert.equal(r.distinct_raw_pairs,25);assert.equal(r.difference_outcomes,9);assert.equal(r.distinct_two_axis_raw_pairs,625);assert.equal(r.two_axis_difference_outcomes,81);assert.equal(Object.values(r.buckets).reduce((a,b)=>a+b,0),25)});
test('null input rejected',()=>{assert.throws(()=>C.validate(null),/最上位/)});
test('axis output does not score or assign type',()=>{const r=C.summarize(mk());assert.equal(r.axes.every(x=>x.scored===false&&x.type_assigned===false),true)});
