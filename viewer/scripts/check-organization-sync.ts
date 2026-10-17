// Ephemeral loopback bridge to the real TypeScript handler. No AWS SDK/client calls.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { handle } from '../src/lib/api';
import { MemoryOrganizationStore, OrganizationService, organizationKey } from '../src/lib/organization/service';
async function main(){
 const binary=process.env.ORGANIZATION_SWIFT_BINARY;if(!binary)throw Error('ORGANIZATION_SWIFT_BINARY is required');
 const issuer='https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_LocalTest',libraryID='51515151-1234-4567-89AB-0123456789AB';
 Object.assign(process.env,{VIEWER_AUTH_MODE:'oidc',VIEWER_STORAGE:'s3',VIEWER_ORIGIN:'https://api.example',VIEWER_SECRET:'t'.repeat(64),VIEWER_OIDC_ISSUER:issuer,VIEWER_OIDC_CLIENT_ID:'test-client',VIEWER_OIDC_OWNER_SUB:'test-owner'});
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test';const keys=createLocalJWKSet({keys:[jwk]});
 const token=await new SignJWT({token_use:'access',client_id:'test-client',scope:'diagram-library/organization.sync'}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(issuer).setSubject('test-owner').setIssuedAt().setExpirationTime('5m').sign(privateKey);
 const store=new MemoryOrganizationStore();store.initialize(organizationKey(issuer,'test-owner'),libraryID);
 const organization=new OrganizationService(store,{issuer,sub:'test-owner',libraryID});let dropped=false;let calls=0,unchanged=0;
 const server=createServer(async(req,res)=>{
  try {
   if(req.method!=='POST'||req.url!=='/sync/limited'){res.writeHead(404).end();return;}
   const chunks:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>262144){res.writeHead(413).end();return;}chunks.push(chunk);}
   const body=Buffer.concat(chunks).toString('utf8');const input=JSON.parse(body);calls++;
   const response=await handle(new Request('https://api.example/v1/organization/sync',{method:'POST',headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},body}),'api',['organization','sync'],{oidcKeys:keys,organization});
   const text=await response.text();if(JSON.parse(text).unchangedRevision!==undefined)unchanged++;
   if(response.status===200&&input.operations?.length&&!dropped){dropped=true;res.destroy();return;}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(text);
  }catch{res.writeHead(500).end();}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
 try {
  await new Promise<void>((resolve,reject)=>{const child=spawn(binary,['smoke-typescript','http://127.0.0.1:'+port],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Swift HTTP verification failed')));});
  if(!dropped||unchanged<2||calls!==24)throw Error(`Unexpected HTTP evidence: calls=${calls}, unchanged=${unchanged}, lostACK=${dropped}`);
  console.log(`TypeScript API + Swift HTTP passed: ${calls} requests, ${unchanged} unchanged responses, JWT/scope checked, ACK loss replayed; ephemeral state discarded.`);
 } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
