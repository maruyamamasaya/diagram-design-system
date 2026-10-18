import { test } from 'node:test';
import assert from 'node:assert/strict';
import { organizationRuntime } from '../src/lib/organization/runtime';
import { organizationKey } from '../src/lib/organization/service';
test('deployment flag is inert; enabled configuration fails closed; fixed key and SDK retry budget', async () => {
 const names=['VIEWER_ORGANIZATION_ENABLED','VIEWER_AUTH_MODE','VIEWER_STORAGE','VIEWER_OIDC_ISSUER','VIEWER_OIDC_CLIENT_ID','VIEWER_OIDC_OWNER_SUB','VIEWER_ORGANIZATION_BUCKET','VIEWER_ORGANIZATION_BUCKET_OWNER','VIEWER_ORGANIZATION_LIBRARY_ID'];
 const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try {
  delete process.env.VIEWER_ORGANIZATION_ENABLED;
  assert.equal(organizationRuntime(),undefined);
  process.env.VIEWER_ORGANIZATION_ENABLED='true';
  process.env.VIEWER_AUTH_MODE='password';
  assert.throws(()=>organizationRuntime());
  Object.assign(process.env,{VIEWER_AUTH_MODE:'oidc',VIEWER_STORAGE:'s3',VIEWER_OIDC_ISSUER:'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Test',VIEWER_OIDC_CLIENT_ID:'ios',VIEWER_OIDC_OWNER_SUB:'test-owner',VIEWER_ORGANIZATION_BUCKET:'test-bucket',VIEWER_ORGANIZATION_BUCKET_OWNER:'123456789012',VIEWER_ORGANIZATION_LIBRARY_ID:'11111111-1111-1111-1111-111111111111'});
  let sends=0;
  const service=organizationRuntime(process.env,{send:async()=>{sends++;throw Error('not initialized');}} as any)!;
  assert.equal(sends,0);
  assert.equal(service.key,organizationKey(process.env.VIEWER_OIDC_ISSUER!, 'test-owner'));
  assert.equal((await service.handle(new Request('https://api.example/v1/organization/bootstrap'),{issuer:process.env.VIEWER_OIDC_ISSUER!,sub:'test-owner'},'organization/bootstrap')).status,200);
  assert.equal(sends,0);
  process.env.VIEWER_ORGANIZATION_LIBRARY_ID='invalid';assert.throws(()=>organizationRuntime());
 } finally {for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}}
});
