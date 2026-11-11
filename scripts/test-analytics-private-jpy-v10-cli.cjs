'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {gitBlobSha,PINNED_REGISTRY_BLOB_SHA,main}=require('./run-analytics-private-jpy-e2e-v10.cjs');
test('pinned registry Git blob SHA is a valid exact 40-character fingerprint',()=>assert.match(PINNED_REGISTRY_BLOB_SHA,/^[0-9a-f]{40}$/));
test('Git blob checksum differs from plain file SHA; hashing is deterministic',()=>{
 const file=Buffer.from('hello world\n');assert.equal(gitBlobSha(file),'3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
 assert.notEqual(gitBlobSha(file),crypto.createHash('sha1').update(file).digest('hex'));
});
test('v10 requires mandatory private absolute paths',()=>assert.throws(()=>main([]),/Usage/));
