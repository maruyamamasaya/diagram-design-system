'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {run,verifyApi,hash} = require('../src/workflow/run.cjs');
const input = require('../examples/linux-operations/presentation-phase7.json');
test('API pagination, hashes, authentication and missing entry',async()=>{
  const manifest={diagramId:'id',version:1,files:[{name:'document.pdf',sha256:'hash',sizeBytes:2}]};
  let count=0;
  const fetch=async(url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer secret');
    count++;
    return {ok:true,json:async()=>url.includes('?version=')?{id:'id',version:1,formats:['png','pdf','pptx'],files:manifest.files}:url.includes('cursor=')?{items:[{id:'id',version:1}]}:{items:[],nextCursor:'next'}};
  };
  assert.equal((await verifyApi('https://example.test/v1','secret',manifest,fetch)).list,'passed');
  assert.equal(count,3);
  await assert.rejects(verifyApi('http://example.test/v1','secret',manifest,fetch));
  await assert.rejects(verifyApi('https://example.test/v1','',manifest,fetch));
  await assert.rejects(verifyApi('https://example.test/v1','secret',manifest,async()=>({ok:true,json:async()=>({id:'id',version:1,formats:['png','pdf','pptx'],files:[]})})));
});
test('failed generation retries isolated attempts; changed source rejected; no external access by default',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-'));
  try {
    const source=path.join(dir,'input.md');await fs.writeFile(source,'source');
    let attempts=0;
    const generate=async(_input,options)=>{
      attempts++;
      if(attempts===1) throw Error('failed');
      const directory=path.join(options.output,'package');await fs.mkdir(directory,{recursive:true});
      await fs.mkdir(path.join(directory,'source'));
      await fs.writeFile(path.join(directory,'source/presentation.json'),JSON.stringify(require('../src/presentation/defaults.cjs').applyTemplateDefaults(_input)));
      const files=['slide.svg','slide.png','document.pdf','presentation.pptx','input.md'];
      for(const f of files)await fs.writeFile(path.join(directory,f),f === 'input.md' ? 'source' : f);
      const descriptor=f=>({path:f,sha256:hash(f),sizeBytes:Buffer.byteLength(f)});
      await fs.writeFile(path.join(directory,'metadata.json'),JSON.stringify({slides:[{artifacts:files.slice(0,2).map(descriptor)}],sources:[{path:'input.md',sourceId:'input',sha256:hash('source'),sizeBytes:6}],deckArtifacts:files.slice(2,4).map(descriptor),formats:{svg:'generated',png:'generated',pdf:'generated',pptx:'generated'}}));
      return {directory};
    };
    const args={input,sources:{input:source},output:dir};
    await assert.rejects(run(args,{generate}));
    const result=await run(args,{generate});await assert.rejects(fs.access(path.join(result.directory,'slide.svg')));assert.equal(result.attempt,2);assert.equal(result.stage,'local');
    const again=await run({...args,policy:{classification:'confidential',explicitlyApproved:true}},{generate});
    assert.equal(attempts,2);assert.equal(again.upload,'blocked-policy');
    await fs.writeFile(path.join(result.directory,'document.pdf'),'changed');await assert.rejects(run(args,{generate}));
    await fs.writeFile(source,'changed');await assert.rejects(run(args,{generate}));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('approved workflow uploads once, retries API failure and blocks stale approval',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-upload-'));
  try {
    const source=path.join(dir,'input.md');await fs.writeFile(source,'public example');
    const document=structuredClone(input);document.slides=document.slides.slice(0,1);
    const config={schemaVersion:'1.0',bucket:'test-library',region:'ap-northeast-1',expectedBucketOwner:'123456789012',prefix:'library',encryption:'AES256',approved:true};
    const objects=new Map();let writes=0,generated=0;
    const storage={preflight:async()=>{},checkCapacity:async()=>{},read:async k=>objects.get(k),verify:async(k,b)=>{assert.deepEqual(objects.get(k),b);return {key:k};},write:async(k,b)=>{assert.ok(!objects.has(k));objects.set(k,b);writes++;return {key:k};}};
    const generate=async(p,o)=>{
      generated++;const directory=path.join(o.output,'package');
      const slide=p.slides[0];
      const data={'source/presentation.json':JSON.stringify(p),'source/input.md':'public example','slides/001/slide.svg':'<svg/>','slides/001/slide.png':'png','thumbnails/001.png':'preview','document.pdf':'pdf','presentation.pptx':'pptx','validation.json':JSON.stringify({slides:[{slideId:slide.slideId,part:1,report:{checks:Object.fromEntries(['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].map(k=>[k,'passed']))}}]})};
      const desc=name=>({path:name,sizeBytes:Buffer.byteLength(data[name]),sha256:hash(data[name])});
      data['metadata.json']=JSON.stringify({schemaVersion:'presentation-package-1.0',presentationId:p.presentationId,presentationVersion:p.version,generatedAt:'2026-10-10T00:00:00.000Z',slides:[{pageId:slide.slideId+'-part-1',slideId:slide.slideId,slideVersion:1,part:1,templateId:slide.templateId,contentHash:hash('content'),sourceReferences:[],generatedAt:'2026-10-10T00:00:00.000Z',artifacts:['slides/001/slide.svg','slides/001/slide.png','thumbnails/001.png'].map(desc)}],sources:[{sourceId:'input',sourceVersion:hash('public example'),path:'source/input.md',sha256:hash('public example')}],formats:{svg:'generated',png:'generated',thumbnailPng:'generated',pdf:'generated',pptx:'generated',webSvg:'unsupported',webp:'unsupported'},font:{},codeFont:{},ruleHashes:{},dependencyHash:hash('dep'),status:'generated',deckArtifacts:['document.pdf','presentation.pptx'].map(desc)});
      for(const [name,bytes] of Object.entries(data)){await fs.mkdir(path.dirname(path.join(directory,name)),{recursive:true});await fs.writeFile(path.join(directory,name),bytes);}
      return {directory};
    };
    const args={input:document,sources:{input:source},output:dir,config,apiBase:'https://example.test/v1',token:'secret'};
    const local=await run(args,{generate});
    const approved={...args,review:{packageHash:local.packageHash,contentAccuracy:'passed',visualReview:'passed'},policy:{classification:'public',explicitlyApproved:true,fingerprint:local.fingerprint,destinationHash:hash(require('../src/presentation/engine.cjs').canonical(config))}};
    await assert.rejects(run(approved,{generate,storage,fetch:async()=>({ok:false})}));
    assert.equal(writes,5); // three artifacts, manifest, catalog
    const fetch=async url=>({ok:true,json:async()=>{
      const m=JSON.parse(await fs.readFile(path.join(local.directory,'s3-artifacts-manifest.json')));
      return url.includes('?version=')?{id:m.diagramId,version:m.version,formats:m.formats,files:m.files}:{items:[{id:m.diagramId,version:m.version}]};
    }});
    const complete=await run(approved,{generate,storage,fetch});assert.equal(complete.stage,'complete');assert.equal(writes,5);assert.equal(generated,1);
    const blocked=await run({...approved,policy:{...approved.policy,fingerprint:'wrong'}},{generate,storage,fetch});assert.equal(blocked.upload,'blocked-policy');assert.equal(writes,5);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
