import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const page=readFileSync(new URL('../projects/kidp/life-design-lab/a05/reflection-d101.html',import.meta.url),'utf8');
const blob=payload=>{
 const bytes=Buffer.from(payload,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
const inline=tag=>{
 const matches=[...page.matchAll(new RegExp('<'+tag+'>([\\s\\S]*?)</'+tag+'>','g'))];
 assert.equal(matches.length,1,tag+' must have one inline block');
 return matches[0][1];
};
const sha256=x=>createHash('sha256').update(x,'utf8').digest('base64');

test('release candidate is exactly the reviewed and previously QA-tested HTML',()=>{
 assert.equal(blob(page),'a20c5676e3e22a547f03141b0907e852ac2edebf');
 assert.match(page,/<html lang="ja">/);
 assert.match(page,/name="robots" content="noindex,nofollow"/);
 assert.match(page,/非診断/);
 assert.match(page,/科学的な妥当性は未検証/);
});

test('single-file HTML has no account, storage, analytics or remote dependencies',()=>{
 assert.doesNotMatch(page,/<input\b|<textarea\b|<form\b|<iframe\b|<link\b[^>]*rel="stylesheet"/i);
 assert.doesNotMatch(page,/<script[^>]+src=|https?:\/\/|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|\bfetch\s*\(/);
 assert.doesNotMatch(inline('script'),/\bscoreBCPilot\b|\btypeId\b|\bclassification\b/);
});

test('CSP hashes exactly match both inline code blocks',()=>{
 const meta=page.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
 assert.ok(meta);
 for(const [directive,value] of [['script-src',sha256(inline('script'))],['style-src',sha256(inline('style'))]]){
  assert.ok(meta.includes(directive+" 'sha256-"+value+"'"),directive);
 }
 for(const term of ["default-src 'none'","connect-src 'none'","form-action 'none'","base-uri 'none'","object-src 'none'"]){
  assert.ok(meta.includes(term),term);
 }
 assert.ok(!meta.includes('unsafe-inline'));
 assert.ok(!meta.includes('unsafe-eval'));
 new vm.Script(inline('script'));
});

test('standalone preview retains accessible controls and four static print prompts',()=>{
 assert.equal((page.match(/<option value="[0-7]">/g)||[]).length,8);
 assert.equal((page.match(/class="writing-lines"/g)||[]).length,4);
 assert.match(page,/<a href="#main-content" class="skip-link">本文へ移動<\/a>/);
 assert.match(page,/<h3 id="reflection-title" tabindex="-1"/);
 assert.match(page,/id="case-announcement" class="sr-only" role="status"/);
 assert.match(page,/@media print\{/);
 assert.match(page,/id="print-worksheet" type="button"/);
});

test('the isolated PR does not need any A05 scoring modules',()=>{
 const script=inline('script');
 assert.doesNotMatch(script,/\bimport\b|\brequire\s*\(|\blocalStorage\b|\bfetch\s*\(/);
 assert.match(script,/el\("case-announcement"\)/);
 assert.match(script,/(?:window\.print\(\))/);
 assert.match(script,/replace\(\/。\$\/,\s*""\)/);
});
