'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const Ajv=require('ajv');
const {validateInput}=require('../model.cjs');
const {PNG}=require('pngjs');
const ajv=new Ajv({allErrors:true,strict:true});
const isDateTime=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString()===s;
ajv.addFormat('date-time',isDateTime);
const configValidator=ajv.compile(require('../../schemas/s3-config.schema.json'));
const metadataValidator=ajv.compile(require('../../schemas/metadata.schema.json'));
const FILES=[
  {name:'diagram.svg',role:'source',format:'svg',contentType:'image/svg+xml'},
  {name:'diagram.png',role:'preview',format:'png',contentType:'image/png'},
  {name:'input.json',role:'input',format:'json',contentType:'application/json'},
  {name:'validation.json',role:'validation',format:'json',contentType:'application/json'}
];
const MAX_FILE_BYTES=64*1024*1024;
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
function validateConfig(config) {
  if(!configValidator(config)) throw new Error(`Invalid S3 config: ${JSON.stringify(configValidator.errors)}`);
  return config;
}
function validateMetadata(metadata) {
  if(!metadataValidator(metadata)) throw new Error(`Invalid metadata: ${JSON.stringify(metadataValidator.errors)}`);
  if(metadata.createdAt>metadata.updatedAt) throw new Error('createdAt must not be later than updatedAt.');
  const version=String(metadata.version).padStart(6,'0'), base=`${metadata.storage.prefix}/diagrams/${metadata.diagramId}/versions/${version}`;
  if(metadata.metadataKey!==`${base}/metadata.json`||metadata.catalogKey!==`${metadata.storage.prefix}/catalog/${metadata.diagramId}/versions/${version}/metadata.json`) throw new Error('Metadata keys do not match diagram identity.');
  for(const spec of FILES) {
    const entries=metadata.files.filter(f=>f.name===spec.name);
    if(entries.length!==1||entries[0].key!==`${base}/${spec.name}`||entries[0].role!==spec.role||entries[0].contentType!==spec.contentType||entries[0].format!==spec.format) throw new Error('Invalid file identity or key.');
  }
  if(metadata.preview.key!==`${base}/diagram.png`||metadata.validation.key!==`${base}/validation.json`) throw new Error('Invalid preview or validation key.');
  return metadata;
}
async function readRegularFile(file) {
  const stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()) throw new Error(`Expected regular file: ${path.basename(file)}`);
  if(stat.size>MAX_FILE_BYTES) throw new Error(`File exceeds 64 MiB: ${path.basename(file)}`);
  const bytes=await fs.readFile(file);
  if(bytes.length>MAX_FILE_BYTES) throw new Error('File grew beyond the size limit.');
  return bytes;
}
function parseJson(bytes) {return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));}
async function loadBundle(directory) {
  const files=[];
  for(const spec of FILES) {const bytes=await readRegularFile(path.join(directory,spec.name));files.push({...spec,bytes,sizeBytes:bytes.length,sha256:sha256(bytes)});}
  const input=validateInput(parseJson(files.find(f=>f.name==='input.json').bytes));
  const validation=parseJson(files.find(f=>f.name==='validation.json').bytes);
  if(validation.template!==input.type||!validation.checks||!Object.keys(validation.checks).length) throw new Error('Validation report does not match input.');
  if(Object.values(validation.checks).some(s=>!['合格','不合格','未検証','対象外'].includes(s)||s==='不合格')) throw new Error('Failed or invalid validation checks block upload.');
  if(!['schema','glyphCoverage','originalTextPreserved','renderedTextBounds','textOverlaps','pngDecodeAndDimensions','opaqueMonochrome'].every(k=>validation.checks[k]==='合格')) throw new Error('Required Phase 2 automated checks must pass before upload.');
  const png=PNG.sync.read(files.find(f=>f.name==='diagram.png').bytes);
  if(!validation.dimensions||png.width!==validation.dimensions.png?.[0]||png.height!==validation.dimensions.png?.[1]) throw new Error('PNG dimensions do not match validation.');
  const svg=files.find(f=>f.name==='diagram.svg').bytes.toString('utf8');
  if(!svg.includes('<svg')||!svg.includes('http://www.w3.org/2000/svg')) throw new Error('Not a generated SVG.');
  if(!isDateTime(validation.generatedAt)) throw new Error('Validation generatedAt must be canonical UTC date-time.');
  return {files,input,validation};
}
function createMetadata(bundle,config,{previous=null,now=new Date().toISOString()}={}) {
  validateConfig(config);
  if(previous) validateMetadata(previous);
  const {bucket,region,expectedBucketOwner,prefix,encryption}=config;
  const storage={bucket,region,expectedBucketOwner,prefix,encryption};
  if(previous&&JSON.stringify(previous.storage)!==JSON.stringify(storage)) throw new Error('Previous version belongs to a different storage destination.');
  const diagramId=previous?.diagramId||crypto.randomUUID(), version=previous?previous.version+1:1;
  const base=`${prefix}/diagrams/${diagramId}/versions/${String(version).padStart(6,'0')}`;
  const metadata={schemaVersion:'1.0',diagramId,title:bundle.input.title,diagramType:bundle.input.type,
    createdAt:previous?.createdAt||bundle.validation.generatedAt,updatedAt:now,version,outputFormats:['svg','png'],storage,
    files:bundle.files.map(({bytes,...f})=>({...f,key:`${base}/${f.name}`})),
    preview:{fileName:'diagram.png',key:`${base}/diagram.png`},validation:{fileName:'validation.json',key:`${base}/validation.json`,checks:bundle.validation.checks},
    metadataKey:`${base}/metadata.json`,catalogKey:`${prefix}/catalog/${diagramId}/versions/${String(version).padStart(6,'0')}/metadata.json`};
  return validateMetadata(metadata);
}
function verifyLocalMetadata(metadata,bundle,config) {
  validateMetadata(metadata);
  const {bucket,region,expectedBucketOwner,prefix,encryption}=config;
  if(JSON.stringify(metadata.storage)!==JSON.stringify({bucket,region,expectedBucketOwner,prefix,encryption})||metadata.title!==bundle.input.title||metadata.diagramType!==bundle.input.type||JSON.stringify(metadata.validation.checks)!==JSON.stringify(bundle.validation.checks)) throw new Error('Metadata/input/config changed. Use a new output folder and --previous-metadata for a new version.');
  for(const file of bundle.files) {const stored=metadata.files.find(f=>f.name===file.name);if(stored.sha256!==file.sha256||stored.sizeBytes!==file.sizeBytes) throw new Error(`Local artifact changed: ${file.name}. Use a new version.`);}
}
module.exports={FILES,MAX_FILE_BYTES,sha256,jsonBytes,parseJson,validateConfig,validateMetadata,readRegularFile,loadBundle,createMetadata,verifyLocalMetadata};
