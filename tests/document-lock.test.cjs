'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {DocumentLock}=require('../src/upload/document-lock.cjs');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const id='11111111-1111-4111-8111-111111111111';
const config={schemaVersion:'1.0',bucket:'test-library',region:'ap-northeast-1',prefix:'library',expectedBucketOwner:'676643701781',encryption:'AES256',approved:true,lifecycleProtection:true};
function fakeS3(){
 const values=new Map();let serial=0,loseNext=false;const calls=[];
 const client={async send(command){
  const p=command.input;calls.push(command);const kind=command.constructor.name;
  assert.equal(p.ExpectedBucketOwner,config.expectedBucketOwner);
  if(kind==='ListObjectsV2Command')return {Contents:[...values.keys()].filter(k=>k.startsWith(p.Prefix)).sort().slice(0,p.MaxKeys??1000).map(Key=>({Key}))};
  if(kind==='GetObjectCommand'){
   const r=values.get(p.Key);if(!r)throw Object.assign(Error('missing'),{name:'NoSuchKey'});
   return {ETag:r.etag,ContentLength:r.bytes.length,ContentType:r.type,ServerSideEncryption:'AES256',Body:{transformToByteArray:async()=>r.bytes}};
  }
  if(kind==='PutObjectCommand'){
   const old=values.get(p.Key);if(p.IfNoneMatch==='*'&&old||p.IfMatch&&p.IfMatch!==old?.etag)throw {$metadata:{httpStatusCode:412}};
   assert.equal(p.ServerSideEncryption,'AES256');assert.ok(p.IfNoneMatch||p.IfMatch);
   values.set(p.Key,{bytes:Buffer.from(p.Body),etag:String(++serial),type:p.ContentType});
   if(loseNext){loseNext=false;throw Error('ACK lost');}return {};
  }
  throw Error('Unexpected command '+kind);
 }};
 return {client,values,calls,lose:()=>{loseNext=true;}};
}
test('publication and deletion share one document lock; CAS allows only one publisher',async()=>{
 const f=fakeS3(),a=new DocumentLock(f.client,config),b=new DocumentLock(f.client,config);
 const results=await Promise.allSettled([a.acquire(id,'upload','owner-a'),b.acquire(id,'upload','owner-b')]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const owner=results.find(x=>x.status==='fulfilled').value;
 await assert.rejects(b.acquire(id,'delete','a'.repeat(64)),/DOCUMENT_BUSY/);
 await assert.rejects(a.release(id,'upload','not-the-owner'),/DOCUMENT_LOCK_LOST/);
 await a.release(id,'upload',owner);
 const digest='a'.repeat(64);await b.acquire(id,'delete',digest);
 assert.equal(await b.acquire(id,'delete',digest),digest,'same confirmed deletion can resume');
 await assert.rejects(a.acquire(id,'upload'),/DOCUMENT_BUSY/);
 await b.release(id,'delete',digest);
});
test('lost acquisition acknowledgement is recovered only by its unique owner; locks never expire silently',async()=>{
 const f=fakeS3(),lock=new DocumentLock(f.client,config);f.lose();
 await lock.acquire(id,'upload','unique-owner');
 const value=JSON.parse(f.values.get(`library/document-locks/${id}.json`).bytes);
 assert.equal(value.held,true);assert.equal(value.expiresAt,undefined);
 await assert.rejects(lock.acquire(id,'upload','other-owner'),/DOCUMENT_BUSY/);
 await lock.release(id,'upload','unique-owner');
 await assert.rejects(lock.acquire('../private','upload'),/INVALID_DOCUMENT_ID/);
});
test('protected S3 writes require the publication gate; a deleted document cannot be uploaded again',async()=>{
 const f=fakeS3(),storage=new S3Storage(config,{client:f.client}),lock=new DocumentLock(f.client,config);
 const key=`library/diagrams/${id}/versions/000001/diagram.png`,data=Buffer.from('fixture');
 await assert.rejects(storage.write(key,data,'image/png'),/PUBLICATION_LOCK_REQUIRED/);
 await storage.beginPublication(id);await storage.write(key,data,'image/png');
 await assert.rejects(lock.acquire(id,'delete','d'.repeat(64)),/DOCUMENT_BUSY/);
 await storage.endPublication();
 const previous=f.values.get(key).bytes;
 f.values.set(`library/lifecycle/${id}.json`,{bytes:Buffer.from(JSON.stringify({id,status:'deleted'})),etag:'deleted',type:'application/json'});
 await assert.rejects(storage.beginPublication(id),/DOCUMENT_NOT_ACTIVE/);
 assert.deepEqual(f.values.get(key).bytes,previous);
 const value=JSON.parse(f.values.get(`library/document-locks/${id}.json`).bytes);assert.equal(value.held,false);
});
