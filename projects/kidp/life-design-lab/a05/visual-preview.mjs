/** A05 v16: manual-only visual preview, independent of scoring/snapshots. */
import { MOTIFS, RGBY, resolveVisualDisplay } from './visual-contract.mjs';

const E_LABELS = {money:'経済的余裕',time:'時間的自由'};

/**
 * V-09: reusable display-only card. The caller must supply an explicit
 * {motif,accent,eAxis,motion}; no scores, legacy types, storage or report logic.
 * The SVG is decorative: the visible figcaption includes the motif name.
 */
export function renderVisualCard(input) {
 const v=resolveVisualDisplay(input);
 const e=v.eAxis===null?'E軸：未割当':(v.eAxis==='money'?'◉ ':'⌛ ')+E_LABELS[v.eAxis];
 return '<figure class="a05-vp-visual'+(v.motion?' a05-vp-moving':'')+
  '" style="--a05-vp-color:'+v.hex+'" data-a05-visual="explicit">'+
  '<img class="a05-vp-crest" width="116" height="116" src="./crests/'+v.id+
  '.svg" alt="" aria-hidden="true">'+
  '<figcaption class="a05-vp-caption"><strong>'+v.name+'</strong><span>'+v.group+'</span>'+
  '<small>Tier1紋章：既存SVG初稿／Tier2原画：未接続・美術未承認</small>'+
  '<div class="a05-vp-footer"><b>RGBY：'+v.accent+'</b><b>'+e+
  '</b></div></figcaption></figure>';
}

/** All four controls are manual; never map a T-type or an axis score here. */
export function renderVisualPreview(input) {
 const v=resolveVisualDisplay(input);
 const selectOptions=(items,value)=>items.map(([key,label])=>
  '<option value="'+key+'"'+(key===value?' selected':'')+'>'+label+'</option>').join('');
 const motifOptions=selectOptions(MOTIFS.map(m=>[m.id,m.name]),v.id);
 const colorOptions=selectOptions(Object.keys(RGBY).map(k=>[k,k+'：'+({R:'赤',G:'緑',B:'青',Y:'黄'}[k])]),v.accent);
 const eOptions=selectOptions([['none','表示なし（中間・保留）'],['money','経済的余裕'],['time','時間的自由']],v.eAxis??'none');
 const motionOptions=selectOptions([['off','静止（推奨）'],['on','揺らぎON']],v.motion?'on':'off');

 return '<section class="a05-vp" aria-labelledby="a05-vp-heading" style="--a05-vp-color:'+v.hex+'">'+
  '<div class="a05-vp-head"><h3 id="a05-vp-heading">16の寓意・ビジュアル試作</h3>'+
  '<p>診断判定とは未連動です。以下のモチーフ・色・E軸は表示確認用に手動指定しています。</p></div>'+
  '<div class="a05-vp-grid">'+renderVisualCard(input)+
  '<div class="a05-vp-controls">'+
  '<label>モチーフ<select data-visual-setting="motif">'+motifOptions+'</select></label>'+
  '<label>枠線カラー<select data-visual-setting="accent">'+colorOptions+'</select></label>'+
  '<label>E軸補助表示<select data-visual-setting="eAxis">'+eOptions+'</select></label>'+
  '<label>枠の演出<select data-visual-setting="motion">'+motionOptions+'</select></label>'+
  '<p>現在の枠線はCSSで描画。色違いの原画は生成せず、揺らぎは装飾のみでスコアとは無関係です。</p>'+
  '</div></div></section>';
}
