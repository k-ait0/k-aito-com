/**
 * Deterministic offline package builder. Never connects to network.
 * node scripts/build-a05-r1-s5-offline.mjs
 * node --test scripts/test-a05-r1-s5-offline.mjs
 */
import {readFileSync,writeFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const html=read("projects/kidp/life-design-lab/a05/r1-s5-preview.html");
const css=read("projects/kidp/life-design-lab/a05/r1-s5-preview.css");
const controller=read("projects/kidp/life-design-lab/a05/r1-s5-offline-controller.js");
const master=JSON.parse(read("docs/A05_S4_ALL136_EDITORIAL_REVIEW_MASTER_V04_20261030.json"));
const alternate=JSON.parse(read("docs/A05_S4_V05_ALL112_CONTEXTUAL_ALTERNATES_20261030.json"));
const pilot=JSON.parse(read("docs/A05_S4_V06_HIGH_REPEAT8_INDIVIDUAL_REWRITE_PILOT_20261030.json"));
const names=["基盤を築く人々","暮らしを育む人々","可能性を拓く人々","未来を共創する人々"];
const types=Array.from({length:16},(_,i)=>{
  const id="T"+String(i+1).padStart(2,"0");
  const source=master.rows.find(r=>r.pairId===id+"-"+id);
  if(!source)throw Error("Missing same-type "+id);
  return {id,name:source.displayNames[0],group:"G"+(Math.floor(i/4)+1),groupName:names[Math.floor(i/4)]};
});
if(master.rows.length!==136||alternate.proposals.length!==112||pilot.rows.length!==8||pilot.publicRelease!=="NO_GO")throw Error("Unexpected source count");
const embedded=x=>JSON.stringify(x).replace(/</g,"\\u003c");
let output=html
  .replace('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; connect-src \'self\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'; img-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">')
  .replace('<link rel="stylesheet" href="./r1-s5-preview.css">',"<style>\n"+css+"\n</style>")
  .replace('<script type="module" src="./r1-s5-preview.mjs"></script>','')
  .replace('<p class="story" id="draft-description"></p>',
    '<fieldset id="draft-variants" class="variants" hidden><legend>原案と改稿候補を比較</legend><label><input type="radio" id="option-v04" name="draft-variant" value="v04" checked> v0.4原案</label><label><input type="radio" name="draft-variant" value="v05"> v0.5改稿候補</label><label id="option-v06-label" hidden><input type="radio" name="draft-variant" value="v06"> v0.6個別改稿（8組限定）</label></fieldset><p class="small" id="source-status"></p><p class="story" id="draft-description"></p><details class="review-compare" id="review-compare" hidden><summary>原案・改稿を並べて確認する（審査用）</summary><div class="review-grid" id="review-grid"><div><h3>v0.4 原案（未承認）</h3><p class="story" id="compare-v04-description"></p><ol id="compare-v04-prompts"></ol></div><div><h3>v0.5 改稿候補（未承認）</h3><p class="story" id="compare-v05-description"></p><ol id="compare-v05-prompts"></ol></div><div id="compare-v06-panel" hidden><h3>v0.6 高反復8組の改稿（未承認）</h3><p class="story" id="compare-v06-description"></p><ol id="compare-v06-prompts"></ol></div></div></details>')
  .replace('<div class="axis-scroller">','<div class="axis-scroller" role="region" tabindex="0" aria-label="4軸比較表。横にスクロールして確認できます">')
  .replace('<footer>内部編集プレビュー', '<p class="small" id="offline-integrity"></p><footer>内部編集プレビュー')
  .replace('</body>',
   '<script type="application/json" id="offline-master-data">'+embedded(master)+'</script>\n'+
   '<script type="application/json" id="offline-alternates-data">'+embedded(alternate)+'</script>\n'+
   '<script type="application/json" id="offline-types-data">'+embedded(types)+'</script>\n'+
   '<script type="application/json" id="offline-v06-data">'+embedded(pilot)+'</script>\n'+
   '<script>\n'+controller+'\n</script>\n</body>')
  .replace('</style>','\n.variants{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border:1px solid #c3cfdb;border-radius:10px;padding:8px 12px;margin-bottom:12px}.variants legend{font-size:.85rem;font-weight:700;padding:0 4px}.variants label{cursor:pointer;font-size:.9rem}.variants input{accent-color:#256da7}\n.review-compare{margin-top:18px;border:1px solid #c3cfdb;border-radius:12px;padding:12px;background:#f8fafc}.review-compare summary{font-weight:700;cursor:pointer}.review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:13px}.review-grid[data-threeway="true"]{grid-template-columns:repeat(3,minmax(0,1fr))}.review-grid>div{min-width:0;border:1px solid #d7e0e9;padding:11px;border-radius:10px;background:#fff}.review-grid h3{font-size:1rem;margin:.1em 0 .6em}.review-grid p,.review-grid li{overflow-wrap:anywhere}@media(max-width:950px){.review-grid[data-threeway="true"]{grid-template-columns:1fr}}@media(max-width:700px){.review-grid{grid-template-columns:1fr}}\n</style>');
if(output.includes('src="./r1-s5-preview.mjs"')||output.includes('href="./r1-s5-preview.css"')||!output.includes('id="offline-v06-data"')||!output.includes('id="compare-v06-panel"'))throw Error("Offline build incomplete");
writeFileSync(new URL("projects/kidp/life-design-lab/a05/r1-s5-offline.html",root),output);
console.log("Offline A05 R1 bundle built:",master.rows.length,"pairs and",alternate.proposals.length,"v0.5 candidates and",pilot.rows.length,"v0.6 candidates");
