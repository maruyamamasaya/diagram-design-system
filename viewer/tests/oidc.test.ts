import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair, SignJWT, createLocalJWKSet, exportJWK} from 'jose';
import {oidcPrincipal} from '../src/lib/oidc';
import {handle} from '../src/lib/api';
import type {Manifest} from '../src/lib/manifest';
process.env.VIEWER_OIDC_ISSUER='https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Test';
process.env.VIEWER_OIDC_CLIENT_ID='ios-client';
process.env.VIEWER_OIDC_OWNER_SUB='owner';
test('Cognito signature, issuer, client, expiry, access scope and owner authorization',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const jwk=await exportJWK(publicKey);jwk.kid='test';
 const keys=createLocalJWKSet({keys:[jwk]});
 async function req(claims: Record<string,unknown>={},issuer=process.env.VIEWER_OIDC_ISSUER!,expiry='5m') {
  const token=await new SignJWT({token_use:'access',client_id:'ios-client',scope:'diagram-library/read',...claims}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(issuer).setSubject(String(claims.sub||'owner')).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  return new Request('https://api.example/v1/diagrams',{headers:{Authorization:'Bearer '+token}});
 }
 assert.equal((await oidcPrincipal(await req(),keys)).sub,'owner');
 process.env.VIEWER_AUTH_MODE='oidc';process.env.VIEWER_STORAGE='s3';process.env.VIEWER_ORIGIN='https://api.example';process.env.VIEWER_SECRET='a'.repeat(64);
 let reads=0;
 const fixture: Manifest = {diagramId:'37386704-778e-41a5-a0f6-71e6e64cdf24',title:'Owner diagram',diagramType:'roadmap',version:1,createdAt:'',updatedAt:'',outputFormats:['png'],files:[],validation:{checks:{}},pageCount:1,storage:{bucket:'',region:'',expectedBucketOwner:'',prefix:'',encryption:''},catalogKey:''};
 const dependencies={oidcKeys: keys,catalog:async()=>{reads++;return [fixture];}};
 const list=await handle(await req(),'api',['diagrams'],dependencies);
 assert.equal(list.status,200);assert.equal((await list.json()).items[0].id,fixture.diagramId);assert.equal(reads,1);
 const denied=await handle(await req({sub:'other'}),'api',['diagrams'],dependencies);
 assert.equal(denied.status,404);assert.equal(reads,1);
 const identity=await handle(await req(),'api',['me'],dependencies);assert.equal((await identity.json()).subject,'owner');
 for(const claims of [{token_use:'id'},{client_id:'other'},{scope:'openid'}]) await assert.rejects(oidcPrincipal(await req(claims),keys),{status:401});
 await assert.rejects(oidcPrincipal(await req({},'https://evil.example'),keys),{status:401});
 await assert.rejects(oidcPrincipal(await req({},undefined,'-1s'),keys),{status:401});
 await assert.rejects(oidcPrincipal(await req({sub:'other'}),keys),{status:404});
 await assert.rejects(oidcPrincipal(new Request('https://api.example'),keys),{status:401});
});
test('public API blocks password, cookie, mock artifact and unauthenticated listing before S3',async()=>{
 process.env.VIEWER_AUTH_MODE='oidc';process.env.VIEWER_STORAGE='s3';process.env.VIEWER_ORIGIN='https://api.example';process.env.VIEWER_SECRET='a'.repeat(64);
 for(const mode of ['web','artifact'] as const) assert.equal((await handle(new Request('https://api.example/'),mode)).status,404);
 assert.equal((await handle(new Request('https://api.example/v1/auth/token',{method:'POST'}),'api',['auth','token'])).status,404);
 assert.equal((await handle(new Request('https://api.example/v1/diagrams'),'api',['diagrams'])).status,401);
});
