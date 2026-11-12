import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReport,renderReport,REPORT_VERSION} from '../projects/kidp/life-design-lab/a05/report.mjs';
import {GROUPS,TYPES} from '../projects/kidp/life-design-lab/a05/types.mjs';
const dir=new URL('../projects/kidp/life-design-lab/a05/',import.meta.url);
function snapshot(index,{withheld=false,raw=false,status='classified'}={}) {
 const type=TYPES[index],group=GROUPS[type.group];
 const signs=[index >= 8?1:-1,index%8>=4?1:-1,index%4>=2?1:-1,index%2?1:-1,1];
 return {result:{axes:'ABCDE'.split('').map((id,i)=>({id,n:withheld&&i===0?2:6,sum:signs[i]*12,value:signs[i]*66.7,direction:withheld&&i===0?null:signs[i],status:withheld&&i===0?'withheld':status})),typeId:withheld?null:type.id,classification:withheld?'withheld':status,wealth:'time'},presentation:withheld?null:{...type,group:group.id},versions:{question:'Q1',scoring:'S1'},...(raw?{rawAnswers:{A01:'TOP_SECRET_RAW_ANSWER',B01:3}}:{})};
}
test('all 16 types each produce exactly ten print sheets, distinct report headers, source snapshot unchanged',()=>{
 const out=[];
 for(let i=0;i<16;i++){
  const s=snapshot(i);const before=JSON.stringify(s);
  const report=buildReport(s,{sample:true}), html=renderReport(s,{sample:true});
  assert.equal(report.pages.length,10);
  assert.match(html,new RegExp('>'+s.presentation.name+'<'));
  assert.equal((html.match(/class="report-sheet"/g)||[]).length,10);
  assert.equal((html.match(/class="report-sheet-top"/g)||[]).length,10);
  assert.equal((html.match(/href="#a05-report-p\d+"/g)||[]).length,10);
  assert.equal(JSON.stringify(s),before,'no mutation');
  out.push(report.type.name);
 }
 assert.equal(new Set(out).size,16);
});
test('withheld result never asserts a type and keeps individual axis withholding',()=>{
 const x=buildReport(snapshot(0,{withheld:true}));
 const h=renderReport(snapshot(0,{withheld:true}));
 assert.equal(x.type,null);
 assert.match(h,/基本タイプの判定保留/);
 assert.match(h,/回答不足または左右の回答が相殺/);
 assert.doesNotMatch(h,/着実な開拓者/);
});
test('borderline/provisional score is explicitly qualified, never a probability',()=>{
 const h=renderReport(snapshot(10,{status:'provisional'}));
 assert.match(h,/暫定判定/);
 assert.match(h,/左右の合計差は小さめ/);
 assert.match(h,/確率や百分率ではありません/);
});
test('raw answers and identifiers excluded even when source snapshot retains them',()=>{
 const x=snapshot(10,{raw:true}); x.id='VERY_PRIVATE_HISTORY_ID';
 const h=renderReport(x);
 assert.doesNotMatch(h,/TOP_SECRET_RAW_ANSWER|VERY_PRIVATE_HISTORY_ID|rawAnswers|B01:3/);
 assert.match(h,/生回答を印刷・送信せず/);
});
test('HTML escaping prevents injection from a stored presentation label',()=>{
 const x=snapshot(0);x.presentation.name='</h2><script>alert("1")</script>';
 const h=renderReport(x);
 assert.doesNotMatch(h,/<script>/);
 assert.match(h,/&lt;script&gt;/);
});
test('invalid score structures rejected rather than creating a misleading result',()=>{
 assert.throws(()=>buildReport({result:{axes:[]}}),TypeError);
 const x=snapshot(1);x.result.axes[0].value=123456;
 assert.throws(()=>buildReport(x),TypeError);
});
test('print rules, no external resources, print/save is user-triggered',()=>{
 const css=readFileSync(new URL('report.css',dir),'utf8');
 assert.match(css,/@page\{size:A4;margin:0\}/);
 assert.match(css,/break-after:page/);
 const mjs=readFileSync(new URL('report.mjs',dir),'utf8');
 assert.doesNotMatch(mjs,/\bfetch\(|XMLHttpRequest|sendBeacon|indexedDB|localStorage|sessionStorage|URL\.createObjectURL/);
 assert.match(renderReport(snapshot(10)),/data-action="print-report"/);
 assert.match(REPORT_VERSION,/draft/);
});
