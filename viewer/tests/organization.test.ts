import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { handle } from '../src/lib/api';
import { createHandler } from '../src/lambda';
import { decodeRequest, emptyState, transition, type WireRequest, type State } from '../src/lib/organization/model';
import { CASConflict, MemoryOrganizationStore, OrganizationService, organizationKey, type OrganizationStore } from '../src/lib/organization/service';
import { S3OrganizationStore } from '../src/lib/organization/s3-store';
const libraryID='51515151-1234-4567-89AB-0123456789AB';
const issuer='https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Test';
const owner={issuer,sub:'owner',libraryID};
const id=(n:number)=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const key=organizationKey(issuer,'owner');
const fixtureRoot=resolve('tests/fixtures/organization');

function normalized(x:any):any { if(Array.isArray(x))return x.map(normalized);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='challenge'?'generated-challenge':normalized(v)]));return x; }
function runFixture(fixture:any) {
 let state=emptyState(libraryID);const outputs:any[]=[];let serial=900000;const nonce=()=>id(serial++);
 for(const step of fixture.steps){const request=decodeRequest(step.request);if(step.consentFromStep!==undefined)request.consent=outputs[step.consentFromStep].body.admission?.quota.challenge;
  try {const next=transition(state,request,step.now,nonce);state=JSON.parse(JSON.stringify(next.state));outputs.push({status:next.status,body:next.body,...(next.error?{error:next.error}:{})});}
  catch {outputs.push({status:400,body:{},error:'invalidValue'});}
 }return {outputs,state};
}
test('shared fixtures: edits, conflicts, cascade deletion, receipts, quota, unchanged and budgets',()=>{
 for(const file of readdirSync(fixtureRoot)){const {outputs,state}=runFixture(JSON.parse(readFileSync(resolve(fixtureRoot,file),'utf8')));assert.ok(outputs.length>3);
  if(file==='editing.json'){
   const receipts=outputs.flatMap(o=>o.body.reply?.receipts||[]);assert.ok(receipts.some(r=>r.disposition==='conflict'));assert.ok(receipts.some(r=>r.disposition==='invalid'));assert.equal(state.snapshot.revision,13);
   assert.deepEqual(state.snapshot.records['folder-order'].value,{order:{_0:[]}});
   for(const k of ['folder/'+id(101),'folder/'+id(102),'assignment/ZG9j','collection/'+id(103)])assert.deepEqual(state.snapshot.records[k].value,{deleted:{}});
  }
  if(file==='unchanged.json'){assert.equal(outputs[1].body.unchangedRevision,0);assert.equal(outputs[4].body.unchangedRevision,1);assert.equal(outputs[7].body.unchangedRevision,2);assert.equal(outputs[9].body.failure.reason,'permit_expired');}
  if(file==='quota.json'){assert.equal(outputs[8].body.admission.quota.used,6);assert.equal(outputs[9].body.admission.quota.used,6);assert.equal(outputs[13].body.admission.quota.used,7);assert.equal(outputs[15].body.admission.quota.used,6);assert.equal(outputs[16].body.admission.quota.used,5);}
  if(file==='budget.json'){assert.equal(outputs[4].body.failure.reason,'request_budget');assert.equal(outputs.at(-1).body.failure.reason,'request_budget');}
  if(file==='replay.json'){assert.equal(state.snapshot.revision,1);assert.equal(outputs[3].status,400);assert.equal(outputs.at(-1).body.failure.reason,'request_budget');}
 }
});
test('Swift executable produces the exact same fixture responses', {skip:!process.env.ORGANIZATION_SWIFT_BINARY},()=>{
 for(const file of readdirSync(fixtureRoot)){
  const path=resolve(fixtureRoot,file),fixture=JSON.parse(readFileSync(path,'utf8'));
  const swift=spawnSync(process.env.ORGANIZATION_SWIFT_BINARY!,['conformance',path],{encoding:'utf8'});
  assert.equal(swift.status,0,swift.stderr);
  assert.deepEqual(normalized(runFixture(fixture).outputs),normalized(JSON.parse(swift.stdout)),file);
 }
});
function request(action:string,attempt=1,extra:Record<string,unknown>={}) {return {action,libraryID,attemptID:id(attempt),requestID:crypto.randomUUID().toUpperCase(),...extra};}
function setup(store:MemoryOrganizationStore=new MemoryOrganizationStore()) {store.initialize(key,libraryID);return {store,service:new OrganizationService(store,owner,()=>1000,async()=>{})};}
async function call(service:OrganizationService,body:unknown) {return service.handle(new Request('https://api.example/v1/organization/sync',{method:'POST',body:JSON.stringify(body)}),owner,'organization/sync');}
const operation=(n:number,tag:string,revision=0)=>({id:id(100+n),key:'tag/ZG9j/'+Buffer.from(tag).toString('base64'),expectedRevision:revision,value:{tag:{_0:tag}}});
test('CAS conflicts retry from latest durable state; simultaneous edits and ACK loss are idempotent',async()=>{
 const {store,service}=setup();await call(service,request('begin'));
 let first=true;const fault:OrganizationStore={read:k=>store.read(k),put:async(k,e,s)=>{await store.put(k,e,s);if(first){first=false;throw Error('lost acknowledgement');}}};
 const lossy=new OrganizationService(fault,owner,()=>1000,async()=>{});
 const body=request('sync',1,{operations:[operation(1,'a')]});await assert.rejects(call(lossy,body));
 const replay=await (await call(service,body)).json();assert.equal(replay.reply.snapshot.revision,1);assert.equal(replay.reply.receipts[0].disposition,'accepted');
 const [a,b]=await Promise.all([call(service,request('sync',1,{operations:[operation(2,'b')]})),call(service,request('sync',1,{operations:[operation(3,'c')]}))]);
 assert.equal(a.status,200);assert.equal(b.status,200);assert.equal((await store.read(key)).state.snapshot.revision,3);
 const sameKey=(n:number,value:string)=>({id:id(n),key:'group/ZG9j',expectedRevision:0,value:{group:{_0:value}}});
 const conflicts=await Promise.all([call(service,request('sync',1,{operations:[sameKey(200,'仕事')]})),call(service,request('sync',1,{operations:[sameKey(201,'私用')]}))]);
 assert.deepEqual((await Promise.all(conflicts.map(r=>r.json()))).map(r=>r.reply.receipts[0].disposition).sort(),['accepted','conflict']);
});
test('concurrent parent deletion and stale child edit cannot revive folders or assignments',async()=>{
 const {store,service}=setup();await call(service,request('begin'));
 const parent=id(301),child=id(302),folder=(n:number,folderID:string,name:string,revision=0,parentID?:string)=>({id:id(n),key:'folder/'+folderID,expectedRevision:revision,value:{folder:{_0:{id:folderID,name,...(parentID?{parentID}:{})}}}});
 await call(service,request('sync',1,{operations:[folder(400,parent,'parent'),folder(401,child,'child',0,parent),{id:id(402),key:'assignment/ZG9j',expectedRevision:0,value:{assignment:{_0:child}}}]}));
 await Promise.all([call(service,request('sync',1,{operations:[{id:id(403),key:'folder/'+parent,expectedRevision:1,value:{deleted:{}}}]})),call(service,request('sync',1,{operations:[folder(404,child,'stale',2,parent)]}))]);
 const records=(await store.read(key)).state.snapshot.records;
 for(const key of ['folder/'+parent,'folder/'+child,'assignment/ZG9j'])assert.deepEqual(records[key].value,{deleted:{}});
});
test('owner-wide CAS ledger grants five concurrent reservations, never per-device quotas',async()=>{
 const {store,service}=setup();
 const results=await Promise.all(Array.from({length:10},async(_,i)=>{const body=request('begin',i+1);const replica=new OrganizationService(store,owner,()=>1000,async()=>{});let r=await call(replica,body);while(r.status===503)r=await call(replica,body);return r;}));
 assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(results.filter(r=>r.status===429).length,5);
 assert.equal(Object.keys((await store.read(key)).state.leases).length,5);
});
test('CAS exhaustion waits; missing/corrupt state and storage failure never create a new empty library',async()=>{
 let puts=0,pauses=0;const broken:OrganizationStore={read:async()=>({etag:'1',state:emptyState(libraryID)}),put:async()=>{puts++;throw new CASConflict();}};
 const busy=new OrganizationService(broken,owner,()=>1000,async()=>{pauses++;});const r=await call(busy,request('begin'));
 assert.equal(r.status,503);assert.equal(r.headers.get('Retry-After'),'30');assert.equal(puts,3);assert.equal(pauses,2);
 const missing=new OrganizationService(new MemoryOrganizationStore(),owner);await assert.rejects(call(missing,request('begin')),{code:'ORGANIZATION_STATE_MISSING'});
 const corrupt=new OrganizationService({read:async()=>({etag:'1',state:{...emptyState(libraryID),schemaVersion:2} as unknown as State}),put:async()=>{assert.fail('must not overwrite');}},owner);await assert.rejects(call(corrupt,request('begin')),{code:'ORGANIZATION_STATE_INVALID'});
});
test('snapshot and stored-state capacity checks never commit a partial transition',async()=>{
 const snapshotState=emptyState(libraryID);snapshotState.snapshot.revision=1;
 snapshotState.leases[id(1)]={permit:{id:id(1),expiresAt:2000},startedAt:1000,closed:false,requests:{}};
 for(let i=0;i<6000;i++)snapshotState.snapshot.records['folder/'+id(1000+i)]={revision:1,value:{folder:{_0:{id:id(1000+i),name:'f'.repeat(120)}}}};
 let writes=0;
 const readOnly=(state:State):OrganizationStore=>({read:async()=>({etag:'1',state:structuredClone(state)}),put:async()=>{writes++;}});
 const service=new OrganizationService(readOnly(snapshotState),owner,()=>1000);
 await assert.rejects(call(service,request('sync',1,{operations:[]})),{code:'SNAPSHOT_CAPACITY'});
 const hugeState=emptyState(libraryID);
 // Receipts can accumulate without changing the visible snapshot. Synthetic size only.
 hugeState.receipts[id(199)]={operation:{...operation(99,'a'),value:{tag:{_0:'x'.repeat(17*1024*1024)}}},disposition:'invalid'};
 await assert.rejects(call(new OrganizationService(readOnly(hugeState),owner,()=>1000),request('begin')),{code:'ORGANIZATION_CAPACITY'});
 assert.equal(writes,0);
});
test('HTTP payload bounds and URL-free metadata reject input before storage',async()=>{
 const {store,service}=setup();
 for(const body of [request('sync',1,{operations:Array(51).fill(operation(1,'a'))}),request('begin',1,{sub:'evil'}),request('sync',1,{operations:[{...operation(1,'a'),value:{collection:{_0:{id:id(42),title:'unsafe',members:[{id:'doc',url:'https://example.invalid'}]}}}}]})])await assert.rejects(call(service,body));
 const tooLarge=new Request('https://api.example/v1/organization/sync',{method:'POST',body:'x'.repeat(262145)});await assert.rejects(service.handle(tooLarge,owner,'organization/sync'),{status:413});
 await assert.rejects(call(service,request('begin',1,{libraryID:id(55)})),{status:404});assert.equal(store.reads,0);
});
test('OIDC API requires sync scope, exact owner and explicit Mac client; default routes stay disabled',async()=>{
 Object.assign(process.env,{VIEWER_AUTH_MODE:'oidc',VIEWER_STORAGE:'s3',VIEWER_ORIGIN:'https://api.example',VIEWER_SECRET:'a'.repeat(64),VIEWER_OIDC_ISSUER:issuer,VIEWER_OIDC_CLIENT_ID:'ios-client',VIEWER_OIDC_OWNER_SUB:'owner',VIEWER_OIDC_ADDITIONAL_CLIENT_IDS:'mac-client'});
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='local';const keys=createLocalJWKSet({keys:[jwk]});const {store,service}=setup();
 async function req(claims:Record<string,unknown>={}) {const token=await new SignJWT({token_use:'access',client_id:'ios-client',scope:'diagram-library/organization.sync',...claims}).setProtectedHeader({alg:'RS256',kid:'local'}).setIssuer(issuer).setSubject(String(claims.sub||'owner')).setIssuedAt().setExpirationTime('5m').sign(privateKey);return new Request('https://api.example/v1/organization/sync',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(request('begin'))});}
 const deps={oidcKeys:keys,organization:service};
 assert.equal((await handle(await req(),'api',['organization','sync'],{oidcKeys:keys})).status,404);
 for(const claims of [{scope:'diagram-library/read'},{sub:'other'},{client_id:'other'},{token_use:'id'}])assert.notEqual((await handle(await req(claims),'api',['organization','sync'],deps)).status,200);
 assert.equal(store.reads,0);
 assert.equal((await handle(await req({scope:'diagram-library/read'}),'api',['organization','sync'],deps)).status,403);
 assert.equal((await handle(await req(),'api',['organization','sync'],deps)).status,200);
 assert.equal((await handle(await req({client_id:'mac-client'}),'api',['organization','sync'],deps)).status,200);
 const bootstrap=await handle(new Request('https://api.example/v1/organization/bootstrap',{headers:(await req()).headers}),'api',['organization','bootstrap'],deps);assert.equal(bootstrap.status,200);assert.equal((await bootstrap.json()).libraryID,libraryID);
 const signed=await req();
 const event={rawPath:'/v1/organization/sync',headers:Object.fromEntries(signed.headers),body:Buffer.from(await signed.text()).toString('base64'),isBase64Encoded:true,requestContext:{http:{method:'POST'}}};
 assert.equal((await createHandler(deps)(event)).statusCode,200);
 assert.equal((await createHandler()(event)).statusCode,404);
 delete process.env.VIEWER_OIDC_ADDITIONAL_CLIENT_IDS;
});
test('S3 port uses fixed owner key, expected owner, SSE-S3 and If-Match; no initialization or delete/list',async()=>{
 const commands:any[]=[];let conflict=false;
 const client={send:async(command:any)=>{commands.push(command);if(conflict)throw {$metadata:{httpStatusCode:412}};if(command instanceof GetObjectCommand)return {ETag:'"opaque"',Body:{transformToString:async()=>JSON.stringify(emptyState(libraryID))}};return {ETag:'"new"'};}} as unknown as Pick<S3Client,'send'>;
 const store=new S3OrganizationStore(client,{bucket:'test-only',expectedBucketOwner:'123456789012',key});
 const read=await store.read(key);await store.put(key,read.etag,read.state);
 assert.ok(commands[0] instanceof GetObjectCommand);assert.ok(commands[1] instanceof PutObjectCommand);
 assert.equal(commands[1].input.IfMatch,'"opaque"');assert.equal(commands[1].input.ServerSideEncryption,'AES256');assert.equal(commands[1].input.ExpectedBucketOwner,'123456789012');
 await assert.rejects(store.read('library/catalog/anything'),{status:403});assert.equal(commands.length,2);
 conflict=true;await assert.rejects(store.put(key,read.etag,read.state),CASConflict);
});
