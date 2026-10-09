#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {parseArgs}=require('node:util');
const {validateInput}=require('./model.cjs');
const {loadRules}=require('./rules.cjs');
const {loadFont}=require('./font.cjs');
const {openBrowser}=require('./browser.cjs');
const {generate}=require('./engine.cjs');
const {LocalStorage,saveArtifacts}=require('./storage.cjs');
const root=path.resolve(__dirname,'..');
async function main() {
  const {values}=parseArgs({options:{input:{type:'string'},template:{type:'string',default:'roadmap'},output:{type:'string'},font:{type:'string'},'code-font':{type:'string'},browser:{type:'string'},help:{type:'boolean'}}});
  if(values.help) {console.log('node src/cli.cjs --input <JSON> --template roadmap --output <outputs/subdir> --font <OFL TTF/OTF> [--code-font <OFL mono TTF/OTF>] [--browser <Chromium executable>]');return;}
  if(!values.input||!values.output) throw new Error('--input and --output are required.');
  const output=path.resolve(values.output), outputs=path.join(root,'outputs');
  const relative=path.relative(outputs,output);
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('--output must be inside this project outputs/ directory (ignored by Git).');
  // Reject symlink ancestors, which could silently move outputs into tracked paths.
  for(let current=output;;current=path.dirname(current)) {
    try {if((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symlink output paths are unsupported.');} catch(e) {if(e.code!=='ENOENT') throw e;}
    if(current===root) break;
  }
  try {const entries=await fs.readdir(output);if(entries.length) throw new Error('Output directory must be empty; use a new run directory.');} catch(e) {if(e.code!=='ENOENT') throw e;}
  const input=validateInput(JSON.parse((await fs.readFile(values.input,'utf8')).replace(/^\uFEFF/,'')),values.template);
  const rules=await loadRules(root);
  const strings=[input.title,input.purpose,input.audience,...input.notes,...input.steps.flatMap(s=>[s.title,s.purpose,s.outcome||'',...s.items.map(i=>i.text)]),...input.relations.map(r=>r.label),...(input.sources||[]).flatMap(s=>[s.label,s.reference]),'STEP 0123456789目的対象関連項目到達条件出典：—'];
  const fontPath=values.font||(process.platform==='win32'?'C:/Windows/Fonts/NotoSansJP-VF.ttf':null);
  if(!fontPath) throw new Error('--font is required on this platform.');
  const font=await loadFont(fontPath,strings);
  const codeFont=await loadFont(values['code-font']||path.join(root,'assets/fonts/NotoSansMono-Regular.ttf'),input.steps.flatMap(s=>s.items.filter(i=>i.kind==='code').map(i=>i.text)),'DiagramMono');
  const {browser,context}=await openBrowser(values.browser);
  try {const artifacts=await generate(input,{template:values.template,rules,font,codeFont,context});await saveArtifacts(artifacts,new LocalStorage(output));console.log(`Generated SVG, PNG, input and validation report: ${output}\nAutomated checks passed. Visual review remains unverified until inspected.`);}
  finally {await browser.close();}
}
main().catch(e=>{console.error(`Error: ${e.message}`);process.exitCode=1;});
