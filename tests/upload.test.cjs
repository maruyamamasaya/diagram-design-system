'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {PNG}=require('pngjs');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const {uploadDirectory}=require('../src/upload/workflow.cjs');
const {loadBundle,createMetadata,validateMetadata,validateConfig,jsonBytes,sha256,FILES}=require('../src/upload/metadata.cjs');
const sample=require('../examples/linux-roadmap/input.json');
const config={schemaVersion:'1.0',bucket:'test-diagram-library',region:'ap-northeast-1',expectedBucketOwner:'123456789012',prefix:'library',encryption:'AES256',approved:true};

class FakeS3 {
  constructor() {this.objects=new Map();this.calls=[];this.failPut=null;this.public=false;this.kms=false;this.wrongOwner=false;this.badGet=false;}
  async send(command) {
    const name=command.constructor.name,p=command.input;this.calls.push({name,p});
    assert.equal(p.Bucket,config.bucket);assert.equal(p.ExpectedBucketOwner,config.expectedBucketOwner);
    if(this.wrongOwner) throw Object.assign(new Error('Denied'),{name:'AccessDenied',$metadata:{httpStatusCode:403}});
    if(name==='GetBucketLocationCommand') return {LocationConstraint:'ap-northeast-1'};
    if(name==='GetPublicAccessBlockCommand') return {PublicAccessBlockConfiguration:{BlockPublicAcls:!this.public,IgnorePublicAcls:true,BlockPublicPolicy:true,RestrictPublicBuckets:true}};
    if(name==='GetBucketOwnershipControlsCommand') return {OwnershipControls:{Rules:[{ObjectOwnership:'BucketOwnerEnforced'}]}};
    if(name==='GetBucketEncryptionCommand') return {ServerSideEncryptionConfiguration:{Rules:[{ApplyServerSideEncryptionByDefault:{SSEAlgorithm:this.kms?'aws:kms':'AES256'}}]}};
    if(name==='GetBucketPolicyStatusCommand') return {PolicyStatus:{IsPublic:false}};
    if(name==='ListObjectsV2Command') return {Contents:[...this.objects.keys()].filter(key=>key.startsWith(p.Prefix)).map(Key=>({Key})),IsTruncated:false};
    if(name==='PutObjectCommand') {
      if(p.Key===this.failPut) throw Object.assign(new Error('Simulated offline'),{name:'NetworkingError'});
      assert.equal(p.IfNoneMatch,'*');assert.equal(p.ServerSideEncryption,'AES256');assert.equal(p.ACL,undefined);
      assert.equal(p.ChecksumSHA256,Buffer.from(sha256(p.Body),'hex').toString('base64'));
      if(this.objects.has(p.Key)) throw Object.assign(new Error('Already exists'),{name:'PreconditionFailed',$metadata:{httpStatusCode:412}});
      this.objects.set(p.Key,{bytes:Buffer.from(p.Body),type:p.ContentType});return {};
    }
    if(name==='GetObjectCommand') {
      const object=this.objects.get(p.Key);
      if(!object) throw Object.assign(new Error('Missing'),{name:'NoSuchKey',$metadata:{httpStatusCode:404}});
      return {ContentType:object.type,ContentLength:object.bytes.length,ServerSideEncryption:'AES256',Body:{transformToByteArray:async()=>this.badGet?Buffer.from('corrupted'):object.bytes}};
    }
    throw new Error(`Unexpected operation: ${name}`);
  }
}
async function fixture(t) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'diagram-upload-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const png=new PNG({width:1,height:1});png.data.fill(255);
  const checks=Object.fromEntries(['schema','glyphCoverage','originalTextPreserved','renderedTextBounds','textOverlaps','pngDecodeAndDimensions','opaqueMonochrome'].map(k=>[k,'合格']));checks.visualReview='未検証';
  for(const [name,bytes] of Object.entries({'diagram.svg':Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'),'diagram.png':PNG.sync.write(png),'input.json':jsonBytes(sample),'validation.json':jsonBytes({generatedAt:'2026-10-09T00:00:00.000Z',template:'roadmap',dimensions:{png:[1,1]},checks})})) await fs.writeFile(path.join(directory,name),bytes);
  await fs.writeFile(path.join(directory,'.env'),'DO_NOT_UPLOAD');
  return directory;
}
test('metadata schema covers stable identity, integrity, keys, dates and version succession',async t=>{
  const dir=await fixture(t),bundle=await loadBundle(dir),m=createMetadata(bundle,config);
  assert.equal(validateMetadata(m),m);assert.equal(m.preview.key,m.files.find(f=>f.format==='png').key);
  const next=createMetadata(bundle,config,{previous:m});assert.equal(next.diagramId,m.diagramId);assert.equal(next.version,2);assert.equal(next.createdAt,m.createdAt);
  for(const mutate of [x=>x.files[0].key='outside/file',x=>x.files[1]=x.files[0],x=>x.createdAt='invalid',x=>x.version=0,x=>x.metadataKey='library/../../x',x=>x.preview.key=x.files[0].key]) {const bad=structuredClone(m);mutate(bad);assert.throws(()=>validateMetadata(bad));}
  assert.throws(()=>validateConfig({...config,encryption:'aws:kms'}));
});
test('dry run contacts no AWS, persists stable metadata and preserves original artifacts',async t=>{
  const dir=await fixture(t),before=await fs.readFile(path.join(dir,'diagram.svg'));
  const one=await uploadDirectory(dir,{...config,approved:false},{dryRun:true});
  const two=await uploadDirectory(dir,{...config,approved:false},{dryRun:true});
  assert.deepEqual(one.metadata,two.metadata);assert.equal(two.status.state,'planned');
  assert.deepEqual(await fs.readFile(path.join(dir,'diagram.svg')),before);
  await assert.rejects(()=>uploadDirectory(dir,config),/approve-content/);
});
test('real SDK commands upload/get/commit order and idempotent retries without replacement',async t=>{
  const dir=await fixture(t),client=new FakeS3(),storage=new S3Storage(config,{client});
  const first=await uploadDirectory(dir,config,{storage,approveContent:true});
  assert.equal(first.status.state,'complete');assert.equal(client.objects.size,6);
  const puts=client.calls.filter(c=>c.name==='PutObjectCommand');assert.equal(puts.at(-1).p.Key,first.metadata.catalogKey);
  assert.ok(!puts.some(c=>c.p.Key.includes('.env')));
  const putCount=puts.length;
  await uploadDirectory(dir,config,{storage,approveContent:true});assert.equal(client.calls.filter(c=>c.name==='PutObjectCommand').length,putCount);
  await fs.writeFile(path.join(dir,'diagram.svg'),'changed');
  await assert.rejects(()=>uploadDirectory(dir,config,{storage,approveContent:true}),/Not a generated SVG|changed/);
});
test('partial failure retains local files, hides catalog and resumes verified identical objects',async t=>{
  const dir=await fixture(t),client=new FakeS3(),storage=new S3Storage(config,{client});
  const planned=await uploadDirectory(dir,config,{dryRun:true});client.failPut=planned.metadata.preview.key;
  await assert.rejects(()=>uploadDirectory(dir,config,{storage,approveContent:true}),/offline/);
  assert.equal(client.objects.size,1);assert.ok(!client.objects.has(planned.metadata.catalogKey));
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'upload-status.json'),'utf8')).state,'failed');
  for(const file of FILES) assert.ok((await fs.stat(path.join(dir,file.name))).isFile());
  client.failPut=null;assert.equal((await uploadDirectory(dir,config,{storage,approveContent:true})).status.state,'complete');
});
test('conflicting bytes, unsafe buckets and access denial never overwrite or publish',async t=>{
  const dir=await fixture(t),client=new FakeS3(),storage=new S3Storage(config,{client});
  const planned=await uploadDirectory(dir,config,{dryRun:true});client.objects.set(planned.metadata.files[0].key,{bytes:Buffer.from('existing'),type:'image/svg+xml'});
  await assert.rejects(()=>uploadDirectory(dir,config,{storage,approveContent:true}),/conflicting/);
  assert.equal(client.objects.get(planned.metadata.files[0].key).bytes.toString(),'existing');assert.ok(!client.objects.has(planned.metadata.catalogKey));
  for(const property of ['public','kms','wrongOwner']) {const unsafe=new FakeS3();unsafe[property]=true;await assert.rejects(()=>uploadDirectory(dir,config,{storage:new S3Storage(config,{client:unsafe}),approveContent:true}));assert.ok(!unsafe.calls.some(c=>c.name==='PutObjectCommand'));}
  client.objects.clear();client.badGet=true;await assert.rejects(()=>uploadDirectory(dir,config,{storage,approveContent:true}),/verification/);assert.ok(!client.objects.has(planned.metadata.catalogKey));
});
test('failed validation, missing files, upload locks and non-regular files are rejected',async t=>{
  const dir=await fixture(t);await fs.writeFile(path.join(dir,'.upload.lock'),'active');
  await assert.rejects(()=>uploadDirectory(dir,config,{dryRun:true}),/already running/);await fs.unlink(path.join(dir,'.upload.lock'));
  const report=JSON.parse(await fs.readFile(path.join(dir,'validation.json'),'utf8'));report.checks.glyphCoverage='不合格';await fs.writeFile(path.join(dir,'validation.json'),jsonBytes(report));
  await assert.rejects(()=>uploadDirectory(dir,config,{dryRun:true}),/Failed/);
  await fs.unlink(path.join(dir,'diagram.svg'));await assert.rejects(()=>uploadDirectory(dir,config,{dryRun:true}),/ENOENT/);
  await fs.mkdir(path.join(dir,'diagram.svg'));await assert.rejects(()=>uploadDirectory(dir,config,{dryRun:true}),/regular file/);
});
test('old version retention cap refuses new writes and does not delete existing data',async t=>{
  const dir=await fixture(t),client=new FakeS3(),storage=new S3Storage(config,{client});
  const {metadata}=await uploadDirectory(dir,config,{dryRun:true});
  for(const v of [2,3,4]) client.objects.set(`${config.prefix}/catalog/${metadata.diagramId}/versions/${String(v).padStart(6,'0')}/metadata.json`,{bytes:Buffer.from('{}'),type:'application/json'});
  await assert.rejects(()=>uploadDirectory(dir,config,{storage,approveContent:true}),/retention limit/);
  assert.equal(client.objects.size,3);assert.ok(!client.calls.some(c=>c.name==='PutObjectCommand'||c.name.startsWith('Delete')));
});
