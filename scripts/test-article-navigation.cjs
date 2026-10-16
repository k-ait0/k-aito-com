"use strict";
/* S-11 regression: article navigation must never point to unpublished notes.
 * Curated project/series links are preserved; only /notes/ targets are audited. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"content-index.js"),"utf8"),sandbox);
const notes=sandbox.window.KAitoContent.publishedNotes;
assert.ok(Array.isArray(notes)&&notes.length>0,"Missing canonical published notes");
const urls=new Set(notes.map(n=>n.url));
let links=0;
for(const note of notes){
  const file=path.join(root,note.url.slice(1),"index.html");
  assert.ok(fs.existsSync(file),"Missing published article "+note.url);
  const html=fs.readFileSync(file,"utf8");
  for(const name of ["article-related","article-next","related-band"]){
    const sections=[...html.matchAll(new RegExp('<(?:section|nav)\\b[^>]*class="[^"]*'+name+'[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:section|nav)>','g'))];
    for(const section of sections){
      for(const match of section[1].matchAll(/href="(\/notes\/[^"]+)"/g)){
        assert.ok(urls.has(match[1]),"Unpublished note link in "+note.id+" ("+name+"): "+match[1]);
        assert.notEqual(match[1],note.url,"Self-link in "+note.id+" ("+name+")");
        links++;
      }
    }
  }
}
console.log("PASS S-11 article navigation: "+notes.length+" published articles, "+links+" cross-note links valid");
