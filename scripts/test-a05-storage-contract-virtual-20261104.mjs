/**
 * A05 deterministic IndexedDB transaction mock contract.
 * Test ACTUAL storage.mjs without physical devices or any user data:
 *   node --test scripts/test-a05-storage-contract-virtual-20261104.mjs
 * Mock guarantees are only those explicitly implemented below; this is NOT
 * a native Chromium IndexedDB, Safari or real multi-tab concurrency test.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS} from '../projects/kidp/life-design-lab/a05/questions.mjs';
import {newDraft,verifyDraft} from '../projects/kidp/life-design-lab/a05/engine.mjs';
import {
 read,readAll,readA05StoreCounts,restoreState,enableSaving,saveDraft,
 finalizeDraft,deleteAssessment,eraseA05DatabaseContents
} from '../projects/kidp/life-design-lab/a05/storage.mjs';

const deepCopy=x=>x===undefined?undefined:structuredClone(x);
class FakeDB {
 constructor(){
  this.maps=Object.fromEntries(['drafts','history','preferences','migrations','legacyBackups'].map(n=>[n,new Map()]));
 }
 transaction(names,mode){
  const db=this, snapshots=Object.fromEntries(names.map(n=>[n,new Map([...db.maps[n]].map(([k,v])=>[k,deepCopy(v)]))]));
  const tx={
   pending:0,aborted:false,completed:false,oncomplete:null,onabort:null,error:null,
   objectStore(name){
    if(!names.includes(name))throw Error('InvalidAccessError');
    const m=db.maps[name];
    const queue=fn=>{
     const req={result:undefined,onsuccess:null,onerror:null};
     tx.pending++;
     Promise.resolve().then(()=>{
      if(tx.aborted){tx.pending--;return}
      try{req.result=fn();req.onsuccess?.()}catch(err){tx.error=err;req.onerror?.();tx.abort()}
      tx.pending--;
      if(tx.pending===0&&!tx.aborted&&!tx.completed){
       tx.completed=true;
       Promise.resolve().then(()=>{if(!tx.aborted)tx.oncomplete?.()});
      }
     });
     return req;
    };
    return {
     get:id=>queue(()=>deepCopy(m.get(id))),
     getAll:()=>queue(()=>[...m.values()].map(deepCopy)),
     count:()=>queue(()=>m.size),
     add:value=>queue(()=>{if(m.has(value.id))throw Error('ConstraintError');m.set(value.id,deepCopy(value));return value.id}),
     put:value=>queue(()=>{m.set(value.id,deepCopy(value));return value.id}),
     delete:id=>queue(()=>m.delete(id)),
     clear:()=>queue(()=>m.clear())
    };
   },
   abort(){if(this.aborted)return;this.aborted=true;for(const name of names)db.maps[name]=snapshots[name];this.onabort?.();}
  };
  return tx;
 }
}

test('A05 consent, draft revision conflict, raw retention, history and erasure',async()=>{
 const db=new FakeDB();
 const hash='a'.repeat(64);
 const draft=newDraft('mock-a05-01',hash);
 for(const q of QUESTIONS)draft.answers[q.id]=4;
 assert.equal(verifyDraft(draft,hash),true);

 assert.equal(await enableSaving(db,draft,hash,false),0);
 assert.equal((await read(db,'preferences','consent')).enabled,true);
 assert.equal((await read(db,'drafts','active')).revision,0);

 const edited=deepCopy(draft);edited.answers.A01=7;edited.index=1;
 assert.equal(await saveDraft(db,edited,hash,0),1);
 assert.equal((await read(db,'drafts','active')).answers.A01,7);
 await assert.rejects(saveDraft(db,edited,hash,0),{code:'REVISION_CONFLICT'});
 assert.equal((await read(db,'drafts','active')).revision,1);
 await assert.rejects(finalizeDraft(db,'mock-a05-01',1,hash,true),{code:'NO_CONSENT'});
 assert.equal((await read(db,'drafts','active')).revision,1);

 const snapshot=await finalizeDraft(db,'mock-a05-01',1,hash,false);
 assert.equal(snapshot.id,'mock-a05-01');
 assert.equal(Object.hasOwn(snapshot,'rawAnswers'),false);
 assert.equal(await read(db,'drafts','active'),undefined);
 assert.equal((await readAll(db,'history')).length,1);

 const result=await restoreState(db,hash);
 assert.equal(result.report.verified.length,1);
 assert.equal(result.readOnly,false);
 await deleteAssessment(db,'mock-a05-01');
 assert.equal((await readAll(db,'history')).length,0);

 // A consent record already exists. Abort must roll back any new draft add.
 await assert.rejects(enableSaving(db,draft,hash,false));
 assert.equal(await read(db,'drafts','active'),undefined);
 const counts=await readA05StoreCounts(db);
 assert.equal(counts.drafts,0);
 assert.equal(counts.history,0);
 assert.equal(counts.preferences,1);

 await eraseA05DatabaseContents(db);
 const cleared=await readA05StoreCounts(db);
 assert.ok(Object.values(cleared).every(v=>v===0));
});
