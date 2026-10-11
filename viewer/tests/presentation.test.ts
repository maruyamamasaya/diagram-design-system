import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {presentationManifest} from '../src/lib/manifest';
import {handle} from '../src/lib/api';
import {createSession,token} from '../src/lib/auth';
const raw=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.local/mock/presentation/metadata.json'),'utf8'));
process.env.VIEWER_SECRET=randomBytes(32).toString('hex');process.env.VIEWER_PASSWORD_HASH='test:'+scryptSync('password','test',64).toString('hex');process.env.VIEWER_OWNER='local-owner';process.env.VIEWER_ORIGIN='http://127.0.0.1:3000';process.env.VIEWER_STORAGE='mock';
const decode=(m:any)=>presentationManifest(m,m.catalogKey,'2026-10-09T00:00:00.000Z');
test('presentation catalog schema rejects arbitrary keys, types, duplicates, gaps and destination changes',()=>{
 assert.equal(decode(raw).pageCount,8);
 const mutations=[(m:any)=>m.files[0].key='library/diagrams/secret', (m:any)=>m.files[0].contentType='text/html', (m:any)=>m.storage.bucket='other', (m:any)=>m.files.push(m.files[0]), (m:any)=>m.files[0].sizeBytes=20_000_000,(m:any)=>m.files[0].sha256='forged',(m:any)=>m.files[0].name='../secret.png',(m:any)=>m.files=m.files.filter((x:any)=>!x.name.includes('/004/')),(m:any)=>m.credentials='secret'];
 for(const mutate of mutations){const m=structuredClone(raw);mutate(m);assert.throws(()=>decode(m),/INVALID_MANIFEST/);}
});
test('common API exposes pages/formats without internal keys, serves selected PNG/PDF/PPTX and revokes tickets',async()=>{
 const s=createSession(),auth={Authorization:`Bearer ${await token(s.id,s.sub)}`};
 const request=(body?:unknown)=>new Request('http://127.0.0.1:3000/v1/diagrams',{method:body?'POST':'GET',headers:{...auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const list=await handle(new Request('http://127.0.0.1:3000/v1/diagrams?q=RAG&type=presentation',{headers:auth}),'api',['diagrams']);assert.equal(list.status,200);const data=await list.json();assert.equal(data.items.length,1);assert.equal(data.items[0].pageCount,8);assert.deepEqual(data.items[0].formats,['png','pdf','pptx']);
 const detail=await handle(request(),'api',['diagrams',raw.diagramId]);const text=await detail.text();assert.ok(!text.includes('library/diagrams'));assert.ok(!text.includes('676643701781'));
 let ticket='';
 for(const [artifact,purpose,page] of [['png','preview',8],['pdf','preview',1],['pptx','download',1]] as const){
  const r=await handle(request({artifact,purpose,page}),'api',['diagrams',raw.diagramId,'access-url']);assert.equal(r.status,200);const a=await r.json();assert.equal(a.expiresIn,300);const bytes=await handle(new Request(a.url),'artifact');assert.equal(bytes.status,200);assert.equal((await bytes.arrayBuffer()).byteLength,a.sizeBytes);ticket=a.url;
 }
 for(const body of [{artifact:'png',purpose:'preview',page:9},{artifact:'png',purpose:'preview',page:0},{artifact:'png',purpose:'preview',page:'1'},{artifact:'pptx',purpose:'preview'},{artifact:'png',purpose:'preview',key:'secret'}])assert.equal((await handle(request(body),'api',['diagrams',raw.diagramId,'access-url'])).status,400);
 assert.equal((await handle(request({artifact:'svg',purpose:'preview'}),'api',['diagrams',raw.diagramId,'access-url'])).status,404);
 await handle(request({}),'api',['auth','revoke']);assert.equal((await handle(new Request(ticket),'artifact')).status,401);
});

test('standalone illustration accepts only one PNG/PDF and resolves PDF without presentation names',async()=>{
 const {file}=await import('../src/lib/store');
 const m=structuredClone(raw);m.schemaVersion='illustration-s3-1.0';m.uploadPolicy='png-pdf-v1';m.formats=['png','pdf'];
 m.files=[{...m.files[0],name:'diagram.png',contentType:'image/png'}, {...m.files.find((f:any)=>f.name==='document.pdf'),name:'diagram.pdf'}];
 for(const f of m.files)f.key=m.metadataKey.replace('upload-manifest.json',f.name);
 const normalized=decode(m);assert.equal(normalized.diagramType,'illustration');assert.equal(normalized.pageCount,1);assert.equal(file(normalized,'pdf').name,'diagram.pdf');assert.throws(()=>file(normalized,'png',2),/INVALID_PAGE/);
 for(const mutate of [(n:any)=>n.files.push(n.files[0]),(n:any)=>n.formats.push('pptx'),(n:any)=>n.files[0].name='slides/001/slide.png',(n:any)=>n.uploadPolicy='pdf-pptx-png-v1']) {const n=structuredClone(m);mutate(n);assert.throws(()=>decode(n),/INVALID_MANIFEST/);}
});
