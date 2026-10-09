'use strict';
// Small deterministic fixtures for offline UI/API verification, never uploaded.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require('../../node_modules/pngjs');
const {createMetadata,jsonBytes,sha256}=require('../../src/upload/metadata.cjs');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'viewer/.local/mock');fs.mkdirSync(dir,{recursive:true});
const png=new PNG({width:1600,height:900});png.data.fill(255);const image=PNG.sync.write(png);
const c={schemaVersion:'1.0',bucket:'diagram-design-system-676643701781-apne1',region:'ap-northeast-1',expectedBucketOwner:'676643701781',prefix:'library',encryption:'AES256',approved:false};
const save=(folder,name,b)=>{const p=path.join(dir,folder,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
const input=require('../../examples/linux-roadmap/input.json');
const validation={generatedAt:'2026-10-09T00:00:00.000Z',checks:Object.fromEntries(['schema','glyphCoverage','originalTextPreserved','renderedTextBounds','textOverlaps','pngDecodeAndDimensions','opaqueMonochrome'].map(k=>[k,'合格']))};validation.checks.visualReview='未検証';
const defs=[['diagram.svg','source','svg','image/svg+xml',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="white"/><text x="80" y="100">Offline SVG fixture</text></svg>')],['diagram.png','preview','png','image/png',image],['input.json','input','json','application/json',jsonBytes(input)],['validation.json','validation','json','application/json',jsonBytes(validation)]];
const bundle={input,validation,files:defs.map(([name,role,format,contentType,bytes])=>({name,role,format,contentType,bytes,sizeBytes:bytes.length,sha256:sha256(bytes)}))};
let legacy=createMetadata(bundle,c);const old=legacy.diagramId;legacy=JSON.parse(JSON.stringify(legacy).replaceAll(old,'37386704-778e-41a5-a0f6-71e6e64cdf24'));
for(const f of bundle.files)save('legacy',f.name,f.bytes);save('legacy','metadata.json',jsonBytes(legacy));
const id='b290c3e5-9e2f-4abc-9193-d937859e9af6',base=`library/diagrams/${id}/versions/000001`,files=[];
const actual=path.join(root,'outputs/phase75-rag',id,'versions/000001');
function artifact(name,type,fallback){const local=path.join(actual,name),bytes=fs.existsSync(local)?fs.readFileSync(local):fallback;save('presentation',name,bytes);files.push({name,contentType:type,sizeBytes:bytes.length,sha256:sha256(bytes),key:base+'/'+name});}
for(let i=1;i<=8;i++)artifact(`slides/${String(i).padStart(3,'0')}/slide.png`,'image/png',image);
artifact('document.pdf','application/pdf',Buffer.from('%PDF-1.4\n% offline test fixture\n%%EOF'));
artifact('presentation.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation',Buffer.from('PK offline test fixture'));
save('presentation','metadata.json',jsonBytes({schemaVersion:'presentation-s3-1.0',uploadPolicy:'pdf-pptx-png-v1',diagramId:id,version:1,title:'RAGシステムの技術解説',storage:Object.fromEntries(['bucket','region','expectedBucketOwner','prefix','encryption'].map(k=>[k,c[k]])),formats:['png','pdf','pptx'],files,metadataKey:base+'/upload-manifest.json',catalogKey:`library/catalog/${id}/versions/000001/upload-manifest.json`}));
fs.writeFileSync(path.join(dir,'index.json'),jsonBytes(['legacy','presentation']));console.log('Initialized offline legacy + presentation fixtures (not uploaded).');
