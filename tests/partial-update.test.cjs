'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { regenerate } = require('../src/update/regenerate.cjs');
const { createUpdatePlan } = require('../src/update/plan.cjs');
const { canonical, hash } = require('../src/presentation/engine.cjs');
const originalExample = require('../examples/linux-operations/presentation-phase7.json');
const updatedExample = require('../examples/linux-operations/presentation-systemd.json');
const checks = Object.fromEntries(['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].map(k => [k,'passed']));
async function put(dir, name, bytes) { await fs.mkdir(path.dirname(path.join(dir,name)), {recursive:true}); await fs.writeFile(path.join(dir,name),bytes); return {path:name,sha256:hash(bytes),sizeBytes:Buffer.byteLength(bytes)}; }
async function fixture() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(),'partial-update-')), baseline = path.join(temp,'old');
  const original = structuredClone(originalExample), input = structuredClone(updatedExample);
  const before = await fs.readFile('examples/linux-operations/input.md','utf8'), after = await fs.readFile('examples/linux-operations/input-systemd.md','utf8');
  const plan = createUpdatePlan(original,{input:before},{input:after});
  const meta = {schemaVersion:'presentation-package-1.0',presentationId:original.presentationId,presentationVersion:original.version,generatedAt:'2026-10-10',slides:[],sources:[],formats:{svg:'generated',png:'generated',thumbnailPng:'generated',pdf:'generated',pptx:'generated',webSvg:'unsupported',webp:'unsupported'},font:{family:'Noto Sans JP',sha256:hash('font')},codeFont:{family:'Noto Sans Mono',sha256:hash('mono')},ruleHashes:{},dependencyHash:hash('dependencies'),status:'generated'};
  const validation = {slides:original.slides.map(s=>({slideId:s.slideId,part:1,report:{checks}}))};
  for (let i=0;i<8;i++) {
    const s=original.slides[i], n=String(i+1).padStart(3,'0');
    meta.slides.push({slideId:s.slideId,pageId:s.slideId+'-part-1',slideVersion:s.slideVersion,part:1,templateId:s.templateId,contentHash:hash(canonical(s.content)),sourceReferences:s.sourceReferences,generatedAt:meta.generatedAt,artifacts:[{path:`slides/${n}/slide.svg`,sizeBytes:3,sha256:hash('svg')},await put(baseline,`slides/${n}/slide.png`,'png-'+i),await put(baseline,`thumbnails/${n}.png`,'thumb-'+i)]});
  }
  await put(baseline,'source/input.md',before);meta.sources.push({sourceId:'input',sourceVersion:hash(before),path:'source/input.md',sha256:hash(before)});
  meta.deckArtifacts=[await put(baseline,'document.pdf','baseline-pdf'),await put(baseline,'presentation.pptx','baseline-pptx')];
  await put(baseline,'metadata.json',JSON.stringify(meta));await put(baseline,'validation.json',JSON.stringify(validation));await put(baseline,'source/presentation.json',JSON.stringify(original));
  const source=path.join(temp,'after.md');await fs.writeFile(source,after);
  return {temp,baseline,plan,input,sourceFiles:{input:source},output:path.join(temp,'output'),meta,original,before,after};
}
function mocks(f, parts=1) {
  const calls=[];
  return {calls,generate:async(input,options)=>{
    calls.push({input,options}); const dir=path.join(f.temp,'generated'),slide=input.slides[0],meta={...structuredClone(f.meta),slides:[]};
    for(let i=0;i<parts;i++) {const n=String(i+1).padStart(3,'0');meta.slides.push({...f.meta.slides[4],slideVersion:slide.slideVersion,part:i+1,pageId:slide.slideId+'-part-'+(i+1),templateId:slide.templateId,contentHash:hash('updated-'+i),sourceReferences:slide.sourceReferences,artifacts:[await put(dir,`slides/${n}/slide.svg`,'new-svg-'+i),await put(dir,`slides/${n}/slide.png`,'new-png-'+i),await put(dir,`thumbnails/${n}.png`,'new-thumb-'+i)]});}
    await put(dir,'validation.json',JSON.stringify({slides:meta.slides.map(s=>({slideId:s.slideId,part:s.part,report:{checks}}))}));
    const diagram=slide.content.diagram;await put(dir,`source/diagrams/${diagram.diagramId}.json`,await fs.readFile(diagram.sourcePath));
    return {directory:dir,metadata:meta};
  },compose:async(manifest,dir)=>{calls.push({manifest});await put(dir,'document.pdf','new-pdf');await put(dir,'presentation.pptx','new-pptx');return {pdfPages:manifest.pages.length,pptxPages:manifest.pages.length};}};
}
test('only the update renders; split pages and reordered slide IDs compose with identical reuse bytes',async()=>{
  const f=await fixture();try {
    const baselineHash=hash(await fs.readFile(path.join(f.baseline,'metadata.json')));
    f.input.slides=[f.input.slides[4],...f.input.slides.filter((_,i)=>i!==4)];const dep=mocks(f,2),result=await regenerate(f,dep);
    assert.equal(dep.calls.filter(c=>c.input).length,1);assert.equal(dep.calls[0].input.slides[0].slideId,f.original.slides[4].slideId);assert.equal(dep.calls[0].options.pageNumberStart,1);
    assert.equal(result.regenerated,1);assert.equal(result.reused,7);assert.equal(result.pages,9);
    assert.deepEqual(result.metadata.slides.map(s=>s.slideId),[f.original.slides[4].slideId,f.original.slides[4].slideId,...f.original.slides.filter((_,i)=>i!==4).map(s=>s.slideId)]);
    for(const page of result.metadata.update.pages.filter(s=>s.action==='reused')) for(const a of page.artifacts) assert.equal(hash(await fs.readFile(path.join(result.directory,a.path))),a.sha256);
    assert.equal(hash(await fs.readFile(path.join(f.baseline,'metadata.json'))),baselineHash);
    assert.equal(await fs.readFile(path.join(f.baseline,'slides/005/slide.png'),'utf8'),'png-4');
    assert.equal(result.metadata.update.pages[0].action,'regenerated');
    assert.equal(result.metadata.slides[2].contentHash,f.meta.slides[0].contentHash);
    await assert.rejects(fs.access(path.join(result.directory,'slides/001/slide.svg')));
    await assert.rejects(regenerate(f,dep),/EEXIST/);
  }finally{await fs.rm(f.temp,{recursive:true,force:true});}
});
test('review and unmapped source changes hold the entire version; forged plans fail',async()=>{
  const f=await fixture();try {
    await fs.writeFile(f.sourceFiles.input,f.after+'## 新節\n追加\n');f.plan=createUpdatePlan(f.original,{input:f.before},{input:f.after+'## 新節\n追加\n'});
    const dep=mocks(f),result=await regenerate(f,dep);assert.equal(result.status,'held');assert.equal(dep.calls.length,0);await assert.rejects(fs.access(f.output));
    f.plan.keepSlideIds=[];await assert.rejects(regenerate(f,dep),/plan does not match/);
  }finally{await fs.rm(f.temp,{recursive:true,force:true});}
});
test('keep changes, stale inputs and corrupt old pages are rejected before rendering',async()=>{
  const f=await fixture();try {
    const dep=mocks(f),heading=f.input.slides[0].content.heading;
    const alias=path.join(f.temp,'alias');await fs.symlink(f.baseline,alias);await assert.rejects(regenerate({...f,output:alias},dep),/Output must not modify baseline/);
f.input.slides[0].content.heading='changed';await assert.rejects(regenerate(f,dep),/Keep slide content/);f.input.slides[0].content.heading=heading;
    const locator=f.input.slides[0].sourceReferences[0].locator;f.input.slides[0].sourceReferences[0].locator='lines:3-4';await assert.rejects(regenerate(f,dep),/source mapping changed/);f.input.slides[0].sourceReferences[0].locator=locator;
    await fs.writeFile(f.sourceFiles.input,'stale');await assert.rejects(regenerate(f,dep),/plan does not match/);await fs.writeFile(f.sourceFiles.input,f.after);
    await fs.writeFile(path.join(f.baseline,'slides/001/slide.png'),'corrupt');await assert.rejects(regenerate(f,dep),/integrity mismatch/);assert.equal(dep.calls.length,0);
  }finally{await fs.rm(f.temp,{recursive:true,force:true});}
});
test('render failure leaves an incomplete new version and keeps the old version unchanged',async()=>{
  const f=await fixture();try {
    await assert.rejects(regenerate(f,{generate:async()=>{throw Error('render failed');}}),/render failed/);
    const dir=path.join(f.output,f.input.presentationId,'versions',String(f.input.version).padStart(6,'0'));assert.equal(JSON.parse(await fs.readFile(path.join(dir,'validation.json'))).status,'failed');await assert.rejects(fs.access(path.join(dir,'metadata.json')));
    assert.equal(await fs.readFile(path.join(f.baseline,'slides/005/slide.png'),'utf8'),'png-4');
  }finally{await fs.rm(f.temp,{recursive:true,force:true});}
});
