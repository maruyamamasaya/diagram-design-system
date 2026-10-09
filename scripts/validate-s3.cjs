#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {parseArgs}=require('node:util');
const {PutObjectCommand,ListObjectsV2Command}=require('@aws-sdk/client-s3');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const {uploadDirectory}=require('../src/upload/workflow.cjs');
const {parseJson,jsonBytes,sha256,loadBundle,validateConfig,validateMetadata,verifyLocalMetadata}=require('../src/upload/metadata.cjs');
const root=path.resolve(__dirname,'..');
async function insideOutputs(value) {
  const resolved=path.resolve(value),relative=path.relative(path.join(root,'outputs'),resolved);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('Use a directory inside project outputs/.');
  for(let current=resolved;current!==root;current=path.dirname(current)) if((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symlink paths are unsupported.');
  return resolved;
}
async function main() {
  const {values}=parseArgs({options:{input:{type:'string'},config:{type:'string',default:path.join(root,'config/s3.local.json')},'exercise-upload':{type:'boolean'},'approve-content':{type:'boolean'},'probe-overwrite':{type:'boolean'}}});
  if(!values.input) throw new Error('--input is required.');
  const directory=await insideOutputs(values.input);
  const config=validateConfig(parseJson(await fs.readFile(values.config)));
  if(!config.approved) throw new Error('Approved destination is required.');
  if((values['exercise-upload']||values['probe-overwrite'])&&!values['approve-content']) throw new Error('Write exercises require --approve-content.');
  const metadata=validateMetadata(parseJson(await fs.readFile(path.join(directory,'metadata.json'))));
  const bundle=await loadBundle(directory);
  verifyLocalMetadata(metadata,bundle,config);
  const evidenceDir=path.join(root,'outputs','phase3b-validation');
  await fs.mkdir(evidenceDir,{recursive:true});
  const evidenceFile=path.join(evidenceDir,'integration-result.json');
  let report={startedAt:new Date().toISOString(),account:config.expectedBucketOwner,bucket:config.bucket,diagramId:metadata.diagramId,version:metadata.version};
  try {report={...parseJson(await fs.readFile(evidenceFile)),...report};} catch(e) {if(e.code!=='ENOENT') throw e;}
  const persist=()=>fs.writeFile(evidenceFile,jsonBytes(report));
  const storage=new S3Storage(config);
  try {
    report.preflight=await storage.preflight();await persist();
    if(values['exercise-upload']) {
      if(await storage.read(metadata.catalogKey)) throw new Error('Already published; refuse partial-failure exercise on an existing publication.');
      const originalWrite=storage.write.bind(storage);
      storage.write=async (key,...args)=>{
        if(key===metadata.preview.key) throw Object.assign(new Error('Controlled local interruption before PNG PUT'),{name:'InjectedUploadFailure'});
        return originalWrite(key,...args);
      };
      await assert.rejects(()=>uploadDirectory(directory,config,{storage,approveContent:true}),{name:'InjectedUploadFailure'});
      const status=parseJson(await fs.readFile(path.join(directory,'upload-status.json')));
      assert.equal(status.state,'failed');assert.equal(status.lastStage,'diagram.png');
      assert.equal(await storage.read(metadata.catalogKey),null);
      for(const file of bundle.files) assert.equal(sha256(await fs.readFile(path.join(directory,file.name))),sha256(file.bytes));
      const svg=metadata.files.find(f=>f.name==='diagram.svg');
      await storage.verify(svg.key,bundle.files.find(f=>f.name==='diagram.svg').bytes,svg.contentType);
      report.partialFailure={passed:true,kind:'controlled-local-interruption-before-PNG-PUT',catalogUnpublished:true,localArtifactsPreserved:true,uploadedSvgVerified:true};
      await persist();
      console.log('Controlled partial failure verified. Resume with npm run upload.');return;
    }
    report.downloads=[];
    const downloads=path.join(evidenceDir,'downloaded');await fs.mkdir(downloads,{recursive:true});
    for(const file of bundle.files) {
      const descriptor=metadata.files.find(f=>f.name===file.name);
      const verified=await storage.verify(descriptor.key,file.bytes,file.contentType);
      await fs.writeFile(path.join(downloads,file.name),(await storage.read(descriptor.key)).bytes);
      report.downloads.push({...verified,name:file.name});
    }
    for(const [name,key] of [['metadata.json',metadata.metadataKey],['catalog-metadata.json',metadata.catalogKey]]) {
      const verified=await storage.verify(key,jsonBytes(metadata),'application/json');
      await fs.writeFile(path.join(downloads,name),(await storage.read(key)).bytes);
      report.downloads.push({...verified,name});
    }
    const status=parseJson(await fs.readFile(path.join(directory,'upload-status.json')));
    assert.equal(status.state,'complete');report.retryCompleted=!!report.partialFailure?.passed;
    if(values['probe-overwrite']) {
      const descriptor=metadata.files.find(f=>f.name==='diagram.svg');
      const conflicting=Buffer.from('controlled-overwrite-probe');
      const params={...storage.params(descriptor.key),Body:conflicting,ContentType:descriptor.contentType,ServerSideEncryption:'AES256'};
      let conditionalCode;
      try {await storage.client.send(new PutObjectCommand({...params,IfNoneMatch:'*'}));throw new Error('Unexpected overwrite success.');}
      catch(e) {conditionalCode=e.$metadata?.httpStatusCode;assert.equal(conditionalCode,412);}
      let unconditionalCode;
      try {await storage.client.send(new PutObjectCommand(params));throw new Error('Unexpected unconditional overwrite success.');}
      catch(e) {unconditionalCode=e.$metadata?.httpStatusCode;assert.equal(unconditionalCode,403);}
      await storage.verify(descriptor.key,bundle.files.find(f=>f.name==='diagram.svg').bytes,descriptor.contentType);
      report.overwrite={conditionalHttp:conditionalCode,unconditionalHttp:unconditionalCode,originalSha256Preserved:true};
    }
    const anonymous=await fetch(`https://${config.bucket}.s3.${config.region}.amazonaws.com/${metadata.preview.key}`,{method:'HEAD'});
    assert.equal(anonymous.status,403);report.anonymousHttp=anonymous.status;
    await assert.rejects(()=>storage.client.send(new ListObjectsV2Command({...storage.params(),MaxKeys:1})),e=>e.$metadata?.httpStatusCode===403);
    report.unscopedListDenied=true;
    if(values['probe-overwrite']) {
      let puts=0;
      const originalSend=storage.client.send.bind(storage.client);
      storage.client.send=async command=>{if(command instanceof PutObjectCommand) puts++;return originalSend(command);};
      await uploadDirectory(directory,config,{storage,approveContent:true});
      assert.equal(puts,0);report.completedRetryPutCount=puts;
    }
    report.completedAt=new Date().toISOString();report.passed=true;await persist();
    console.log(JSON.stringify({passed:true,diagramId:metadata.diagramId,verifiedObjects:report.downloads.length,overwrite:report.overwrite,retryCompleted:report.retryCompleted,report:evidenceFile},null,2));
  } catch(e) {report.passed=false;report.errorCode=e.name;await persist();throw e;}
  finally {storage.close();}
}
main().catch(e=>{console.error(`S3 validation failed: ${e.message}`);process.exitCode=1;});
