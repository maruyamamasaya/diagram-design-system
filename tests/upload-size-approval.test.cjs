'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {uploadSizeCheck,assertUploadSize}=require('../src/upload/limits.cjs');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const approval=require('../config/upload-size-approvals.json').approvals[0];
test('size exception matches only the approved immutable objects and destination',()=>{
 const check=uploadSizeCheck(approval.files,approval.storage);assert.equal(check.blocked,false);assert.equal(check.fileLimitBytes,30000000);assert.equal(check.totalLimitBytes,120000000);assert.ok(check.totalBytes>50000000);
 const f=approval.files.find(f=>f.sizeBytes>=20000000);assert.doesNotThrow(()=>assertUploadSize([f],approval.storage));
 for(const changed of [{...f,sha256:'0'.repeat(64)},{...f,sizeBytes:f.sizeBytes+1},{...f,name:f.name.replace('/000001/','/000002/')},{...f,name:'document.pdf'}])assert.throws(()=>assertUploadSize([changed],approval.storage),/Upload stopped/);
 assert.throws(()=>assertUploadSize([f],{...approval.storage,bucket:'other-bucket'}),/Upload stopped/);assert.throws(()=>assertUploadSize([f]),/Upload stopped/);
 assert.throws(()=>assertUploadSize([...approval.files,{name:'extra',sizeBytes:1,sha256:'0'.repeat(64)}],approval.storage),/Upload stopped/);
 assert.throws(()=>assertUploadSize([f,f],approval.storage),/Upload stopped/);
});
test('low-level writes recompute hashes and block unapproved bytes before AWS',async()=>{
 let calls=0;const config={schemaVersion:'1.0',...approval.storage,approved:true};const s=new S3Storage(config,{client:{send:async()=>{calls++;throw Error('unexpected network');}}});
 const f=approval.files.find(f=>f.sizeBytes>=20000000);
 await assert.rejects(()=>s.write(f.name,Buffer.alloc(f.sizeBytes),f.name.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation'),/Upload stopped/);assert.equal(calls,0);
});
