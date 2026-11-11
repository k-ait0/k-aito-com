/** A05 v16: manual-only visual preview, independent of scoring/snapshots. */
import { MOTIFS, RGBY, resolveVisualDisplay } from './visual-contract.mjs';

const SYMBOLS = Object.freeze({
 'polaris':'✦','sacred-peak':'▲','harbor':'⚓','moon':'☾',
 'world-tree':'♣','ocean':'≈','rainbow':'◡','constellation':'✧',
 'pegasus':'♞','phoenix':'✺','nine-tailed-fox':'❀','cat-sith':'✦',
 'twin-dragons':'∞','crow-tengu':'◆','whale-pod':'〰','carbuncle':'◇'
});
const E_LABELS = {money:'経済的余裕',time:'時間的自由'};

/** All four controls are manual; never map a T-type or an axis score here. */
export function renderVisualPreview(input) {
 const v=resolveVisualDisplay(input);
 const selectOptions=(items,value)=>items.map(([key,label])=>
  '<option value="'+key+'"'+(key===value?' selected':'')+'>'+label+'</option>').join('');
 const motifOptions=selectOptions(MOTIFS.map(m=>[m.id,m.name]),v.id);
 const colorOptions=selectOptions(Object.keys(RGBY).map(k=>[k,k+'：'+({R:'赤',G:'緑',B:'青',Y:'黄'}[k])]),v.accent);
 const eOptions=selectOptions([['none','表示なし（中間・保留）'],['money','経済的余裕'],['time','時間的自由']],v.eAxis??'none');
 const motionOptions=selectOptions([['off','静止（推奨）'],['on','揺らぎON']],v.motion?'on':'off');
 const e=v.eAxis===null?'E軸：未割当':(v.eAxis==='money'?'◉ ':'⌛ ')+E_LABELS[v.eAxis];
 return '<section class="a05-vp" aria-labelledby="a05-vp-heading" style="--a05-vp-color:'+v.hex+'">'+
  '<div class="a05-vp-head"><h3 id="a05-vp-heading">16の寓意・ビジュアル試作</h3>'+
  '<p>診断判定とは未連動です。以下のモチーフ・色・E軸は表示確認用に手動指定しています。</p></div>'+
  '<div class="a05-vp-grid"><div class="a05-vp-visual" role="img" aria-label="'+v.name+'の未承認ビジュアルの仮表示">'+
  '<div class="a05-vp-symbol" aria-hidden="true">'+SYMBOLS[v.id]+'</div>'+
  '<strong>'+v.name+'</strong><span>'+v.group+'</span>'+
  '<small>Tier2原画は未接続・美術未承認</small>'+
  '<div class="a05-vp-footer"><b>RGBY：'+v.accent+'</b><b>'+e+'</b></div></div>'+
  '<div class="a05-vp-controls">'+
  '<label>モチーフ<select data-visual-setting="motif">'+motifOptions+'</select></label>'+
  '<label>枠線カラー<select data-visual-setting="accent">'+colorOptions+'</select></label>'+
  '<label>E軸補助表示<select data-visual-setting="eAxis">'+eOptions+'</select></label>'+
  '<label>枠の演出<select data-visual-setting="motion">'+motionOptions+'</select></label>'+
  '<p>現在の枠線はCSSで描画。色違いの原画は生成せず、揺らぎは装飾のみでスコアとは無関係です。</p>'+
  '</div></div></section>';
}
