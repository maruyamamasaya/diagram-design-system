'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
const {PNG}=require('pngjs');
const {createIllustration,validateJob}=require('../src/illustration/create.cjs');
const {uploadDirectory}=require('../src/upload/workflow.cjs');
const config={schemaVersion:'1.0',bucket:'diagram-design-system-676643701781-apne1',region:'ap-northeast-1',expectedBucketOwner:'676643701781',prefix:'library',encryption:'AES256',approved:true};
const fontPath=process.env.DIAGRAM_FONT;
function job(mode){return {schemaVersion:'illustration-job-1.0',diagramId:randomUUID(),version:1,title:'Example',mode,source:'source.md',artwork:mode==='image'?'image.png':'artwork.svg',labels:['利用者','Webサーバー'],prompt:'Example only',assets:mode==='hybrid'?['image.png']:[],review:{text:'passed',notes:'Expected text reviewed in fixture'}};}
test('illustration job rejects unspecified mode and malformed identity',()=>{const j=job('image');assert.equal(validateJob(j),j);assert.throws(()=>validateJob({...j,mode:'auto'}));assert.throws(()=>validateJob({...j,version:0}));assert.throws(()=>validateJob({...j,review:{text:'yes'}}));});
test('three creation routes, immutable version, private source integrity and idempotent common upload',{skip:!fontPath},async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'illustration-test-'));
 try {
  const image=new PNG({width:640,height:360});image.data.fill(255);await fs.writeFile(path.join(temp,'image.png'),PNG.sync.write(image));await fs.writeFile(path.join(temp,'source.md'),'Hypothetical users connect to Web.');
  for(const mode of ['svg','hybrid','image']) {
   const j=job(mode),svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect x="32" y="32" width="576" height="296" fill="white" stroke="black"/><text x="64" y="100" font-size="28">利用者</text><text x="320" y="200" font-size="28">Webサーバー</text>'+(mode==='hybrid'?'<image x="500" y="200" width="50" height="50" href="data:image/png;base64,'+PNG.sync.write(image).toString('base64')+'"/>':'')+'</svg>';
   await fs.writeFile(path.join(temp,'artwork.svg'),svg);await fs.writeFile(path.join(temp,'job.json'),JSON.stringify(j));
   const r=await createIllustration(path.join(temp,'job.json'),{out:path.join(temp,'out'),fontPath});
   assert.equal(r.validation.checks.decode,'passed');
   const replay=JSON.parse(await fs.readFile(path.join(r.directory,'source.json')));
   for(const name of [replay.source,replay.artwork,...replay.assets])assert.ok((await fs.stat(path.join(r.directory,name))).isFile());await assert.rejects(()=>createIllustration(path.join(temp,'job.json'),{out:path.join(temp,'out'),fontPath}));
   const plan=await uploadDirectory(r.directory,config,{dryRun:true});assert.equal(plan.metadata.schemaVersion,'illustration-s3-1.0');assert.deepEqual(plan.metadata.files.map(f=>f.name),['diagram.png','diagram.pdf']);assert.ok(!JSON.stringify(plan.metadata).includes('Hypothetical'));
   const objects=new Map();let writes=0;const storage={async preflight(){},async checkCapacity(){},async read(k){return objects.get(k)||null;},async write(k,b){if(objects.has(k))throw Error('Collision');writes++;objects.set(k,b);return k;},async verify(k,b){assert.deepEqual(objects.get(k),b);return k;}};
   await assert.rejects(()=>uploadDirectory(r.directory,config,{storage}),/approve/);
   if(mode==='image') {
    let interrupted=false;const failing={...storage,async write(k,b){if(!interrupted&&k.endsWith('diagram.pdf')){interrupted=true;throw Error('Controlled interruption');}return storage.write(k,b);}};
    await assert.rejects(()=>uploadDirectory(r.directory,config,{storage:failing,approveContent:true}),/Controlled interruption/);
    assert.equal(objects.has(plan.metadata.catalogKey),false);
    storage.write=async(k,b)=>{if(objects.has(k)){assert.deepEqual(objects.get(k),b);return k;}writes++;objects.set(k,b);return k;};
   }
   const first=await uploadDirectory(r.directory,config,{storage,approveContent:true});assert.equal(first.status.state,'complete');assert.equal(writes,4);
   await uploadDirectory(r.directory,config,{storage,approveContent:true});assert.equal(writes,4);
   await fs.appendFile(path.join(r.directory,'source.md'),'changed');await assert.rejects(()=>uploadDirectory(r.directory,config,{dryRun:true}),/integrity/);
  }
  const pending=job('image');pending.review.text='pending';await fs.writeFile(path.join(temp,'job.json'),JSON.stringify(pending));
  const draft=await createIllustration(path.join(temp,'job.json'),{out:path.join(temp,'out'),fontPath});await assert.rejects(()=>uploadDirectory(draft.directory,config,{dryRun:true}),/Text review required/);
  const j=job('svg');await fs.writeFile(path.join(temp,'job.json'),JSON.stringify(j));await fs.writeFile(path.join(temp,'artwork.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><script>alert(1)</script></svg>');
  await assert.rejects(()=>createIllustration(path.join(temp,'job.json'),{out:path.join(temp,'out'),fontPath}),/Unsupported SVG/);
   await fs.writeFile(path.join(temp,'artwork.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><g transform="translate(1000,0)"><text x="60" y="80">利用者 Webサーバー</text></g></svg>');
  await assert.rejects(()=>createIllustration(path.join(temp,'job.json'),{out:path.join(temp,'out'),fontPath}),/Text outside/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
