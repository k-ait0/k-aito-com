import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sourcePath='../projects/kidp/life-design-lab/a05/';
const read=n=>readFileSync(new URL(sourcePath+n,import.meta.url),'utf8');
const original=read('reflection-d99.html'),candidate=read('reflection-d100.html');
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const sha256=s=>createHash('sha256').update(s).digest('base64');
const block=(s,name)=>{const a=s.match(new RegExp('<'+name+'>([\\s\\S]*?)</'+name+'>','g'));assert.equal(a?.length,1,name+' block');return a[0].slice(name.length+2,-name.length-3)};
const csp=candidate.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
test('D100 exact Git blob; previous D99 is intact',()=>{
 assert.equal(blob(original),'2e5dbd2de9fed346516892a5cad78310eab8f868');
 assert.equal(blob(candidate),'0ed6a91d5a0dc57a74cc45569b1b5c1969b22ccb');
});
test('D100 uses exact script and style bytes from D99',()=>{
 assert.equal(block(candidate,'script'),block(original,'script'));
 assert.equal(block(candidate,'style'),block(original,'style'));
 assert.match(candidate,/name="robots" content="noindex,nofollow"/);
});
test('D100 restrictive CSP hashes match current inline bytes',()=>{
 assert.ok(csp);
 assert.match(csp,/default-src 'none'/);
 assert.match(csp,/connect-src 'none'/);
 assert.match(csp,/object-src 'none'/);
 assert.match(csp,/form-action 'none'/);
 assert.match(csp,/base-uri 'none'/);
 assert.ok(csp.includes("style-src 'sha256-"+sha256(block(candidate,'style'))+"'"));
 assert.ok(csp.includes("script-src 'sha256-"+sha256(block(candidate,'script'))+"'"));
 assert.ok(!csp.includes('unsafe-inline'));
 assert.ok(!csp.includes('unsafe-eval'));
});
test('D100 is a no-data, no-type and print-only reflection',()=>{
 assert.doesNotMatch(candidate,/<input\b|<textarea\b|<form\b|<iframe\b/i);
 assert.doesNotMatch(candidate,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon|\bfetch\s*\(/);
 assert.match(candidate,/これは診断ではなく、考えを整理するための練習です/);
 assert.match(candidate,/科学的な妥当性は未検証/);
 assert.match(candidate,/<button id="print-worksheet" type="button">4つの問いを印刷<\/button>/);
 assert.equal((candidate.match(/class="writing-lines"/g)||[]).length,4);
});
test('D100 keeps keyboard and accessibility semantics',()=>{
 assert.match(candidate,/<a href="#main-content" class="skip-link">本文へ移動<\/a>/);
 assert.match(candidate,/<h3 id="reflection-title" tabindex="-1" aria-describedby="reflection-progress"><\/h3>/);
 assert.match(candidate,/id="case-announcement" class="sr-only" role="status" aria-live="polite"/);
 assert.match(candidate,/<noscript>/);
});
