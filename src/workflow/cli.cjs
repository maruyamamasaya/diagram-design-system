'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {run} = require('./run.cjs');
async function main() {
  const {values:v} = parseArgs({options:Object.fromEntries(['input','source','output','config','policy','review','api-base','font','browser'].map(k=>[k,{type:'string'}]))});
  if(!v.input || !v.source) throw Error('--input JSON and --source Markdown required');
  const read = async p => p ? JSON.parse(await fs.readFile(p,'utf8')) : undefined;
  const result = await run({input:await read(v.input),sources:{input:v.source},output:path.resolve(v.output || 'outputs'),config:await read(v.config),policy:await read(v.policy),review:await read(v.review),apiBase:v['api-base'],token:process.env.DIAGRAM_API_TOKEN,fontPath:v.font,browserPath:v.browser || process.env.DIAGRAM_BROWSER,assetRoot:path.dirname(path.resolve(v.input))});
  console.log(JSON.stringify({stage:result.stage,directory:result.directory,fingerprint:result.fingerprint,packageHash:result.packageHash,review:result.review,svg:result.svg,upload:result.upload,api:result.api}));
}
main().catch(()=>{console.error('Workflow failed. Local files preserved; see docs/phase12-workflow.md.');process.exitCode=1;});
