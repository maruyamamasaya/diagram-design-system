#!/usr/bin/env node
'use strict';
const path=require('node:path');
const fs=require('node:fs/promises');
const {parseArgs}=require('node:util');
const {validateConfig,validateMetadata,parseJson,readRegularFile}=require('./upload/metadata.cjs');
const {uploadDirectory}=require('./upload/workflow.cjs');
const root=path.resolve(__dirname,'..');
async function main() {
  const {values}=parseArgs({options:{input:{type:'string'},config:{type:'string',default:path.join(root,'config/s3.local.json')},'dry-run':{type:'boolean'},'approve-content':{type:'boolean'},'previous-metadata':{type:'string'},help:{type:'boolean'}}});
  if(values.help) {console.log('npm run upload -- --input <outputs/directory> [--config <JSON>] [--dry-run] [--approve-content] [--previous-metadata <JSON>]');return;}
  if(!values.input) throw new Error('--input is required.');
  const directory=path.resolve(values.input),relative=path.relative(path.join(root,'outputs'),directory);
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('--input must be inside this project outputs/.');
  for(let current=directory;;current=path.dirname(current)) {if((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symlink paths are unsupported.');if(current===root) break;}
  let config;
  try {config=validateConfig(parseJson(await readRegularFile(values.config)));} catch(e) {if(e.code==='ENOENT') throw new Error('S3 config missing. Review config/s3.example.json, obtain destination approval, then create ignored config/s3.local.json. Use --dry-run with the example for local planning.');throw e;}
  const previous=values['previous-metadata']?validateMetadata(parseJson(await readRegularFile(values['previous-metadata']))):null;
  let storage;
  try {
    if(!values['dry-run']) {if(!config.approved||!values['approve-content']) throw new Error('Approved destination config and --approve-content are required.');const {S3Storage}=require('./upload/s3-storage.cjs');storage=new S3Storage(config);}
    const {metadata,status}=await uploadDirectory(directory,config,{storage,dryRun:!!values['dry-run'],approveContent:!!values['approve-content'],previous});
    console.log(`${status.state}: ${metadata.diagramId} version ${metadata.version}\nLocal files preserved: ${directory}\nMetadata: ${path.join(directory,['presentation-s3-1.0','illustration-s3-1.0'].includes(metadata.schemaVersion)?'s3-artifacts-manifest.json':'metadata.json')}`);
  } finally {storage?.close();}
}
if(require.main===module) main().catch(e=>{console.error(`Upload error: ${e.message}`);process.exitCode=1;});
module.exports={main};
