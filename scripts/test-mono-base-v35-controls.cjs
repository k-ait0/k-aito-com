"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../mono-base/cad-viewer.html"),"utf8");
const groups={mode:["solid","wire","blueprint","xray"],view:["iso","top","side","front"],projection:["perspective","ortho"],part:["fuselage","wings","tail","avionics"]};
const active={mode:"solid",view:"iso",projection:"perspective",part:"fuselage"};
for(const [kind,values] of Object.entries(groups)){
  for(const value of values){
    const tag=html.match(new RegExp('<button\\s+data-'+kind+'="'+value+'"[^>]*>'));
    assert.ok(tag,'Control missing: '+kind+':'+value);
    const state=tag[0].match(/aria-pressed="(true|false)"/);
    assert.ok(state,'Missing initial aria-pressed: '+kind+':'+value);
    assert.equal(state[1],String(value===active[kind]),'Invalid initial pressed state: '+kind+':'+value);
  }
  assert.ok(html.includes("setPressed('"+kind+"',"+({mode:"mode",view:"viewName",projection:"projection",part:"selected"}[kind])+")"),
    'Runtime selected/aria-pressed synchronization missing for '+kind);
}
assert.match(html,/if\(projection!=='perspective'\)document\.querySelector\('\[data-projection="perspective"\]'\)\.click\(\)/,
  'RESET must restore PERSPECTIVE projection and camera');
assert.match(html,/document\.querySelector\('#reset'\)\.onclick=/,'RESET handler missing');
const count=Object.values(groups).flat().length;
assert.equal((html.match(/<button\s+data-(?:mode|view|projection|part)=/g)||[]).length,count);
console.log('PASS MONO BASE v3.5: 14 accessible toggle states and reset projection contract');
