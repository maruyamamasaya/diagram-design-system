#!/usr/bin/env node
'use strict';
// Read-only: authentication/security, catalog read, then optional exact sample GET verification.
const fs=require('node:fs/promises'),path=require('node:path');
const {parseArgs}=require('node:util');
const {ListObjectsV2Command}=require('@aws-sdk/client-s3');
const {S3Storage}=require('../src/upload/s3-storage.cjs');
const {parseJson,jsonBytes,sha256,validateConfig,validateMetadata}=require('../src/upload/metadata.cjs');
const {loadPresentation}=require('../src/upload/presentation.cjs');
async function main(){const {values}=parseArgs({options:{input:{type:'string'},config:{type:'string',default:'config/s3.local.json'},output:{type:'string',default:'outputs/phase76-validation/aws-read-result.json'}}});if(!values.input)throw Error('--input required');
 const root=path.resolve(__dirname,'..'),dir=path.resolve(values.input),out=path.resolve(values.output);for(const p of [dir,out])if(!p.startsWith(path.join(root,'outputs')+path.sep))throw Error('Use project outputs paths');
 const config=validateConfig(parseJson(await fs.readFile(values.config))),storage=new S3Storage(config);const report={checkedAt:new Date().toISOString(),readOnly:true,config:{bucket:config.bucket,region:config.region,profile:config.profile},sampleUploaded:false};
 try {report.preflight=await storage.preflight();const listed=await storage.client.send(new ListObjectsV2Command({...storage.params(),Prefix:config.prefix+'/catalog/',MaxKeys:10}));report.catalogKeys=(listed.Contents||[]).map(x=>x.Key);
 const legacy=report.catalogKeys.find(k=>k.endsWith('/metadata.json'));if(legacy){const remote=await storage.read(legacy),m=validateMetadata(parseJson(remote.bytes));if(m.catalogKey!==legacy||m.storage.bucket!==config.bucket)throw Error('Catalog identity mismatch');const p=m.files.find(x=>x.name==='diagram.png'),png=await storage.read(p.key);if(!png||sha256(png.bytes)!==p.sha256||png.bytes.length!==p.sizeBytes||png.encryption!=='AES256')throw Error('Existing PNG integrity mismatch');report.existingRead={catalogKey:legacy,previewKey:p.key,sha256:p.sha256};}
 const {files,manifest}=await loadPresentation(dir,config),marker=await storage.read(manifest.catalogKey);
 if(marker){report.verified=[await storage.verify(manifest.catalogKey,jsonBytes(manifest),'application/json')];for(const f of files)report.verified.push(await storage.verify(manifest.files.find(x=>x.name===f.name).key,f.bytes,f.contentType));report.verified.push(await storage.verify(manifest.metadataKey,jsonBytes(manifest),'application/json'));report.sampleUploaded=true;}
 else report.sampleState='not_uploaded';
 }catch(e){report.errorCode=e.name;throw e;}finally{storage.close();await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,jsonBytes(report));console.log(JSON.stringify({readOnly:true,authenticated:!!report.preflight,sampleUploaded:report.sampleUploaded,errorCode:report.errorCode}));}}
main().catch(e=>{console.error('Read verification failed:',e.name);process.exitCode=1;});
