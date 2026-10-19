import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MonthlyBillingService, fetchMonthlyBilling, billingPeriod, validateBillingState, usdUnits, BILLING_INTERVAL_MS, type BillingPort, type BillingState, type CostQuery} from '../src/lib/monthly-billing';
import {S3BillingPort, monthlyBillingRuntime} from '../src/lib/monthly-billing-runtime';
import {s3} from '../src/lib/store';
import {handle} from '../src/lib/api';
import {createSession, token} from '../src/lib/auth';
import {randomBytes, scryptSync} from 'node:crypto';
const when = new Date('2026-10-19T00:00:00Z');
function page(query: CostQuery, amount='0.100000000001') {
  return {ResultsByTime:[{TimePeriod:query.TimePeriod,Estimated:true,Groups:[{Keys:['Amazon Simple Storage Service','APN1-DataTransfer-Out-Bytes'],Metrics:{UnblendedCost:{Amount:amount,Unit:'USD'}}}]}]};
}
class MemoryPort implements BillingPort {
  stored: {state: BillingState; etag: string}|null=null; calls:CostQuery[]=[]; writes=0; failQuery=false; failCommit=false;
  async read() {return this.stored && structuredClone(this.stored);}
  async write(state:BillingState, etag:string|null) {
    if ((this.stored?.etag??null)!==etag) return false;
    if(this.failCommit && state.report) throw Error('S3 unavailable');
    const next=String(++this.writes); this.stored={state:structuredClone(state),etag:next}; return next;
  }
  async query(query:CostQuery) {this.calls.push(query);if(this.failQuery)throw Error('CE unavailable');return page(query);}
}
test('two allocation queries preserve service/usage rows, exact decimals, credits and UTC period', async()=>{
  const port=new MemoryPort(); const report=await fetchMonthlyBilling(port,when);
  assert.equal(port.calls.length,2);
  assert.deepEqual(port.calls[0].Filter.And[1],{Tags:{Key:'Project',Values:['diagram-design-system'],MatchOptions:['EQUALS']}});
  assert.deepEqual(port.calls[1].Filter.And[1],{Tags:{Key:'Project',MatchOptions:['ABSENT']}});
  assert.deepEqual(port.calls[0].TimePeriod,{Start:'2026-10-01',End:'2026-10-20'});
  assert.deepEqual(port.calls[0].Filter.And[0],{Dimensions:{Key:'LINKED_ACCOUNT',Values:['676643701781']}});
  assert.equal(report.diagramUSD,'0.100000000001');assert.equal(report.commonUSD,'0.100000000001');
  assert.equal(report.estimated,true);assert.equal(usdUnits('-0.000000000001'),-1n);
  assert.deepEqual(billingPeriod(new Date('2026-10-31T23:59:59Z')),{month:'2026-10',start:'2026-10-01',end:'2026-11-01'});
  port.query=async query=>page(query,'-0.125');
  assert.equal((await fetchMonthlyBilling(port,when)).diagramUSD,'-0.125000000000');
});
test('independent concurrent Lambda workers reserve once; persistent cache survives service restarts and many reads', async()=>{
  const port=new MemoryPort();
  const responses=await Promise.all(Array.from({length:20},()=>new MonthlyBillingService(port,()=>when).get()));
  assert.ok(responses.some(x=>x.status==='ready'));assert.equal(port.calls.length,2);
  for(let i=0;i<50;i++)assert.equal((await new MonthlyBillingService(port,()=>when).get()).status,'ready');
  assert.equal(port.calls.length,2); assert.equal(port.writes,2);
  assert.equal(port.stored!.state.nextRefreshAt,new Date(when.getTime()+BILLING_INTERVAL_MS).toISOString());
});
test('failure/commit failure never retry paid calls during a week; current-month old report survives failures',async()=>{
  for(const commit of [false,true]) {
    const port=new MemoryPort();port.failQuery=!commit;port.failCommit=commit;
    assert.equal((await new MonthlyBillingService(port,()=>when).get()).status,'pending');
    const count=port.calls.length;assert.equal(count,commit?2:1);
    for(let i=0;i<5;i++)await new MonthlyBillingService(port,()=>when).get();
    assert.equal(port.calls.length,count);assert.equal(port.stored!.state.report,undefined);
  }
  const port=new MemoryPort(); await new MonthlyBillingService(port,()=>when).get(); const old=port.stored!.state.report;
  port.failQuery=true;
  const later=new Date(when.getTime()+BILLING_INTERVAL_MS+1);
  assert.deepEqual((await new MonthlyBillingService(port,()=>later).get()).report,old);
  assert.equal(port.calls.length,3);
});
test('month rollover never labels prior-month costs as current or bypasses seven-day reservation',async()=>{
  const port=new MemoryPort();const last=new Date('2026-10-31T00:00:00Z');
  await new MonthlyBillingService(port,()=>last).get();
  const value=await new MonthlyBillingService(port,()=>new Date('2026-11-01T00:00:00Z')).get();
  assert.equal(value.month,'2026-11');assert.equal(value.status,'pending');assert.equal(value.report,undefined);assert.equal(port.calls.length,2);
  await new MonthlyBillingService(port,()=>new Date('2026-11-08T00:00:00Z')).get();assert.equal(port.calls.length,4);assert.equal(port.calls[2].TimePeriod.Start,'2026-11-01');
});
test('pagination budget, loops, wrong period/unit/amount and partial results all fail closed',async()=>{
  for(const kind of ['overflow','loop','period','unit','amount','empty','duplicate']) {
    const port=new MemoryPort();port.query=async query=>{
      port.calls.push(query);const p:any=page(query);
      if(kind==='overflow'){p.NextPageToken='page'+port.calls.length;p.ResultsByTime[0].Groups[0].Keys[1]='key'+port.calls.length;}
      if(kind==='loop'){p.NextPageToken='same';p.ResultsByTime[0].Groups[0].Keys[1]='key'+port.calls.length;}
      if(kind==='period')p.ResultsByTime[0].TimePeriod={Start:'2000-01-01',End:'2000-02-01'};
      if(kind==='unit')p.ResultsByTime[0].Groups[0].Metrics.UnblendedCost.Unit='JPY';
      if(kind==='amount')p.ResultsByTime[0].Groups[0].Metrics.UnblendedCost.Amount='NaN';
      if(kind==='empty')p.ResultsByTime=[];
      if(kind==='duplicate')p.NextPageToken='next';
      return p;
    };
    assert.equal((await new MonthlyBillingService(port,()=>when).get()).status,'pending');
    assert.ok(port.calls.length<=2); assert.equal(port.stored!.state.report,undefined);
  }
});
test('cache corruption and S3 reservation failure perform zero paid calls',async()=>{
  const port=new MemoryPort();port.stored={state:{schemaVersion:1,reservation:'bad',nextRefreshAt:when.toISOString()},etag:'1'};
  await assert.rejects(new MonthlyBillingService(port,()=>when).get());assert.equal(port.calls.length,0);
  port.stored=null;port.write=async()=>{throw Error('denied');};
  await assert.rejects(new MonthlyBillingService(port,()=>when).get());assert.equal(port.calls.length,0);
  const valid=new MemoryPort();await new MonthlyBillingService(valid,()=>when).get();
  const state=valid.stored!.state;state.report!.diagramUSD='100';assert.throws(()=>validateBillingState(state));
});
test('fixed S3 key, AES256 and CAS; missing vs denied reads; oversize and conflicts',async()=>{
  const client=s3(),original=client.send; const port=new S3BillingPort();
  const state:BillingState={schemaVersion:1,reservation:'00000000-0000-4000-8000-000000000001',nextRefreshAt:when.toISOString()};
  const calls:any[]=[];
  client.send=(async(command:any)=>{calls.push(command);return {ETag:'etag'};}) as typeof client.send;
  try {
    assert.equal(await port.write(state,null),'etag');assert.equal(await port.write(state,'old'),'etag');
    assert.ok(calls.every(c=>c.input.Key==='library/billing/monthly.json'&&c.input.ServerSideEncryption==='AES256'&&c.input.ExpectedBucketOwner));
    assert.equal(calls[0].input.IfNoneMatch,'*');assert.equal(calls[1].input.IfMatch,'old');
    client.send=(async()=>{throw Object.assign(Error(),{name:'NoSuchKey'});}) as typeof client.send;assert.equal(await port.read(),null);
    client.send=(async()=>{throw Object.assign(Error(),{name:'AccessDenied'});}) as typeof client.send;await assert.rejects(port.read());
    client.send=(async()=>({ETag:'e',ContentLength:3000000,ServerSideEncryption:'AES256'})) as typeof client.send;await assert.rejects(port.read());
    client.send=(async()=>{throw {$metadata:{httpStatusCode:412}};}) as typeof client.send;assert.equal(await port.write(state,null),false);
  } finally {client.send=original;}
});
test('feature disabled and allocation pending cause no CE/S3 work; local API cannot access account billing',async()=>{
  delete process.env.VIEWER_BILLING_ENABLED;assert.equal(monthlyBillingRuntime(),undefined);
  process.env.VIEWER_BILLING_ENABLED='true';delete process.env.VIEWER_BILLING_ALLOCATION_READY;
  assert.equal((await monthlyBillingRuntime()!.get()).status,'allocationPending');
  process.env.VIEWER_SECRET=randomBytes(32).toString('hex');process.env.VIEWER_PASSWORD_HASH='test:'+scryptSync('password','test',64).toString('hex');
  process.env.VIEWER_ORIGIN='http://127.0.0.1:3000';process.env.VIEWER_OWNER='local-owner';process.env.VIEWER_STORAGE='mock';
  const url='http://127.0.0.1:3000/v1/monthly-billing';
  assert.equal((await handle(new Request(url),'api',['monthly-billing'])).status,401);
  const session=createSession();const headers={Authorization:`Bearer ${await token(session.id,session.sub)}`};
  assert.equal((await handle(new Request(url,{headers}),'api',['monthly-billing'])).status,503);
  assert.equal((await handle(new Request(url+'?refresh=true',{headers}),'api',['monthly-billing'])).status,400);
  delete process.env.VIEWER_BILLING_ENABLED;
});

test('paid CE transport signs only the fixed endpoint; no automatic retry on upstream failure',async()=>{
  const originalFetch=globalThis.fetch;
  const names=['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN'] as const;
  const previous=Object.fromEntries(names.map(key=>[key,process.env[key]]));
  process.env.AWS_ACCESS_KEY_ID='AKIATESTONLYNOTREAL00';process.env.AWS_SECRET_ACCESS_KEY='test-only-secret-not-real';delete process.env.AWS_SESSION_TOKEN;
  let requests=0;
  globalThis.fetch=(async(url:any,options:any)=>{
    requests++;assert.equal(url,'https://ce.us-east-1.amazonaws.com/');assert.equal(options.redirect,'error');
    assert.equal(options.headers['x-amz-target'],'AWSInsightsIndexService.GetCostAndUsage');
    const authorization=options.headers.authorization ?? options.headers.Authorization;
    assert.ok(authorization.includes('/us-east-1/ce/aws4_request'));assert.ok(options.signal);
    return new Response('{}',{status:503});
  }) as typeof fetch;
  try {
    const port=new S3BillingPort();
    const query:CostQuery={TimePeriod:{Start:'2026-10-01',End:'2026-10-20'},Granularity:'MONTHLY',Metrics:['UnblendedCost'],GroupBy:[],Filter:{And:[{Dimensions:{Key:'LINKED_ACCOUNT',Values:['676643701781']}},{Tags:{Key:'Project',MatchOptions:['ABSENT']}}]}};
    await assert.rejects(port.query(query,AbortSignal.timeout(1000)));assert.equal(requests,1);
  } finally {globalThis.fetch=originalFetch;for(const key of names){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});

test('public monthly billing requires owner access token/read scope before reading private shared cache',async()=>{
  const {generateKeyPair, SignJWT, createLocalJWKSet, exportJWK}=await import('jose');
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='billing-test';
  const keys=createLocalJWKSet({keys:[jwk]});
  Object.assign(process.env,{VIEWER_AUTH_MODE:'oidc',VIEWER_STORAGE:'s3',VIEWER_ORIGIN:'https://api.example',VIEWER_SECRET:'a'.repeat(64),VIEWER_OIDC_ISSUER:'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Test',VIEWER_OIDC_CLIENT_ID:'ios-client',VIEWER_OIDC_OWNER_SUB:'owner',VIEWER_BILLING_ENABLED:'true',VIEWER_BILLING_ALLOCATION_READY:'true'});
  const now=new Date();const report=await fetchMonthlyBilling(new MemoryPort(),now);
  const state:BillingState={schemaVersion:1,reservation:'00000000-0000-4000-8000-000000000001',nextRefreshAt:new Date(now.getTime()+BILLING_INTERVAL_MS).toISOString(),report};
  const body=JSON.stringify(state);let reads=0;const client=s3(),original=client.send;
  client.send=(async(command:any)=>{assert.equal(command.constructor.name,'GetObjectCommand');reads++;return {ETag:'etag',ServerSideEncryption:'AES256',ContentLength:Buffer.byteLength(body),Body:{transformToByteArray:async()=>Buffer.from(body)}};}) as typeof client.send;
  async function request(subject='owner',scope='diagram-library/read'){
    const jwt=await new SignJWT({token_use:'access',client_id:'ios-client',scope}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(process.env.VIEWER_OIDC_ISSUER!).setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    return new Request('https://api.example/v1/monthly-billing',{headers:{Authorization:'Bearer '+jwt}});
  }
  try {
    assert.equal((await handle(await request('other'),'api',['monthly-billing'],{oidcKeys:keys})).status,404);
    assert.equal((await handle(await request('owner','openid'),'api',['monthly-billing'],{oidcKeys:keys})).status,401);
    assert.equal(reads,0);
    const result=await handle(await request(),'api',['monthly-billing'],{oidcKeys:keys});
    assert.equal(result.status,200);assert.equal((await result.json()).report.diagramUSD,report.diagramUSD);assert.equal(reads,1);
  } finally {client.send=original;delete process.env.VIEWER_AUTH_MODE;delete process.env.VIEWER_BILLING_ENABLED;delete process.env.VIEWER_BILLING_ALLOCATION_READY;}
});
