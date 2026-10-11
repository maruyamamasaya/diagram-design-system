import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {handle} from '../src/lib/api';
import {createSession,token} from '../src/lib/auth';
process.env.VIEWER_SECRET=randomBytes(32).toString('hex');
process.env.VIEWER_PASSWORD_HASH='test:'+scryptSync('password','test',64).toString('hex');
process.env.VIEWER_OWNER='local-owner';process.env.VIEWER_ORIGIN='http://127.0.0.1:3000';process.env.VIEWER_STORAGE='mock';
test('authenticated trash hides every version and access; restore preserves artifacts; retries and failures',async()=>{
 const raw=JSON.parse(await fs.readFile('.local/mock/presentation/metadata.json','utf8'));
 const id=raw.diagramId, stateFile=`.local/mock/state/${id}.json`;
 const session=createSession(), auth={Authorization:`Bearer ${await token(session.id,session.sub)}`};
 const req=(path:string,body?:unknown,authenticated=true)=>new Request(`http://127.0.0.1:3000/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{...(authenticated?auth:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const call=(suffix:string,body?:unknown)=>handle(req(`diagrams/${id}/${suffix}`,body),'api',['diagrams',id,suffix]);
 const list=async(state='active')=>(await (await handle(req(`diagrams?state=${state}`),'api',['diagrams'])).json()).items;
 try {
  assert.equal((await handle(req(`diagrams/${id}/trash`,{},false),'api',['diagrams',id,'trash'])).status,401);
  assert.equal((await call('trash',{key:'arbitrary'})).status,400);
  assert.ok((await list()).some((m:any)=>m.id===id));
  const grant=await (await call('access-url',{artifact:'png',purpose:'preview'})).json();
  for(let i=0;i<2;i++) assert.equal((await call('trash',{})).status,200);
  assert.ok(!(await list()).some((m:any)=>m.id===id));
  assert.ok((await list('trashed')).some((m:any)=>m.id===id));
  assert.equal((await call('access-url',{artifact:'pdf',purpose:'download',version:raw.version})).status,404);
  assert.equal((await call('versions')).status,404);
  assert.equal((await handle(req(`diagrams/${id}`),'api',['diagrams',id])).status,404);
  assert.equal((await handle(new Request(grant.url),'artifact')).status,404);
  await fs.writeFile(stateFile,'{"trashed":false}');
  assert.equal((await handle(req('diagrams'),'api',['diagrams'])).status,409);
  assert.equal((await call('restore',{})).status,200);
  assert.ok((await list()).some((m:any)=>m.id===id));
  assert.ok(!(await list('trashed')).some((m:any)=>m.id===id));
  assert.equal((await call('access-url',{artifact:'png',purpose:'preview'})).status,200);
  assert.deepEqual(JSON.parse(await fs.readFile('.local/mock/presentation/metadata.json','utf8')),raw);
 } finally { await fs.rm(stateFile,{force:true}); }
});

test('S3 state uses fixed keys and AES256; disabled writes and storage failures fail closed',async()=>{
 const {s3,libraryState,setLibraryState,catalog}=await import('../src/lib/store');
 const raw=JSON.parse(await fs.readFile('.local/mock/presentation/metadata.json','utf8'));
 await catalog();
 const client=s3(), original=client.send;
 const sent:any[]=[];let stored:string|undefined;
 (client as any).send=async(command:any)=>{
  sent.push(command);
  if(command.constructor.name==='ListObjectsV2Command')return {Contents:stored?[{Key:command.input.Prefix}]:[]};
  if(command.constructor.name==='PutObjectCommand'){stored=command.input.Body;return {};}
  return {ContentLength:Buffer.byteLength(stored!),ServerSideEncryption:'AES256',Body:{transformToByteArray:async()=>Buffer.from(stored!)}};
 };
 process.env.VIEWER_STORAGE='s3';
 try {
  delete process.env.VIEWER_TRASH_ENABLED;
  await assert.rejects(setLibraryState(raw.diagramId,true),/TRASH_NOT_ENABLED/);
  process.env.VIEWER_TRASH_ENABLED='true';
  assert.equal(await libraryState(raw.diagramId),null);
  await setLibraryState(raw.diagramId,true);
  assert.equal((await libraryState(raw.diagramId))?.trashed,true);
  await setLibraryState(raw.diagramId,false);
  assert.equal((await libraryState(raw.diagramId))?.trashed,false);
  for(const command of sent){assert.ok((command.input.Key||command.input.Prefix).startsWith('library/state/'));assert.ok(command.input.ExpectedBucketOwner);}
  assert.equal(sent.find(c=>c.constructor.name==='PutObjectCommand').input.ServerSideEncryption,'AES256');
  (client as any).send=async()=>{throw Error('AccessDenied');};
  await assert.rejects(libraryState(raw.diagramId),/AccessDenied/);
  await assert.rejects(setLibraryState(raw.diagramId,true),/AccessDenied/);
  await assert.rejects(setLibraryState('../secret',true),/INVALID_ID/);
 } finally {client.send=original;process.env.VIEWER_STORAGE='mock';delete process.env.VIEWER_TRASH_ENABLED;}
});
