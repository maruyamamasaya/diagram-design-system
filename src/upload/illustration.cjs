'use strict';
const {safeRead}=require('./presentation.cjs');
const {validateConfig,parseJson,sha256}=require('./metadata.cjs');
async function loadIllustration(dir,config) {
 validateConfig(config);
 const m=parseJson(await safeRead(dir,'metadata.json'));
 if(m.schemaVersion!=='illustration-package-1.0'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(m.diagramId)||!Number.isInteger(m.version)||m.version<1||m.version>999999||typeof m.title!=='string'||!m.title.length||m.title.length>2000||!['svg','hybrid','image'].includes(m.mode)||!Array.isArray(m.artifacts))throw Error('Invalid illustration metadata');
 const required=['source.md','source.json','artwork.svg','diagram.png','diagram.pdf','thumbnail.png','validation.json'];
 if(m.mode!=='image')required.push('input-artwork.svg');
 if(new Set(m.artifacts.map(a=>a.name)).size!==m.artifacts.length||required.some(n=>!m.artifacts.some(a=>a.name===n))||m.artifacts.some(a=>!required.includes(a.name)&&!/^assets\/[1-9][0-9]*\.png$/.test(a.name)))throw Error('Unexpected illustration artifact');
 const bytes={};
 for(const a of m.artifacts){const b=await safeRead(dir,a.name);if(a.sha256!==sha256(b)||a.sizeBytes!==b.length)throw Error('Illustration integrity mismatch: '+a.name);bytes[a.name]=b;}
 const job=require('../illustration/create.cjs').validateJob(parseJson(bytes['source.json']));
 if(job.diagramId!==m.diagramId||job.version!==m.version||job.title!==m.title||job.mode!==m.mode)throw Error('Illustration identity mismatch');
 const v=parseJson(bytes['validation.json']);
 if(v.schemaVersion!=='illustration-validation-1.0'||v.mode!==m.mode||v.checks?.decode!=='passed'||v.checks?.textReview!=='passed'||job.review.text!=='passed'||!v.notes.trim())throw Error('Text review required before upload');
 if(m.mode!=='image'&&(v.checks.textBounds!=='passed'||v.checks.expectedLabels!=='passed'))throw Error('Text checks failed');
 require('pngjs').PNG.sync.read(bytes['diagram.png']);if(!bytes['diagram.pdf'].subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid PDF');
 const files=['diagram.png','diagram.pdf'].map(name=>({name,bytes:bytes[name],sizeBytes:bytes[name].length,sha256:sha256(bytes[name]),contentType:name.endsWith('.png')?'image/png':'application/pdf'}));
 const base=`${config.prefix}/diagrams/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}`;
 const manifest={schemaVersion:'illustration-s3-1.0',uploadPolicy:'png-pdf-v1',diagramId:m.diagramId,version:m.version,title:m.title,storage:Object.fromEntries(['bucket','region','expectedBucketOwner','prefix','encryption'].map(k=>[k,config[k]])),formats:['png','pdf'],files:files.map(({bytes,...f})=>({...f,key:`${base}/${f.name}`})),metadataKey:base+'/upload-manifest.json',catalogKey:`${config.prefix}/catalog/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}/upload-manifest.json`};
 return {files,manifest};
}
module.exports={loadIllustration};
