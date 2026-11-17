/** A05 v37: opt-in, display-only review of unapproved Tier2 local images.
 * No scores, historical type IDs, persistence, remote uploads or production URLs.
 */
import { resolveVisualDisplay, MOTIFS } from './visual-contract.mjs';

// The selection comes solely from the workbook-backed runtime contract, never a generated poster.
export const TIER2_REVIEW_MOTIFS = Object.freeze(MOTIFS.map(m => m.id));
const E_TEXT = Object.freeze({money:'経済的余裕',time:'時間的自由'});
const OPTIONS = Object.freeze({
 motif:MOTIFS.map(m => [m.id,m.name]),
 accent:[['R','R：赤'],['G','G：緑'],['B','B：青'],['Y','Y：黄']],
 eAxis:[['none','未割当'],['money','経済的余裕'],['time','時間的自由']],
 worldTreeRatio:[['natural','原画比率（世界樹のみ）'],['portrait','共通3:4の表示枠']]
});
const asOptions=(array,selected)=>array.map(([value,text])=>
 '<option value="'+value+'"'+(selected===value?' selected':'')+'>'+text+'</option>').join('');

/** Only the data URLs supplied by a locally selected raster image may enter markup. */
export function validateTier2ReviewImageSrc(src) {
 if (src === null || src === undefined) return null;
 if (typeof src !== 'string' || src.length > 17_000_000 ||
     !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(src)) {
  throw new TypeError('Invalid local raster image data');
 }
 return src;
}

export function renderTier2Review({
 motif='world-tree', accent='R', eAxis=null, guide=true,
 worldTreeRatio='natural', imageSrc=null
}={}) {
 if (!TIER2_REVIEW_MOTIFS.includes(motif)) throw new TypeError('Motif is not in the canonical sixteen');
 if (typeof guide !== 'boolean' || !['natural','portrait'].includes(worldTreeRatio)) {
  throw new TypeError('Invalid Tier2 review setting');
 }
 const v=resolveVisualDisplay({motif,accent,eAxis,motion:false});
 const src=validateTier2ReviewImageSrc(imageSrc);
 const img=src
  ? '<img data-tier2-art class="a05-t2-art" src="'+src+'" alt="" aria-hidden="true">'
  : '<img class="a05-t2-fallback" src="./crests/'+v.id+'.svg" alt="" aria-hidden="true">';
 const stageClass=v.id==='world-tree'&&worldTreeRatio==='natural'?' a05-t2-stage--natural':'';
 const badge=src ? 'ローカル原画候補・未承認' : '未読込：Tier1紋章による代替表示';
 const thumb = v.id==='pegasus'&&src
  ? '<div class="a05-t2-thumbnails" aria-label="一覧用96px縮小比較">'+
   '<div><strong>全体表示</strong><div class="a05-t2-mini"><img src="'+src+'" alt=""></div></div>'+
   '<div><strong>寄り表示（採用未定）</strong><div class="a05-t2-mini a05-t2-mini--crop"><img src="'+src+'" alt=""></div></div>'+
   '</div><p class="a05-t2-caution">寄り表示は翼端・蹄が欠ける可能性があるため、正式な一覧画像ではありません。</p>'
  : '';
 return '<section class="a05-t2-lab" data-a05-tier2-review="opt-in" aria-labelledby="a05-t2-title" '+
  'style="--a05-t2-accent:'+v.hex+'">'+
  '<div class="a05-t2-heading"><h3 id="a05-t2-title">Tier2 原画・結果画面レビュー（開発専用）</h3>'+
  '<p>診断結果とは未連動です。画像はこのタブのメモリ内だけで表示し、履歴・レポートに保存しません。</p></div>'+
  '<div class="a05-t2-grid"><figure class="a05-t2-figure"><div class="a05-t2-stage'+stageClass+'">'+img+
  (guide?'<div class="a05-t2-guide" aria-hidden="true"></div>':'')+
  '</div><figcaption><strong>'+v.name+'</strong><span>'+v.group+'</span>'+
  '<small>'+badge+'／RGBY：'+v.accent+'／E軸：'+(v.eAxis===null?'未割当':E_TEXT[v.eAxis])+
  '</small></figcaption></figure>'+
  '<div class="a05-t2-controls">'+
  '<label>表示モチーフ<select data-tier2-setting="motif">'+asOptions(OPTIONS.motif,motif)+'</select></label>'+
  '<label>RGBY枠線（手動）<select data-tier2-setting="accent">'+asOptions(OPTIONS.accent,accent)+'</select></label>'+
  '<label>E軸補助（手動）<select data-tier2-setting="eAxis">'+asOptions(OPTIONS.eAxis,eAxis??'none')+'</select></label>'+
  (v.id==='world-tree' ? '<label>表示枠の比率<select data-tier2-setting="worldTreeRatio">'+
    asOptions(OPTIONS.worldTreeRatio,worldTreeRatio)+'</select></label>' : '')+
  '<label class="a05-t2-check"><input type="checkbox" data-tier2-setting="guide"'+
   (guide?' checked':'')+'>セーフゾーン7%を表示</label>'+
  '<label>このモチーフの画像を端末から読み込む（PNG/JPEG/WebP）'+
   '<input type="file" data-tier2-upload accept="image/png,image/jpeg,image/webp"></label>'+
  '<button type="button" class="btn" data-action="tier2-clear">この画像を画面から外す</button>'+
  '<p>候補画像は未承認です。RGBYは画像に固定せずCSS枠線で表現。画像が未選択なら既存のTier1紋章を表示します。</p>'+
  '</div></div>'+thumb+'</section>';
}
