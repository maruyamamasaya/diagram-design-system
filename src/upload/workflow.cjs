'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {assertUploadSize}=require('./limits.cjs');
const {loadBundle,validateConfig,createMetadata,verifyLocalMetadata,jsonBytes,parseJson,readRegularFile}=require('./metadata.cjs');

async function atomicJson(file,value) {
  const temporary=`${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary,jsonBytes(value),{flag:'wx'});
  try {await fs.rename(temporary,file);} finally {await fs.unlink(temporary).catch(e=>{if(e.code!=='ENOENT') throw e;});}
}
async function uploadDirectory(directory,config,{storage,dryRun=false,approveContent=false,previous=null}={}) {
  validateConfig(config);
  const packageFile=path.join(path.resolve(directory),'metadata.json');
  try {
    const metadata=parseJson(await readRegularFile(packageFile));
    if(metadata.schemaVersion==='presentation-package-1.0') return require('./presentation.cjs').uploadPresentationDirectory(path.resolve(directory),config,{storage,dryRun,approveContent,previous});
  } catch(e) {if(e.code!=='ENOENT') throw e;}
  if(!dryRun&&(!config.approved||!approveContent)) throw new Error('Both approved destination config and --approve-content are required for upload.');
  const dir=path.resolve(directory),lock=path.join(dir,'.upload.lock');
  const handle=await fs.open(lock,'wx').catch(e=>{if(e.code==='EEXIST') throw new Error('Upload already running or stale .upload.lock. Confirm no uploader is active before removing this lock.');throw e;});
  let status;
  try {
    const bundle=await loadBundle(dir), metadataFile=path.join(dir,'metadata.json');
    let metadata;
    try {metadata=parseJson(await readRegularFile(metadataFile));verifyLocalMetadata(metadata,bundle,config);if(previous&&(metadata.diagramId!==previous.diagramId||metadata.version!==previous.version+1)) throw new Error('Previous version differs from prepared metadata.');}
    catch(e) {if(e.code!=='ENOENT') throw e;metadata=createMetadata(bundle,config,{previous});await fs.writeFile(metadataFile,jsonBytes(metadata),{flag:'wx'});}
    assertUploadSize([...bundle.files,{name:'metadata.json',sizeBytes:jsonBytes(metadata).length},{name:'catalog/metadata.json',sizeBytes:jsonBytes(metadata).length}]);
    status={diagramId:metadata.diagramId,version:metadata.version,state:dryRun?'planned':'uploading',startedAt:new Date().toISOString(),verified:[],lastStage:'preflight'};
    await atomicJson(path.join(dir,'upload-status.json'),status);
    if(dryRun) return {metadata,status};
    if(!storage) throw new Error('Storage adapter required.');
    status.preflight=await storage.preflight();
    // A published catalog entry is an immutable completion marker, never changed by retry.
    status.lastStage='catalog-check';
    const catalog=await storage.read(metadata.catalogKey);
    if(catalog) {
      await storage.verify(metadata.catalogKey,jsonBytes(metadata),'application/json');
      for(const f of bundle.files) {const descriptor=metadata.files.find(v=>v.name===f.name);status.verified.push(await storage.verify(descriptor.key,f.bytes,f.contentType));}
      await storage.verify(metadata.metadataKey,jsonBytes(metadata),'application/json');
    } else {
      status.lastStage='version-capacity';await storage.checkCapacity(metadata);
      for(const f of bundle.files) {
        const descriptor=metadata.files.find(v=>v.name===f.name);status.lastStage=f.name;
        status.verified.push(await storage.write(descriptor.key,f.bytes,f.contentType));
        await atomicJson(path.join(dir,'upload-status.json'),status);
      }
      status.lastStage='metadata';await storage.write(metadata.metadataKey,jsonBytes(metadata),'application/json');
      status.lastStage='catalog-publish';await storage.write(metadata.catalogKey,jsonBytes(metadata),'application/json');
    }
    status.state='complete';status.completedAt=new Date().toISOString();status.lastStage='complete';
    await atomicJson(path.join(dir,'upload-status.json'),status);
    return {metadata,status};
  } catch(e) {
    if(status) {status.state='failed';status.failedAt=new Date().toISOString();status.errorCode=/^[A-Za-z0-9_]+$/.test(e.name)?e.name:'UploadError';await atomicJson(path.join(dir,'upload-status.json'),status).catch(()=>{});}
    throw e;
  } finally {await handle.close();await fs.unlink(lock);}
}
module.exports={uploadDirectory};
