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
const names=["基盤を築く人々","暮らしを育む人々","可能性を拓く人々","未来を共創する人々"];
const types=Array.from({length:16},(_,i)=>{
  const id="T"+String(i+1).padStart(2,"0");
  const source=master.rows.find(r=>r.pairId===id+"-"+id);
  if(!source)throw Error("Missing same-type "+id);
  return {id,name:source.displayNames[0],group:"G"+(Math.floor(i/4)+1),groupName:names[Math.floor(i/4)]};
});
if(master.rows.length!==136||alternate.proposals.length!==112)throw Error("Unexpected source count");
const embedded=x=>JSON.stringify(x).replace(/</g,"\\u003c");
let output=html
  .replace('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; connect-src \'self\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'; img-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">')
  .replace('<link rel="stylesheet" href="./r1-s5-preview.css">',"<style>\n"+css+"\n</style>")
  .replace('<script type="module" src="./r1-s5-preview.mjs"></script>','')
  .replace('<p class="story" id="draft-description"></p>',
    '<fieldset id="draft-variants" class="variants" hidden><legend>原案と改稿候補を比較</legend><label><input type="radio" id="option-v04" name="draft-variant" value="v04" checked> v0.4原案</label><label><input type="radio" name="draft-variant" value="v05"> v0.5改稿候補</label></fieldset><p class="small" id="source-status"></p><p class="story" id="draft-description"></p>')
  .replace('<footer>内部編集プレビュー', '<p class="small" id="offline-integrity"></p><footer>内部編集プレビュー')
  .replace('</body>',
   '<script type="application/json" id="offline-master-data">'+embedded(master)+'</script>\n'+
   '<script type="application/json" id="offline-alternates-data">'+embedded(alternate)+'</script>\n'+
   '<script type="application/json" id="offline-types-data">'+embedded(types)+'</script>\n'+
   '<script>\n'+controller+'\n</script>\n</body>')
  .replace('</style>','\n.variants{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border:1px solid #c3cfdb;border-radius:10px;padding:8px 12px;margin-bottom:12px}.variants legend{font-size:.85rem;font-weight:700;padding:0 4px}.variants label{cursor:pointer;font-size:.9rem}.variants input{accent-color:#256da7}\n</style>');
if(output.includes('src="./r1-s5-preview.mjs"')||output.includes('href="./r1-s5-preview.css"'))throw Error("Offline external reference");
writeFileSync(new URL("projects/kidp/life-design-lab/a05/r1-s5-offline.html",root),output);
console.log("Offline A05 R1 bundle built:",master.rows.length,"pairs and",alternate.proposals.length,"candidate variants");
