/**
 * A05 D109 -- read-only ten-page report renderer.
 * Accepts an existing result snapshot. Never re-scores, stores answers, or infers
 * psychological traits from a provisional typology. No browser or IO dependency.
 */
import { AXES } from './questions.mjs';
import { TYPES, GROUPS } from './types.mjs';

export const REPORT_VERSION = 'A05-REPORT-0.2.0-draft';
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageTitles = ['表紙・タイプ紹介','総合サマリー','環境と関係','時間と経験','豊かさの希望','価値観の組み合わせ','葛藤とトレードオフ','意思決定の整理','30日間のアクション','分析方法と注意事項'];
const statusNames = {classified:'方向明確（試験基準）',provisional:'暫定判定',withheld:'判定保留'};
const wealthNames = {money:'経済的余裕寄り',time:'時間的自由寄り',neutral:'中立・境界付近',withheld:'判定保留'};
const intro = 'この記述は今回の暫定質問への回答を整理したものです。性格・能力・職業適性・将来の行動を判定しません。';
const themes = {
 A: {minus:'慣れた生活基盤を活かす方向の選択が比較的多く見られます。',plus:'異なる生活環境を経験する方向の選択が比較的多く見られます。',ask:'暮らしの基盤を維持したい場面と、環境を変えたい場面をそれぞれ一つ挙げると？'},
 B: {minus:'自分の希望や裁量を優先する方向の選択が比較的多く見られます。',plus:'身近な人との希望の共有を重視する方向の選択が比較的多く見られます。',ask:'自分で決めたいことと、大切な人と相談したいことは何ですか？'},
 C: {minus:'将来の達成につながる選択を重視する回答が比較的多く見られます。',plus:'現在の充実を重視する回答が比較的多く見られます。',ask:'将来の目標に必要な時間と、今日の満足につながる時間をどう配分したいですか？'},
 D: {minus:'経験の種類や知識の幅を広げる選択が比較的多く見られます。',plus:'特定の経験や分野を深める選択が比較的多く見られます。',ask:'新しい領域を試すことと、一つを深めることをどのように両立しますか？'},
 E: {minus:'金銭的な選択肢を広げる方向の回答が比較的多く見られます。',plus:'自由に使える時間を広げる方向の回答が比較的多く見られます。',ask:'基本的な生活費を確保した上で、お金と自由時間の両方を増やす方法はありますか？'}
};
function axisFromSnapshot(snapshot, id) {
 const item = snapshot.result.axes.find(a => a.id === id);
 if (!item || !Number.isInteger(item.n) || item.n < 0 || item.n > 6 ||
     !['classified','provisional','withheld'].includes(item.status) ||
     ![-1,1,null].includes(item.direction) ||
     (item.value !== null && (!Number.isFinite(item.value) || item.value < -100 || item.value > 100))) {
   throw new TypeError('Invalid A05 report axis: ' + id);
 }
 return Object.freeze({ ...item });
}
function explanation(a){
 if(a.direction===null||a.status==='withheld') return '回答不足または左右の回答が相殺されたため方向を保留します。中立・葛藤などの理由は数値だけでは判断できません。';
 const base=a.direction<0?themes[a.id].minus:themes[a.id].plus;
 if(a.n<6)return base+' 一部未回答があるため暫定的な読み取りです。';
 const magnitude=Math.abs(a.value??0);
 if(a.status==='provisional'||magnitude<=100/3)return `今回の回答では「${side(a)}」寄りですが、左右の合計差は小さめです。中立回答と正負の相殺は区別できません。`;
 if(magnitude>=200/3)return base+' この質問群では方向の偏りが比較的大きく見られました。ただし生活全体で譲れない条件とは限りません。';
 return base;
}
function side(a) {
 const axis = AXES.find(x => x.id === a.id);
 if (a.direction === null) return '方向保留';
 return a.direction < 0 ? axis.negative : axis.positive;
}
function axisPanel(a, {compact = false} = {}) {
 const axis = AXES.find(x => x.id === a.id);
 const value = a.value;
 const fill = value === null ? 0 : Math.min(50, Math.abs(value) / 2);
 const from = value === null ? 50 : value < 0 ? 50 - fill : 50;
 const number = value === null ? '—' : (value > 0 ? '+' : '') + String(value);
 return `<div class="report-axis ${compact?'compact':''}">
  <div class="report-axis-heading"><strong>${esc(a.id)} · ${esc(axis.name)}</strong><span>${esc(side(a))} / ${esc(statusNames[a.status])}</span></div>
  <div class="report-track" role="img" aria-label="${esc(axis.name)}：${esc(axis.negative)}から${esc(axis.positive)}。暫定スコア${esc(number)}。${esc(statusNames[a.status])}">
   <span class="report-mid"></span><span class="report-fill" style="left:${from}%;width:${fill}%"></span>
  </div>
  <div class="report-axis-ends"><span>${esc(axis.negative)}</span><span>${esc(axis.positive)}</span></div>
  <div class="report-axis-note"><span>有効回答 ${a.n}/6問</span><span>暫定値 ${esc(number)}</span></div>
 </div>`;
}
const paragraph = (text, cls='') => `<p${cls?` class="${cls}"`:''}>${esc(text)}</p>`;
const question = text => `<div class="report-prompt"><span>考える問い</span><p>${esc(text)}</p></div>`;
const subhead = text => `<h3 class="report-subhead">${esc(text)}</h3>`;
function paired(a,b,heading) {
 const labels = (a.direction === null || b.direction === null) ? 'いずれかの軸が判定保留のため、組み合わせの読み取りは保留します。' :
   `今回の回答では「${side(a)}」と「${side(b)}」の方向が見られました。これは選択傾向の組み合わせであり、能力や人格の説明ではありません。`;
 return `<div class="report-pair">${subhead(heading)}${paragraph(labels)}<div class="report-pair-tags"><span>${esc(a.id)} ${esc(side(a))}</span><span>${esc(b.id)} ${esc(side(b))}</span></div></div>`;
}
function rankAxes(axes,ascending=true,directionRequired=false){
 return axes.filter(a=>a.n>=4&&Number.isFinite(a.value)&&(!directionRequired||a.direction!==null))
 .slice().sort((a,b)=>(ascending?1:-1)*(Math.abs(a.value)-Math.abs(b.value))||a.id.localeCompare(b.id));
}

function axisName(a){
 return `${a.id} · ${AXES.find(x=>x.id===a.id)?.name??a.id}`;
}

function renderP7(x){
 const low=rankAxes(x.axes).slice(0,2);
 const note=low.length===2?`合計スコアの絶対値が比較的小さかった軸は「${axisName(low[0])}」「${axisName(low[1])}」です。数値だけでは迷い・葛藤・無関心・両方を重視することを区別できません。`:'回答数が足りない軸もあるため、特定の解釈は保留します。';
 const qs=[
 low[0]?`「${axisName(low[0])}」は、場面が変わるとどちらを選びたくなりますか？`:'状況によって答えが変わることは何ですか？',
 low[1]?`「${axisName(low[1])}」で、左右とも大切な場面、どちらも不要な場面はありますか？`:'今は結論を決めなくてよいことはありますか？',
 '最近の選択で、選ばなかった側の利点を挙げると？'
 ];
 return `<div class="report-lead">葛藤や柔軟性を判定せず、選択条件を整理する問いです。</div>${paragraph(note)}
 ${qs.map((q,i)=>`${subhead('問い 0'+(i+1))}${question(q)}`).join('')}
 <div class="report-note"><strong>中立点の限界</strong>${paragraph('小さな合計値は中間回答・正負の相殺など複数の理由で生じます。回答数が少ない軸では結論を出しません。')}</div>`;
}

function renderP8(x){
 const high=rankAxes(x.axes,false,true).slice(0,2),low=rankAxes(x.axes)[0];
 const lead=high.length?`今回の回答で相対的に方向が表れた軸：${high.map(a=>`「${axisName(a)}（${side(a)}寄り）」`).join('、')}。優先順位や妥協不可条件そのものが分かったわけではありません。`:'方向が明瞭な軸が少ないため、具体的な場面から考えます。';
 return `<div class="report-lead">結果を判断の正解や譲歩の指示として使わず、自分の基準を探す問いとして使います。</div>
 <div class="report-note"><strong>今回の比較材料</strong>${paragraph(lead)}${paragraph(low?`「${axisName(low)}」は方向の差が小さい軸です。異なる場面で選び直したいか、自分で確かめましょう。`:'無理に優先順位を決める必要はありません。')}</div>
 ${subhead('仕事・学びを決めるとき')}${question(high[0]?`「${axisName(high[0])}」の希望は、仕事や学びの選択で実際に重要ですか？`:'今の仕事や学びで維持・変更したい条件は何ですか？')}
 ${subhead('暮らしを決めるとき')}${question(high[1]?`「${axisName(high[1])}」の希望を、費用や人間関係などの現実条件とどう両立しますか？`:'暮らしを選ぶ際の条件を挙げると？')}
 ${subhead('条件を比べるとき')}${question(low?`「${axisName(low)}」の好みが場面によって変化するか確かめると？`:'選択の前に確認したいことは何ですか？')}
 <div class="report-note"><strong>最終判断は本人</strong>${paragraph('費用、期限、リスク、健康や家族の条件は別途確認し、譲れない条件は自分で決めてください。')}</div>`;
}

function renderP9(x){
 const high=rankAxes(x.axes,false,true)[0],low=rankAxes(x.axes)[0];
 const action=x.type?.action??'大切にしたい価値観を一つ書き出す';
 const tasks=[
 ['WEEK 01','気づく',high?`「${axisName(high)}」について今の生活での満足度を自分で10点満点で評価し、理由を書く。`:'最近大切にしたいと感じた条件を一つ書く。'],
 ['WEEK 02','比べる',low?`「${axisName(low)}」について、選ばなかった側の良さを安全で無理のない範囲で考えるか、小さく試す。`:'最近の選択で別の選択肢を一つ考える。'],
 ['WEEK 03','試す',`小さな行動を一つ試す。参考候補：${action}。`],
 ['WEEK 04','振り返る','続けたいことと変えたいことを一つずつ決める。']
 ];
 return `<div class="report-lead">提案は任意です。健康、費用、人間関係への負担がある場合は試さず考えるだけでも構いません。</div>
 <div class="report-timeline">${tasks.map(([w,t,b])=>`<div class="report-week"><span>${esc(w)}</span><div>${subhead(t)}${paragraph(b)}</div></div>`).join('')}</div>
 ${question('30日後、どのような変化があれば「試してよかった」と感じますか？')}`;
}
function buildPages(x) {
 const [a,b,c,d,e] = x.axes;
 const full = x.type ? `${x.type.id}｜${x.type.name}` : '基本タイプの判定保留';
 const date = x.sample ? '架空サンプル' : '回答結果の表示';
 const statement = x.type ? x.type.summary : '基本4軸の方向が揃わなかったため、タイプを割り当てていません。';
 const pages = [];
 pages.push(`<div class="report-cover"><div class="report-cover-overline">PERSONAL VALUES · DRAFT REPORT</div>
   <div class="report-cover-symbol" aria-hidden="true">${x.type ? esc(x.type.id) : '—'}</div>
   <p class="report-cover-label">${esc(date)} / ${esc(statusNames[x.classification])}</p>
   <h2>${esc(x.type?.name ?? '価値観を整理する')}</h2><p class="report-cover-summary">${esc(statement)}</p>
   <p class="report-cover-bottom">${esc(intro)}<br>全10ページの試作レポート。回答結果を新たに保存・送信しません。</p></div>`);
 pages.push(`<div class="report-lead">5軸のうち最初の4軸を組み合わせて暫定タイプを表示し、第5軸は独立した補助情報として示します。</div>
  ${x.axes.map(v=>axisPanel(v,{compact:true})).join('')}
  <div class="report-note"><strong>今回の見取り図</strong>${paragraph(`基本タイプ：${full}。第5軸：${wealthNames[x.wealth]}。いずれも質問と分類基準の妥当性は検証中です。`)}</div>`);
 pages.push(`<div class="report-lead">生活環境と人との関係について、今回の回答の方向を別々に読み取ります。</div>
 ${subhead('A · 環境：安定 ／ 変化')}${axisPanel(a)}${paragraph(explanation(a))}${question(themes.A.ask)}
 ${subhead('B · 関係：自律 ／ つながり')}${axisPanel(b)}${paragraph(explanation(b))}${question(themes.B.ask)}`);
 pages.push(`<div class="report-lead">将来と現在、経験の幅と深さは、それぞれ両立できる価値観でもあります。</div>
 ${subhead('C · 時間：将来 ／ 現在')}${axisPanel(c)}${paragraph(explanation(c))}${question(themes.C.ask)}
 ${subhead('D · 経験：探索 ／ 深耕')}${axisPanel(d)}${paragraph(explanation(d))}${question(themes.D.ask)}`);
 pages.push(`<div class="report-lead">第5軸は基本16タイプに含めず、現在のお金と時間に関する希望を補足します。</div>
 ${axisPanel(e)}${paragraph(explanation(e))}
 <div class="report-note"><strong>注意：この軸は特に暫定的です</strong>
 ${paragraph('この軸には働き方・節約・自由時間・安心感の異なる場面が含まれます。生活上の制約に左右され、単一尺度としての妥当性は未検証です。')}
 ${paragraph('「経済的余裕寄り／時間的自由寄り」は今回の比較回答の表示であり、生活状況、経済力、健康状態などを意味しません。')}</div>
 ${question(themes.E.ask)}`);
 pages.push(`<div class="report-lead">タイプ名よりも重要なのは、複数の軸がどう組み合わさったかを自分の言葉で理解することです。</div>
 ${paired(a,b,'生活の選び方：環境 × 関係')}
 ${paired(c,d,'日々の使い方：時間 × 経験')}
 <div class="report-note"><strong>このページの読み方</strong>${paragraph('結果は回答の相対的な方向を要約したものです。4軸の回答が僅差・未回答の場合は、安易な解釈を避けます。')}</div>`);
 pages.push(renderP7(x));
 pages.push(renderP8(x));
 pages.push(renderP9(x));
 pages.push(`<div class="report-lead">このレポートは研究・開発中の表現と計算規則を使った試作物です。</div>
 ${subhead('採点・分類の扱い')}${paragraph('30問・5軸の暫定回答をもとに表示しています。各軸の数値は−100〜+100の試験的な相対値で、確率や百分率ではありません。')}
 ${paragraph('有効回答不足や、左右の回答が相殺された軸は方向を保留します。基本タイプは4軸の方向が揃った場合のみ表示し、第5軸は別枠で示します。')}
 <div class="report-method"><div>基本タイプ<strong>${esc(full)}</strong></div><div>分類状態<strong>${esc(statusNames[x.classification])}</strong></div><div>第5軸<strong>${esc(wealthNames[x.wealth])}</strong></div><div>有効回答<strong>${x.axes.reduce((sum,v)=>sum+v.n,0)} / 30問</strong></div></div>
 ${subhead('データと利用上の注意')}${paragraph('このレポートの表示・印刷処理は、既存の結果スナップショットを読み取るだけです。生回答を印刷・送信せず、レポートのための追加保存も行いません。')}
 ${paragraph('特性・適職・将来の成功を診断するものではありません。名称や分類が科学的に標準化された心理尺度であるとの主張はしていません。')}
 <p class="report-version">レポート形式：${esc(REPORT_VERSION)}<br>質問版：${esc(x.versions?.question ?? '未設定')} ／ 採点版：${esc(x.versions?.scoring ?? '未設定')}</p>`);
 return pages;
}
export function buildReport(snapshot, {sample=false}={}) {
 if (!snapshot || !snapshot.result || !Array.isArray(snapshot.result.axes) || snapshot.result.axes.length !== 5)
   throw new TypeError('Expected an A05 result snapshot');
 const result = snapshot.result;
 if (!['classified','provisional','withheld'].includes(result.classification) ||
     !['money','time','neutral','withheld'].includes(result.wealth)) throw new TypeError('Invalid result classification');
 const axes = AXES.map(axis => axisFromSnapshot(snapshot,axis.id));
 const selected = TYPES.find(t => t.id === result.typeId) ?? null;
 // A report must not attribute a type when the engine says classification is withheld.
 const type = result.classification==='withheld' ? null : selected;
 const group = type ? GROUPS[type.group] : null;
 const label = type && snapshot.presentation?.id === type.id ? snapshot.presentation : type;
 const x = {axes, classification:result.classification,wealth:result.wealth,type:type ? {...type,...{name:label.name,summary:label.summary,action:label.action}} : null,group,versions:snapshot.versions,sample};
 return Object.freeze({...x,pages:Object.freeze(buildPages(x))});
}
export function renderReport(snapshot, options={}) {
 const data=buildReport(snapshot, options);
 const color=data.group?.color ?? '#397fd0';
 const tint=data.group?.tint ?? '#eaf1f8';
 const nav=`<nav class="report-toc" aria-label="レポート目次"><strong>目次</strong><ol>${pageTitles.map((t,i)=>`<li><a href="#a05-report-p${i+1}">${String(i+1).padStart(2,'0')}　${esc(t)}</a></li>`).join('')}</ol></nav>`;
 const pages=data.pages.map((content,i)=>`<section class="report-sheet" id="a05-report-p${i+1}" aria-labelledby="a05-report-title-${i+1}">
  <div class="report-sheet-top"><span>LIFE DESIGN LAB <span class="report-separator">/</span> A05</span><span>${String(i+1).padStart(2,'0')} / 10</span></div>
  ${i ? `<div class="report-chapter">SECTION ${String(i+1).padStart(2,'0')}</div><h2 id="a05-report-title-${i+1}">${esc(pageTitles[i])}</h2>` : `<h2 id="a05-report-title-${i+1}" class="report-cover-title">あなたの人生価値観レポート</h2>`}
  <div class="report-sheet-body">${content}</div>
  <div class="report-sheet-foot"><span>開発版 · 非標準化の自己理解ワーク</span><span>${String(i+1).padStart(2,'0')} / 10</span></div>
 </section>`).join('');
 return `<div class="a05-report" style="--report-accent:${color};--report-tint:${tint}">
  <div class="report-toolbar"><div><h2>人生価値観レポート</h2><p>10ページ・開発版。本人の回答の確定的な診断ではありません。</p></div>
  <div class="report-toolbar-actions"><button type="button" class="btn" data-view="result">結果概要へ戻る</button><button type="button" class="btn primary" data-action="print-report">印刷／PDF保存</button></div></div>
  ${nav}<div class="report-pages">${pages}</div>
  <p class="report-bottom-note">印刷・PDF保存ではブラウザ標準の印刷ダイアログを使用します。保存先を選択するまでファイルは作成されません。</p>
 </div>`;
}
