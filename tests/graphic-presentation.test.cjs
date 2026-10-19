"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {PNG}=require('pngjs');
const {fixture}=require('../examples/graphic-slides/fixture.cjs');
const {validatePresentation}=require('../src/presentation/validate.cjs');
const {readAssets}=require('../src/presentation/graphic-assets.cjs');
const {generatePresentation,hash}=require('../src/presentation/engine.cjs');
async function job() {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'graphic-job-'));
 const assets=[];
 for(let i=0;i<2;i++) {
  const p=new PNG({width:40+i*20,height:30});
  for(let j=0;j<p.data.length;j+=4){p.data[j]=i?40:210;p.data[j+1]=i?130:60;p.data[j+2]=160;p.data[j+3]=255;}
  const bytes=PNG.sync.write(p),name=`fixture-${i}.png`;
  await fs.writeFile(path.join(dir,name),bytes);
  assets.push({assetId:`asset${i}`,path:name,sha256:hash(bytes),kind:i?'generated':'existing',referenceId:`ref${i}`,origin:'Synthetic test fixture; not documentary evidence',license:'Test fixture created locally',alt:'色・縦横比検査のためのテスト画素',...(i?{prompt:'Synthetic fixture metadata used to test disclosure; no generation service call'}:{})});
 }
 const input=fixture(assets);await fs.writeFile(path.join(dir,'input.md'),'説明用の共通描画検証。\n');
 return {dir,input};
}
test('graphic semantics reject coordinates, unresolved images, provenance gaps and wrong connection topology',()=>{
 const p=fixture();assert.doesNotThrow(()=>validatePresentation(p));
 for(const mutate of [q=>q.slides[0].content.x=10,q=>q.slides[0].content.nodes[0].id='bad"id',q=>q.slides[0].content.connections[0].to='unknown',q=>q.slides[0].content.nodes[1].id=q.slides[0].content.nodes[0].id,q=>q.slides[1].content.steps=[]]) {
  const q=structuredClone(p);mutate(q);assert.throws(()=>validatePresentation(q));
 }
});
test('assets require disclosure, bounded local paths, exact hashes, bytes and no symlinks',async()=>{
 const {dir,input}=await job();
 try {
  validatePresentation(input);assert.equal((await readAssets(input,dir)).size,2);
  for(const mutate of [q=>delete q.assets[1].prompt,q=>q.assets[0].path='../outside.png',q=>q.assets[0].path='/tmp/a.png',q=>q.assets[0].path='https://host/image.png',q=>q.assets[0].referenceId='unknown',q=>q.slides[4].content.image.assetId='missing',q=>q.slides[4].references=['input'],q=>q.assets[0].sha256='0'.repeat(64)]) {
   const q=structuredClone(input);mutate(q);await assert.rejects(async()=>{validatePresentation(q);await readAssets(q,dir);});
  }
  await fs.symlink(path.join(dir,input.assets[0].path),path.join(dir,'link.png'));
  const linked=structuredClone(input);linked.assets[0].path='link.png';await assert.rejects(readAssets(linked,dir),/symlink/);
  const big=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(big);big.writeUInt32BE(50000,16);big.writeUInt32BE(50000,20);
  await fs.writeFile(path.join(dir,input.assets[0].path),big);input.assets[0].sha256=hash(big);await assert.rejects(readAssets(input,dir),/pixel limit/);
  await fs.truncate(path.join(dir,input.assets[0].path),20_000_001);await assert.rejects(readAssets(input,dir),/size/);
  await fs.writeFile(path.join(dir,input.assets[0].path),'not an image');input.assets[0].sha256=hash(Buffer.from('not an image'));await assert.rejects(readAssets(input,dir),/PNG/);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('six graphic layouts render with immutable assets, editable text, color and generation labels',async()=>{
 const {dir,input}=await job();
 try {
  const result=await generatePresentation(input,{output:path.resolve('outputs/graphic-tests'),assetRoot:dir,sourceFiles:{input:path.join(dir,'input.md')},exportFormats:[]});
  assert.equal(result.metadata.slides.length,6);assert.equal(result.metadata.assets.length,2);
  for(const a of result.metadata.assets)assert.equal(hash(await fs.readFile(path.join(result.directory,a.path))),a.sha256);
  const validation=JSON.parse(await fs.readFile(path.join(result.directory,'validation.json')));
  assert.ok(validation.slides[5].report.blocks.some(b=>b.original.includes('生成画像・説明用')));
  assert.equal(validation.slides[5].report.checks.monochrome,'not_applicable_source_colors_preserved');
  const svg=await fs.readFile(path.join(result.directory,'slides/006/slide.svg'),'utf8');assert.match(svg,/<image/);assert.match(svg,/<text/);
  await fs.mkdir('outputs/graphic-tests',{recursive:true});await fs.writeFile('outputs/graphic-tests/evidence.json',JSON.stringify({directory:result.directory}));
  await assert.rejects(generatePresentation(input,{output:path.resolve('outputs/graphic-tests'),assetRoot:dir,exportFormats:[]}),/EEXIST/);
  const over=structuredClone(input);over.presentationId=crypto.randomUUID();over.slides=[over.slides[4]];over.slides[0].content.explanation='説明'.repeat(210);
  await assert.rejects(generatePresentation(over,{output:path.resolve('outputs/graphic-tests'),assetRoot:dir,exportFormats:[]}),/OVERFLOW/);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
