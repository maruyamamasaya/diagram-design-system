'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {uploadDirectory}=require('../src/upload/workflow.cjs');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const {sha256,jsonBytes}=require('../src/upload/metadata.cjs');
const config={schemaVersion:'1.0',bucket:'test-library',region:'ap-northeast-1',expectedBucketOwner:'123456789012',prefix:'library',encryption:'AES256',approved:true};
class MockS3 {
 constructor(){this.objects=new Map();this.puts=[];this.fail=null;this.public=false;}
 async send(c){const p=c.input,n=c.constructor.name;assert.equal(p.Bucket,config.bucket);assert.equal(p.ExpectedBucketOwner,config.expectedBucketOwner);
 if(n==='GetBucketLocationCommand')return {LocationConstraint:config.region};
 if(n==='GetPublicAccessBlockCommand')return {PublicAccessBlockConfiguration:{BlockPublicAcls:!this.public,IgnorePublicAcls:true,BlockPublicPolicy:true,RestrictPublicBuckets:true}};
 if(n==='GetBucketOwnershipControlsCommand')return {OwnershipControls:{Rules:[{ObjectOwnership:'BucketOwnerEnforced'}]}};
 if(n==='GetBucketEncryptionCommand')return {ServerSideEncryptionConfiguration:{Rules:[{ApplyServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}]}};
 if(n==='GetBucketPolicyStatusCommand')return {PolicyStatus:{IsPublic:false}};
 if(n==='ListObjectsV2Command')return {Contents:[...this.objects.keys()].filter(k=>k.startsWith(p.Prefix)).map(Key=>({Key})),IsTruncated:false};
 if(n==='PutObjectCommand'){assert.equal(p.IfNoneMatch,'*');assert.equal(p.ServerSideEncryption,'AES256');assert.equal(p.ChecksumSHA256,Buffer.from(sha256(p.Body),'hex').toString('base64'));this.puts.push(p.Key);if(p.Key===this.fail)throw Error('offline');if(this.objects.has(p.Key))throw Object.assign(Error('exists'),{name:'PreconditionFailed'});this.objects.set(p.Key,{bytes:Buffer.from(p.Body),type:p.ContentType});return {};}
 if(n==='GetObjectCommand'){const o=this.objects.get(p.Key);if(!o)throw Object.assign(Error('missing'),{name:'NoSuchKey'});return {Body:{transformToByteArray:async()=>o.bytes},ContentType:o.type,ContentLength:o.bytes.length,ServerSideEncryption:'AES256'};}
 throw Error('Unexpected API '+n);}
}
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'presentation-upload-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const source=structuredClone(require('../examples/linux-operations/presentation-phase7.json'));source.slides=[source.slides[0]];
 const id=source.presentationId,slide=source.slides[0],data={'source/presentation.json':jsonBytes(source),'source/input.md':Buffer.from('public example'),'slides/001/slide.svg':Buffer.from('<svg/>'),'slides/001/slide.png':Buffer.from('png'),'thumbnails/001.png':Buffer.from('png preview'),'document.pdf':Buffer.from('%PDF-example'),'presentation.pptx':Buffer.from('PK-example'),'validation.json':jsonBytes({slides:[{slideId:slide.slideId,part:1,report:{checks:Object.fromEntries(['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].map(k=>[k,'passed']))}}]})};
 const descriptor=name=>({path:name,sizeBytes:data[name].length,sha256:sha256(data[name])});
 const meta={schemaVersion:'presentation-package-1.0',presentationId:id,presentationVersion:source.version,generatedAt:'2026-10-09T00:00:00.000Z',slides:[{pageId:slide.slideId+'-part-1',slideId:slide.slideId,slideVersion:1,part:1,templateId:slide.templateId,contentHash:sha256(Buffer.from('content')),sourceReferences:[],generatedAt:'2026-10-09T00:00:00.000Z',artifacts:['slides/001/slide.svg','slides/001/slide.png','thumbnails/001.png'].map(descriptor)}],sources:[{sourceId:'input',sourceVersion:sha256(data['source/input.md']),path:'source/input.md',sha256:sha256(data['source/input.md'])}],formats:{svg:'generated',png:'generated',thumbnailPng:'generated',pdf:'generated',pptx:'generated',webSvg:'unsupported',webp:'unsupported'},font:{},codeFont:{},ruleHashes:{},dependencyHash:sha256(Buffer.from('dependencies')),status:'generated',deckArtifacts:['document.pdf','presentation.pptx'].map(descriptor)};
 data['metadata.json']=jsonBytes(meta);for(const [name,b]of Object.entries(data)){await fs.mkdir(path.dirname(path.join(dir,name)),{recursive:true});await fs.writeFile(path.join(dir,name),b);}await fs.writeFile(path.join(dir,'.env'),'DO_NOT_SEND');await fs.mkdir(path.join(dir,'review'));await fs.writeFile(path.join(dir,'review/private.txt'),'DO_NOT_SEND');return dir;}
test('presentation plan preserves generation metadata, identity and strict allowlist',async t=>{const d=await fixture(t),before=await fs.readFile(path.join(d,'metadata.json'));const a=await uploadDirectory(d,{...config,approved:false},{dryRun:true});const b=await uploadDirectory(d,config,{dryRun:true});assert.deepEqual(a.metadata,b.metadata);assert.equal(a.metadata.files.length,3);assert.ok(a.metadata.files.some(f=>f.name==='document.pdf'));assert.ok(a.metadata.files.every(f=>/\.(pdf|pptx|png)$/.test(f.name)&&!f.name.startsWith('thumbnails/')));assert.deepEqual(a.metadata.formats,['png','pdf','pptx']);assert.match(a.metadata.catalogKey,/upload-manifest.json$/);assert.deepEqual(await fs.readFile(path.join(d,'metadata.json')),before);await assert.rejects(()=>uploadDirectory(d,config),/approve-content/);});
test('presentation upload commits last, resumes partial failure and retries read-only',async t=>{const d=await fixture(t),c=new MockS3(),s=new S3Storage(config,{client:c}),p=await uploadDirectory(d,config,{dryRun:true});c.fail=p.metadata.files[2].key;await assert.rejects(()=>uploadDirectory(d,config,{storage:s,approveContent:true}),/offline/);assert.ok(!c.objects.has(p.metadata.catalogKey));c.fail=null;const r=await uploadDirectory(d,config,{storage:s,approveContent:true});assert.equal(r.status.state,'complete');assert.equal(c.puts.at(-1),p.metadata.catalogKey);const n=c.puts.length;await uploadDirectory(d,config,{storage:s,approveContent:true});assert.equal(c.puts.length,n);});
test('presentation rejects corrupt bytes, traversal, nested symlinks and failed checks before AWS',async t=>{for(const kind of ['bytes','path','symlink','check']){const d=await fixture(t);if(kind==='bytes')await fs.writeFile(path.join(d,'document.pdf'),'changed');if(kind==='path'){const m=JSON.parse(await fs.readFile(path.join(d,'metadata.json')));m.slides[0].artifacts[0].path='../secret.svg';await fs.writeFile(path.join(d,'metadata.json'),jsonBytes(m));}if(kind==='symlink'){await fs.rename(path.join(d,'slides'),path.join(d,'hidden'));await fs.symlink('hidden',path.join(d,'slides'));}if(kind==='check'){const v=JSON.parse(await fs.readFile(path.join(d,'validation.json')));v.slides[0].report.checks.overlaps='failed';await fs.writeFile(path.join(d,'validation.json'),jsonBytes(v));}await assert.rejects(()=>uploadDirectory(d,config,{dryRun:true}));}});
test('presentation conflicts and insecure buckets never publish; retention counts presentation markers',async t=>{const d=await fixture(t),p=await uploadDirectory(d,config,{dryRun:true});for(const kind of ['public','conflict','capacity']){const c=new MockS3(),s=new S3Storage(config,{client:c});if(kind==='public')c.public=true;if(kind==='conflict')c.objects.set(p.metadata.files[0].key,{bytes:Buffer.from('different'),type:'application/json'});if(kind==='capacity')for(const n of [2,3,4])c.objects.set(`library/catalog/${p.metadata.diagramId}/versions/00000${n}/upload-manifest.json`,{bytes:Buffer.from('{}'),type:'application/json'});await assert.rejects(()=>uploadDirectory(d,config,{storage:s,approveContent:true}));assert.ok(!c.objects.has(p.metadata.catalogKey));if(kind!=='conflict')assert.equal(c.puts.length,0);}});

test('inclusive decimal 20MB/50MB limits and pre-network stop',async t=>{
 const {assertUploadSize}=require('../src/upload/limits.cjs');
 assert.doesNotThrow(()=>assertUploadSize([{name:'a',sizeBytes:19_999_999}]));
 assert.throws(()=>assertUploadSize([{name:'a',sizeBytes:20_000_000}]),/Upload stopped/);
 assert.doesNotThrow(()=>assertUploadSize([19_999_999,19_999_999,9_999_999].map((sizeBytes,i)=>({name:String(i),sizeBytes}))));
 assert.throws(()=>assertUploadSize([19_000_000,19_000_000,12_000_000].map((sizeBytes,i)=>({name:String(i),sizeBytes}))),/total=50000000/);
 const d=await fixture(t),large=Buffer.alloc(20_000_000),m=JSON.parse(await fs.readFile(path.join(d,'metadata.json')));
 await fs.writeFile(path.join(d,'document.pdf'),large);Object.assign(m.deckArtifacts[0],{sizeBytes:large.length,sha256:sha256(large)});await fs.writeFile(path.join(d,'metadata.json'),jsonBytes(m));
 let called=false;const storage={preflight:async()=>{called=true;throw Error('must not connect');}};
 await assert.rejects(()=>uploadDirectory(d,config,{storage,approveContent:true}),/Upload stopped/);assert.equal(called,false);
 await assert.rejects(()=>uploadDirectory(d,config,{dryRun:true}),/Upload stopped/);
 assert.equal(JSON.parse(await fs.readFile(path.join(d,'upload-status.json'))).state,'blocked');
});

test('PDF/PPTX/PNG package remains uploadable after deliberate SVG removal',async t=>{
 const d=await fixture(t);await fs.unlink(path.join(d,'slides/001/slide.svg'));
 const r=await uploadDirectory(d,config,{dryRun:true});assert.equal(r.status.state,'planned');assert.ok(r.metadata.files.every(f=>!f.name.endsWith('.svg')));
});
