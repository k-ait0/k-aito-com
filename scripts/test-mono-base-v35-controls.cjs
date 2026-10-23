"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
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

const host=fs.readFileSync(path.join(__dirname,"../mono-base/design-lab.html"),"utf8");
assert.ok(host.includes("new IntersectionObserver("),
  "Host must observe iframe intersection");
assert.ok(host.includes("notifyViewerVisibility(); // Re-send after iframe module scripts have initialized."),
  "Host must notify iframe after load");
assert.ok(host.includes("document.addEventListener('visibilitychange',notifyViewerVisibility)"),
  "Host must handle background tabs");
assert.ok(host.includes("postMessage({type:'mono-visibility',visible},location.origin)"),
  "Host must send same-origin visibility messages");
assert.ok(html.includes("event.source!==window.parent||event.origin!==location.origin"),
  "Viewer must authenticate visibility messages");
assert.ok(html.includes("const shouldRender=()=>hostVisible&&!document.hidden"),
  "Viewer must combine parent and local visibility");
assert.ok(html.includes("cancelAnimationFrame(animationRequest)"),
  "Viewer must cancel queued frames while hidden");
assert.ok(html.includes("renderStats.frames++"),
  "Viewer must expose actual paint count for regression tests");
assert.ok(!html.includes("if(!viewerVisible){requestAnimationFrame(tick);return}"),
  "No RAF spin loop while hidden");
console.log("PASS MONO BASE v3.5: same-origin iframe visibility and paint pause contract");



// Exercise the actual requestAnimationFrame lifecycle in a lightweight VM.
// This checks scheduling semantics without downloading Chromium or Three.js.
const begin=html.indexOf("let hostVisible=true,animationRequest=0;");
const end=html.lastIndexOf("\nscheduleRendering();");
assert.ok(begin>=0 && end>begin,"Render lifecycle source boundaries missing");
const lifecycle=html.slice(begin,end+"\nscheduleRendering();".length);
const queued=new Map(),listeners={message:[],visibilitychange:[]},canvasListeners={};
let id=1,paintCalls=0,restores=0;
const failures=[];
const parentRef={},origin="https://k-aito.com";
const mockWindow={
  parent:parentRef,
  addEventListener:(type,cb)=>{(listeners[type]??=[]).push(cb)},
  __monoBaseGraphicsFailure:kind=>failures.push(kind),
  __monoBaseGraphicsRecovered:()=>{restores++}
};
const mockCanvas={
  addEventListener:(type,cb)=>{(canvasListeners[type]??=[]).push(cb)}
};
const mockDocument={
  hidden:false,
  addEventListener:(type,cb)=>{(listeners[type]??=[]).push(cb)},
  querySelector:()=>({textContent:""})
};
const ctx={
  window:mockWindow,document:mockDocument,location:{origin},
  canvas:mockCanvas,resize:()=>{},
  requestAnimationFrame:cb=>{const next=id++;queued.set(next,cb);return next},
  cancelAnimationFrame:requested=>queued.delete(requested),
  displayExplode:0,targetExplode:0,
  orbit:{update:()=>{}},
  renderer:{render:()=>{paintCalls++}},
  scene:{},camera:{}
};
vm.runInNewContext(lifecycle,ctx,{timeout:1000});
const stats=mockWindow.__monoBaseRenderStats;
const dispatch=(type,event)=>{for(const cb of listeners[type]||[])cb(event)};
const message=(visible,source=parentRef,messageOrigin=origin)=>
  dispatch("message",{source,origin:messageOrigin,data:{type:"mono-visibility",visible}});
const nextFrame=()=>{
  assert.equal(queued.size,1,"Expected exactly one queued RAF callback");
  const [next,cb]=queued.entries().next().value;
  queued.delete(next);cb();
};
assert.equal(queued.size,1,"Standalone viewer must schedule its initial draw");
nextFrame();
assert.equal(paintCalls,1);
assert.equal(stats.frames,1);
assert.equal(stats.paused,false);
message(false,{}); // Different message source must not control the renderer.
assert.equal(queued.size,1);
message(false,parentRef,"https://evil.example"); // Reject other origins.
assert.equal(queued.size,1);
message(false);
assert.equal(stats.paused,true);
assert.equal(queued.size,0,"Offscreen renderer must not queue further frames");
assert.equal(paintCalls,1);
message(true);
assert.equal(stats.paused,false);
nextFrame();
assert.equal(stats.frames,2);
mockDocument.hidden=true;
dispatch("visibilitychange");
assert.equal(stats.paused,true);
assert.equal(queued.size,0,"Hidden document must stop queued RAF callbacks");
message(true);
assert.equal(stats.paused,true,"Host visibility cannot override a hidden document");
assert.equal(queued.size,0);
mockDocument.hidden=false;
dispatch("visibilitychange");
assert.equal(stats.paused,false);
nextFrame();
assert.equal(stats.frames,3);
assert.equal(paintCalls,3);
console.log("PASS MONO BASE v3.5: live RAF scheduler pauses/resumes, no hidden-frame spin, trusted messages only");

// WebGL loss must pause *all* rendering until a real restoration event.
assert.equal(queued.size,1,"Normal renderer should have a pending RAF before context loss");
let prevented=false;
for(const cb of canvasListeners.webglcontextlost||[]){
  cb({preventDefault:()=>{prevented=true}});
}
assert.ok(prevented,"WebGL lost event must preventDefault to permit recovery");
assert.equal(stats.contextLost,true);
assert.equal(stats.paused,true);
assert.equal(queued.size,0,"Context loss must cancel pending render frames");
assert.equal(failures.at(-1),"context-lost","Context-loss alert was not raised");
const lastFrame=stats.frames;
message(true);
assert.equal(queued.size,0,"Parent visibility must not restart a lost context");
for(const cb of canvasListeners.webglcontextrestored||[])cb({});
assert.equal(stats.contextLost,false);
assert.equal(stats.paused,false);
assert.equal(restores,1,"Context restoration must update accessibility/fallback UI");
nextFrame();
assert.equal(stats.frames,lastFrame+1,"WebGL did not render after context recovery");

// A fatal render exception must stop the loop and expose a reloadable fallback.
ctx.renderer.render=()=>{throw Error("simulated WebGL rendering failure")};
nextFrame();
assert.equal(stats.fatal,true);
assert.equal(stats.paused,true);
assert.equal(queued.size,0,"Renderer exception must not spin requestAnimationFrame");
assert.equal(failures.at(-1),"render-failed");
for(const cb of canvasListeners.webglcontextrestored||[])cb({});
assert.equal(queued.size,0,"A fatal render must not revive automatically");
assert.match(html,/id='viewer-retry'/,"Failure overlay needs an actionable reload button");
assert.match(html,/location\.reload\(\)/,"Reload button must reload failed viewer");
console.log("PASS MONO BASE v3.5: context loss/recovery + fatal render fallback, real VM scheduler");

assert.ok(html.includes("canvas.addEventListener('webglcontextcreationerror',fail)"),
  "WebGL context creation failure must trigger initial fallback");
assert.ok(html.includes("window.addEventListener('unhandledrejection',fail)"),
  "CDN module import failures must reach accessible fallback");
assert.ok(html.includes("overlay.setAttribute('role','alert')"),
  "Failure/recovery feedback must be announced accessibly");
assert.ok(html.includes("retry.addEventListener('click',()=>location.reload())"),
  "Recovery button must offer a real reload action");
assert.ok(html.includes("alternate.href='./design-lab.html'"),
  "Failed WebGL must still offer the original static design gallery");
assert.ok(html.includes("document.querySelectorAll('.panel button,.panel input')"),
  "Runtime graphics loss should disable broken controls, not its own retry action");


