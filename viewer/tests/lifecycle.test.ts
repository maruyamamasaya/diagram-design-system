import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LibraryLifecycle,type LifecycleEntry,type LifecyclePort} from '../src/lib/lifecycle';
import {randomBytes,scryptSync} from 'node:crypto';
import {handle} from '../src/lib/api';
import {createSession,token} from '../src/lib/auth';
import {S3LifecyclePort} from '../src/lib/lifecycle-runtime';
import {s3} from '../src/lib/store';
process.env.VIEWER_SECRET=randomBytes(32).toString('hex');
process.env.VIEWER_PASSWORD_HASH='test:'+scryptSync('password','test',64).toString('hex');
process.env.VIEWER_OWNER='local-owner';process.env.VIEWER_ORIGIN='http://127.0.0.1:3000';process.env.VIEWER_STORAGE='mock';
const id='11111111-1111-4111-8111-111111111111';
const keys=[`library/catalog/${id}/versions/000001/upload-manifest.json`,`library/diagrams/${id}/versions/000001/document.pdf`];
function fixture(){
 const rows=new Map<string,{entry:LifecycleEntry;etag:string}>();const removed=new Set<string>();let fail=false;let files=[...keys];
 const port:LifecyclePort={
  async read(id){return structuredClone(rows.get(id)??null);},
  async list(){return [...rows.values()].map(x=>structuredClone(x.entry));},
  async compareAndSwap(id,etag,entry){assert.equal(rows.get(id)?.etag??null,etag,'CAS conflict');rows.set(id,{entry:structuredClone(entry),etag:String(entry.revision)});},
  async documents(){return {document:{id,title:'資料',type:'presentation',version:1,formats:['pdf'],pageCount:1,tags:[]},keys:files,sizeBytes:100};},
  async remove(key){if(fail&&removed.size===1)throw Error('connection lost');removed.add(key);},
  async verifyRemoved(){if(files.some(k=>!removed.has(k)))throw Error('UNPLANNED_OBJECTS_REMAIN');}
 };
 return {api:new LibraryLifecycle(port),rows,removed,fail:()=>{fail=true;},recover:()=>{fail=false;},change:()=>{files=[...files,`library/diagrams/${id}/versions/000002/document.pdf`];}};
}
test('trash and restore use revision checks without deleting artifacts',async()=>{
 const f=fixture();await assert.rejects(f.api.plan(id),/NOT_TRASHED/);
 const entry=await f.api.move(id,0,true);assert.equal(entry.revision,1);assert.equal(await f.api.blocked(id),true);
 assert.equal((await f.api.move(id,0,true)).revision,1,'ACK loss replay does not duplicate the move');
 await assert.rejects(f.api.move(id,0,false),/LIFECYCLE_CONFLICT/);
 await f.api.move(id,1,false);assert.equal(await f.api.blocked(id),false);assert.equal(f.removed.size,0);
});
test('confirmed plan cannot silently expand after a new version appears',async()=>{
 const f=fixture();await f.api.move(id,0,true);const plan=await f.api.plan(id);f.change();
 await assert.rejects(f.api.erase(id,plan.digest),/DELETE_PLAN_CHANGED/);assert.equal(f.removed.size,0);
});
test('interrupted deletion persists the plan; restart resumes; stale restore and repeat deletion are safe',async()=>{
 const f=fixture();await f.api.move(id,0,true);const plan=await f.api.plan(id);f.fail();
 await assert.rejects(f.api.erase(id,plan.digest),/connection lost/);
 assert.equal(f.rows.get(id)?.entry.status,'deleting');assert.equal(await f.api.blocked(id),true);
 await assert.rejects(f.api.move(id,2,false),/DELETE_IN_PROGRESS/);
 assert.equal((await f.api.plan(id)).digest,plan.digest);f.recover();
 const restarted=new LibraryLifecycle(f.api.port);const result=await restarted.erase(id,plan.digest);
 assert.equal(result.status,'deleted');assert.deepEqual([...f.removed].sort(),keys.sort());
 assert.equal((await restarted.erase(id,plan.digest)).revision,result.revision);
 assert.equal((await restarted.snapshot()).entries[0].plan,undefined);
 await assert.rejects(restarted.move(id,result.revision,false),/DELETE_IN_PROGRESS/);
});
test('foreign prefixes are rejected before recording or deleting any objects',async()=>{
 const f=fixture();f.api.port.documents=async()=>({document:{id,title:'資料',type:'presentation',version:1,formats:['pdf'],pageCount:1,tags:[]},keys:['library/organization/state.json'],sizeBytes:2});
 await f.api.move(id,0,true);await assert.rejects(f.api.plan(id),/INVALID_DELETE_KEYS/);assert.equal(f.removed.size,0);
 await assert.rejects(f.api.move('../private',0,true),/INVALID_ID/);
});
test('unexpected objects at final verification keep deletion pending instead of reporting completion',async()=>{
 const f=fixture();await f.api.move(id,0,true);const plan=await f.api.plan(id);
 const remove=f.api.port.remove;let changed=false;
 f.api.port.remove=async key=>{await remove(key);if(!changed){changed=true;f.change();}};
 await assert.rejects(f.api.erase(id,plan.digest),/UNPLANNED_OBJECTS_REMAIN/);
 assert.equal(f.rows.get(id)?.entry.status,'deleting');
});
test('lifecycle routes require authentication, reject unknown fields, and remain disabled by default',async()=>{
 const f=fixture(),session=createSession();const bearer=await token(session.id,session.sub);
 const req=(path:string,body?:unknown,auth=true)=>new Request('http://127.0.0.1:3000/v1/'+path,{method:body===undefined?'GET':'POST',headers:{...(auth?{Authorization:'Bearer '+bearer}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const route=['library-lifecycle',id,'trash'];
 assert.equal((await handle(req('library-lifecycle',undefined,false),'api',['library-lifecycle'],{lifecycle:f.api})).status,401);
 assert.equal((await handle(req('library-lifecycle'),'api',['library-lifecycle'])).status,404);
 assert.equal((await handle(req(route.join('/'),{revision:0,key:'arbitrary'}),'api',route,{lifecycle:f.api})).status,400);
 assert.equal((await handle(req(route.join('/'),{revision:0}),'api',route,{lifecycle:f.api})).status,200);
 const snapshot=await handle(req('library-lifecycle'),'api',['library-lifecycle'],{lifecycle:f.api});
 assert.equal((await snapshot.json()).entries[0].status,'trashed');
 assert.equal((await handle(req(route.join('/'),{revision:0}),'api',route,{lifecycle:f.api})).status,200);
});
test('S3 adapter binds CAS, encryption and deletion to reviewed prefixes and refuses versioned buckets',async()=>{
 const client=s3(),original=client.send,sent:any[]=[];let versioned=false;let conflict=false;
 (client as any).send=async(command:any)=>{
  sent.push(command);
  if(command.constructor.name==='GetBucketVersioningCommand')return versioned?{Status:'Enabled'}:{};
  if(conflict&&command.constructor.name==='PutObjectCommand')throw {$metadata:{httpStatusCode:412}};
  return {};
 };
 try{
  const f=fixture();const entry=await f.api.move(id,0,true);const port=new S3LifecyclePort();
  await port.compareAndSwap(id,null,entry);await port.compareAndSwap(id,'"expected-etag"',entry);
  const puts=sent.filter(c=>c.constructor.name==='PutObjectCommand');
  assert.equal(puts[0].input.IfNoneMatch,'*');assert.equal(puts[1].input.IfMatch,'"expected-etag"');
  assert.equal(puts[1].input.Key,`library/lifecycle/${id}.json`);assert.equal(puts[1].input.ServerSideEncryption,'AES256');
  assert.equal(puts[1].input.ExpectedBucketOwner,'676643701781');
  conflict=true;await assert.rejects(port.compareAndSwap(id,'stale',entry),/LIFECYCLE_CONFLICT/);conflict=false;
  await assert.rejects(port.remove('library/organization/state.json'),/INVALID_DELETE_KEYS/);
  versioned=true;await assert.rejects(port.remove(keys[0]),/VERSIONED_DELETE_UNSUPPORTED/);
  assert.equal(sent.filter(c=>c.constructor.name==='DeleteObjectCommand').length,0);
  versioned=false;await port.remove(keys[0]);const deletion=sent.find(c=>c.constructor.name==='DeleteObjectCommand');
  assert.equal(deletion.input.Key,keys[0]);assert.equal(deletion.input.ExpectedBucketOwner,'676643701781');
 }finally{client.send=original;}
});
