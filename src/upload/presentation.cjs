'use strict';
// Separate presentation manifest: never replaces generated metadata or legacy catalog metadata.
const fs=require('node:fs/promises');
const path=require('node:path');
const Ajv=require('ajv');
const {readRegularFile,parseJson,sha256,jsonBytes,validateConfig}=require('./metadata.cjs');
const validatePackage=new Ajv({strict:true,allErrors:true}).compile(require('../../schemas/presentation-metadata.schema.json'));
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const types={svg:'image/svg+xml',png:'image/png',json:'application/json',md:'text/markdown; charset=utf-8',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const {assertUploadSize}=require('./limits.cjs');
const {validatePresentation}=require('../presentation/validate.cjs');
async function safeRead(dir,name) {
  if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)||name.split('/').some(p=>p==='..'||p==='.'||!p)) throw Error('Unsafe package path');
  let current=dir;
  for(const part of name.split('/').slice(0,-1)) {current=path.join(current,part);const s=await fs.lstat(current);if(!s.isDirectory()||s.isSymbolicLink()) throw Error('Unsafe package directory');}
  return readRegularFile(path.join(dir,name));
}
async function loadPresentation(dir,config) {
  validateConfig(config);
  const files=[],seen=new Set();
  async function add(name,expected,send=false) {
    if(seen.has(name)) throw Error('Duplicate package artifact');seen.add(name);
    const bytes=await safeRead(dir,name),hash=sha256(bytes);
    if(expected&&(expected.sha256!==hash||(expected.sizeBytes!==undefined&&expected.sizeBytes!==bytes.length))) throw Error('Package integrity mismatch: '+name);
    const contentType=types[name.split('.').at(-1)];if(!contentType) throw Error('Unsupported package format');
    if(send) files.push({name,bytes,contentType,sizeBytes:bytes.length,sha256:hash});return bytes;
  }
  const meta=parseJson(await add('metadata.json'));
  if(!validatePackage(meta)||!UUID.test(meta.presentationId)||!Number.isInteger(meta.presentationVersion)||meta.presentationVersion>999999) throw Error('Invalid presentation metadata');
  const source=parseJson(await add('source/presentation.json'));
  validatePresentation(source);
  if(source.presentationId!==meta.presentationId||source.version!==meta.presentationVersion||!source.title) throw Error('Presentation identity mismatch');
  const validation=parseJson(await add('validation.json'));
  if(validation.slides?.length!==meta.slides.length) throw Error('Slide validation count mismatch');
  for(let i=0;i<meta.slides.length;i++) {
    const slide=meta.slides[i],n=String(i+1).padStart(3,'0'),v=validation.slides[i];
    if(v.slideId!==slide.slideId||v.part!==slide.part||!['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].every(k=>v.report?.checks?.[k]==='passed')) throw Error('Required slide checks failed');
    const allowed=[`slides/${n}/slide.svg`,`slides/${n}/slide.png`,`thumbnails/${n}.png`];
    if(slide.artifacts.length!==3||!allowed.every(p=>slide.artifacts.some(a=>a.path===p))) throw Error('Unexpected slide artifact');
    for(const a of slide.artifacts) if(a.path.endsWith('/slide.png')) await add(a.path,a,true);
  }
  for(const s of meta.sources) {if(!/^source\/[A-Za-z0-9][A-Za-z0-9._-]*\.(md|json)$/.test(s.path)) throw Error('Unexpected source path');await add(s.path,s);}
  // Diagram inputs are selected by the source contract, not directory enumeration.
  for(const slide of source.slides) if(slide.slideType==='diagram') {
    const d=slide.content.diagram;
    if(!UUID.test(d.diagramId)) throw Error('Unexpected diagram identity');
    const name=`source/diagrams/${d.diagramId}.json`;
    if(!seen.has(name)) await add(name,{sha256:d.sha256});
  }
  for(const format of ['pdf','pptx']) {
    const name=format==='pdf'?'document.pdf':'presentation.pptx';
    if(meta.formats[format]!=='generated') throw Error('PDF/PPTX required for Phase 7 upload');
    const a=meta.deckArtifacts?.filter(a=>a.path===name);if(a?.length!==1) throw Error('Missing deck integrity');await add(name,a[0],true);
  }
  const storage=Object.fromEntries(['bucket','region','expectedBucketOwner','prefix','encryption'].map(k=>[k,config[k]]));
  const base=`${config.prefix}/diagrams/${meta.presentationId}/versions/${String(meta.presentationVersion).padStart(6,'0')}`;
  const manifest={schemaVersion:'presentation-s3-1.0',uploadPolicy:'pdf-pptx-png-v1',diagramId:meta.presentationId,version:meta.presentationVersion,title:source.title,storage,
    formats:['png','pdf','pptx'],files:files.map(({bytes,...f})=>({...f,key:`${base}/${f.name}`})),
    metadataKey:`${base}/upload-manifest.json`,catalogKey:`${config.prefix}/catalog/${meta.presentationId}/versions/${String(meta.presentationVersion).padStart(6,'0')}/upload-manifest.json`};
  return {files,manifest};
}
async function uploadPresentationDirectory(dir,config,{storage,dryRun=false,approveContent=false,previous=null,loadPackage=loadPresentation}={}) {
  validateConfig(config);if(previous) throw Error('Presentation version is fixed by generation; --previous-metadata unsupported');
  if(!dryRun&&(!config.approved||!approveContent)) throw Error('Approved destination and --approve-content required');
  const lock=await fs.open(path.join(dir,'.upload.lock'),'wx');let status;
  const save=async()=>{const tmp=path.join(dir,`upload-status.json.${process.pid}.tmp`);await fs.writeFile(tmp,jsonBytes(status));await fs.rename(tmp,path.join(dir,'upload-status.json'));};
  try {
    const {files,manifest}=await loadPackage(dir,config),bytes=jsonBytes(manifest),plan=path.join(dir,'s3-artifacts-manifest.json');
    const sizeFiles=[...files.map(f=>({name:manifest.files.find(x=>x.name===f.name).key,sizeBytes:f.bytes.length,sha256:sha256(f.bytes)})),...['metadataKey','catalogKey'].map(k=>({name:manifest[k],sizeBytes:bytes.length,sha256:sha256(bytes)}))];
    try {assertUploadSize(sizeFiles,config);} catch(e) {
      status={diagramId:manifest.diagramId,version:manifest.version,state:'blocked',verified:[],lastStage:'size-check',sizeCheck:e.sizeCheck};await save();throw e;
    }
    try {if(!(await readRegularFile(plan)).equals(bytes)) throw Error('Prepared upload plan changed; use a new version');}
    catch(e){if(e.code!=='ENOENT') throw e;await fs.writeFile(plan,bytes,{flag:'wx'});}
    status={diagramId:manifest.diagramId,version:manifest.version,state:dryRun?'planned':'uploading',verified:[],lastStage:'preflight'};await save();
    if(dryRun)return {metadata:manifest,status};
    if(!storage)throw Error('Storage adapter required');await storage.preflight();
    const catalog=await storage.read(manifest.catalogKey);
    if(catalog) {
      await storage.verify(manifest.catalogKey,bytes,'application/json');
      for(const f of files)status.verified.push(await storage.verify(manifest.files.find(x=>x.name===f.name).key,f.bytes,f.contentType));
      await storage.verify(manifest.metadataKey,bytes,'application/json');
    } else {
      await storage.checkCapacity(manifest,'upload-manifest.json');
      for(const f of files){status.lastStage=f.name;status.verified.push(await storage.write(manifest.files.find(x=>x.name===f.name).key,f.bytes,f.contentType));await save();}
      status.lastStage='manifest';await storage.write(manifest.metadataKey,bytes,'application/json');
      status.lastStage='catalog';await storage.write(manifest.catalogKey,bytes,'application/json');
    }
    status.state='complete';status.lastStage='complete';await save();return {metadata:manifest,status};
  }catch(e){if(status){status.state=e.name==='UploadSizeLimitError'?'blocked':'failed';status.errorCode=e.name;await save().catch(()=>{});}throw e;}
  finally{await lock.close();await fs.unlink(path.join(dir,'.upload.lock'));}
}
module.exports={loadPresentation,uploadPresentationDirectory,safeRead};
