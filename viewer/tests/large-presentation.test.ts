import {test} from 'node:test';
import assert from 'node:assert/strict';
import approvals from '../../config/upload-size-approvals.json';
import {presentationManifest} from '../src/lib/manifest';
import {file,summary} from '../src/lib/store';
const a=approvals.approvals[0],id='4f2af5d0-86c9-4709-9dad-9f6a67e5ac10',base=`library/diagrams/${id}/versions/000001`;
function fixture(){return {schemaVersion:'presentation-s3-1.0',uploadPolicy:'pdf-pptx-png-v1',diagramId:id,version:1,title:'2040年の産業とAIエージェント',storage:a.storage,formats:['png','pdf','pptx'],metadataKey:base+'/upload-manifest.json',catalogKey:`library/catalog/${id}/versions/000001/upload-manifest.json`,files:a.files.filter(f=>f.name.startsWith(base+'/')&&!f.name.endsWith('upload-manifest.json')).map(f=>({name:f.name.slice(base.length+1),key:f.name,sizeBytes:f.sizeBytes,sha256:f.sha256,contentType:f.name.endsWith('.png')?'image/png':f.name.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation'}))};}
const decode=(m:ReturnType<typeof fixture>)=>presentationManifest(m,m.catalogKey,'2026-10-15T00:00:00.000Z');
test('approved 40-page deck lists and resolves large PDF/PPTX and every PNG without leaking storage',()=>{
 const m=decode(fixture());assert.equal(m.pageCount,40);assert.equal(m.files.length,42);assert.ok(file(m,'pdf').sizeBytes>20000000);assert.ok(file(m,'pptx').sizeBytes>20000000);
 for(let i=1;i<=40;i++)assert.equal(file(m,'png',i).name,`slides/${String(i).padStart(3,'0')}/slide.png`);
 const item=summary(m);assert.equal(item.pageCount,40);assert.equal(item.type,'presentation');assert.ok(!JSON.stringify(item).includes('library/diagrams'));
});
test('large-deck exception rejects altered hashes, size, new identity/version, missing pages and extra artifacts',()=>{
 const mutations=[(m:any)=>m.files.find((f:any)=>f.name==='document.pdf').sha256='0'.repeat(64),(m:any)=>m.files[0].sha256='1'.repeat(64),(m:any)=>m.files[0].sizeBytes++,(m:any)=>m.files.pop(),(m:any)=>m.version=2,(m:any)=>m.storage={...m.storage,bucket:'other'},(m:any)=>m.files.push({...m.files[0],name:'slides/041/slide.png',key:base+'/slides/041/slide.png'}),(m:any)=>{m.version=2;m.metadataKey=m.metadataKey.replace('/000001/','/000002/');m.catalogKey=m.catalogKey.replace('/000001/','/000002/');m.files.forEach((f:any)=>f.key=f.key.replace('/000001/','/000002/'));}];
 mutations.push((m:any)=>m.files=m.files.filter((f:any)=>f.name!=='slides/040/slide.png'));
 for(const mutate of mutations){const m=structuredClone(fixture());mutate(m);assert.throws(()=>decode(m),/INVALID_MANIFEST/);}
});
