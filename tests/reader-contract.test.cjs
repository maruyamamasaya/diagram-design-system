'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {createHash}=require('node:crypto');
const {readerContract,verifyDeployedReader}=require('../src/library/reader-contract.cjs');
test('reader fingerprint tracks the shared validator and immutable approvals',()=>{
 const expected=require('../config/library-reader-contract.json');assert.equal(expected.validatorSHA256,createHash('sha256').update(fs.readFileSync(require.resolve('../src/library/presentation-contract.cjs'))).digest('hex'));
 for(const [file,hash] of Object.entries(expected.sourceSHA256))assert.equal(hash,createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..',file))).digest('hex'));
 assert.match(readerContract().fingerprint,/^[a-f0-9]{64}$/);
 const swift=fs.readFileSync(require('node:path').join(__dirname,'../packages/LibraryOrganization/Sources/LibraryOrganization/LibraryArtifactPolicy.swift'),'utf8');
 for(const approval of require('../config/upload-size-approvals.json').approvals)for(const f of approval.files.filter(f=>f.sizeBytes>=20000000)){
  const parts=f.name.split('/');assert.ok(swift.includes(`Entry(id: "${parts[2]}", version: ${Number(parts[4])}, name: "${parts.slice(5).join('/')}", size: ${f.sizeBytes}, hash: "${f.sha256}")`),'Both clients must ship the approved artifact policy before publication');
 }
});
test('publication accepts matching deployed contract and refuses missing, changed and redirected readers',async()=>{
 const response=x=>async()=>Response.json(x);assert.deepEqual(await verifyDeployedReader({request:response(readerContract())}),readerContract());
 for(const request of [response({...readerContract(),fingerprint:'0'.repeat(64)}),response({}),async()=>new Response('',{status:404}),async()=>{throw Error('offline')}])await assert.rejects(()=>verifyDeployedReader({request}),/READER_CONTRACT_/);
});
test('real S3 publication with a mismatched live reader makes zero AWS calls',async(t)=>{
 const os=require('node:os'),path=require('node:path'),fsp=require('node:fs/promises');
 const {S3Storage}=require('../src/upload/s3-storage.cjs'),{uploadPresentationDirectory}=require('../src/upload/presentation.cjs'),{target}=require('../src/library/presentation-contract.cjs');
 const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'reader-gate-'));t.after(()=>fsp.rm(directory,{recursive:true,force:true}));
 const config={...target,approved:true};let calls=0;const storage=new S3Storage(config,{client:{send:async()=>{calls++;throw Error('Must not reach AWS')}}});
 const id='7308e268-e09c-4b1e-a691-88c978d96925',base=`library/diagrams/${id}/versions/000001`;
 const files=['slides/001/slide.png','document.pdf','presentation.pptx'].map(name=>({name,bytes:Buffer.from('test'),sizeBytes:4,sha256:createHash('sha256').update('test').digest('hex'),contentType:name.endsWith('png')?'image/png':name.endsWith('pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));
 const manifest={schemaVersion:'presentation-s3-1.0',uploadPolicy:'pdf-pptx-png-v1',diagramId:id,version:1,title:'Gate test',storage:Object.fromEntries(['bucket','region','expectedBucketOwner','prefix','encryption'].map(k=>[k,config[k]])),formats:['png','pdf','pptx'],files:files.map(({bytes,...f})=>({...f,key:base+'/'+f.name})),metadataKey:base+'/upload-manifest.json',catalogKey:`library/catalog/${id}/versions/000001/upload-manifest.json`};
 t.mock.method(globalThis,'fetch',async()=>Response.json({...readerContract(),fingerprint:'0'.repeat(64)}));
 await assert.rejects(()=>uploadPresentationDirectory(directory,config,{storage,approveContent:true,loadPackage:async()=>({files,manifest})}),/READER_CONTRACT_MISMATCH/);
 assert.equal(calls,0);const status=JSON.parse(await fsp.readFile(path.join(directory,'upload-status.json')));assert.equal(status.lastStage,'reader-contract');
});
