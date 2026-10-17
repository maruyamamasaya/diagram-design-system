// Real local TLS + Bearer from Swift. Temporary leaf trust is scoped to the test executable.
import {createServer} from 'node:https';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {handle} from '../src/lib/api';
import {OrganizationService,MemoryOrganizationStore,organizationKey} from '../src/lib/organization/service';
async function main(){
 const binary=process.env.ORGANIZATION_SWIFT_BINARY;if(!binary)throw Error('ORGANIZATION_SWIFT_BINARY required');
 const folder=await mkdtemp(join(tmpdir(),'organization-https-'));
 try {
  await writeFile(join(folder,'openssl.cnf'),'[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n');
  execFileSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',join(folder,'key.pem'),'-out',join(folder,'cert.pem'),'-config',join(folder,'openssl.cnf')],{stdio:'ignore'});
  execFileSync('/usr/bin/openssl',['x509','-in',join(folder,'cert.pem'),'-outform','der','-out',join(folder,'cert.der')]);
  const issuer='https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_HTTPSLocal',subject='test-owner',libraryID='51515151-1234-4567-89AB-0123456789AB';
  Object.assign(process.env,{VIEWER_AUTH_MODE:'oidc',VIEWER_STORAGE:'s3',VIEWER_ORIGIN:'https://api.example',VIEWER_SECRET:'x'.repeat(64),VIEWER_OIDC_ISSUER:issuer,VIEWER_OIDC_CLIENT_ID:'local-client',VIEWER_OIDC_OWNER_SUB:subject});
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='local';const keys=createLocalJWKSet({keys:[jwk]});
  const token=(expiry:string)=>new SignJWT({token_use:'access',client_id:'local-client',scope:'diagram-library/read diagram-library/organization.sync'}).setProtectedHeader({alg:'RS256',kid:'local'}).setIssuer(issuer).setSubject(subject).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  await writeFile(join(folder,'tokens.json'),JSON.stringify({issuer,subject,bad:await token('-1s'),good:await token('5m')}),{mode:0o600});
  const store=new MemoryOrganizationStore();store.initialize(organizationKey(issuer,subject),libraryID);const organization=new OrganizationService(store,{issuer,sub:subject,libraryID});
  let batches=0,dropped=false,unauthenticated=0;const sentSizes:number[]=[],sentCounts:number[]=[];
  const server=createServer({key:await readFile(join(folder,'key.pem')),cert:await readFile(join(folder,'cert.pem'))},async(req,res)=>{
   try {
    const chunks:Buffer[]=[];for await(const c of req)chunks.push(c);const bytes=Buffer.concat(chunks),body=bytes.length?bytes.toString():undefined;
    const url='https://api.example'+req.url;const segments=new URL(url).pathname.slice(4).split('/');
    const response=await handle(new Request(url,{method:req.method,headers:{authorization:req.headers.authorization||'',...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{})}),'api',segments,{oidcKeys:keys,organization});
    let text=await response.text();if(response.status===401)unauthenticated++;
    if(req.url==='/v1/organization/bootstrap'&&response.status===200){const data=JSON.parse(text);data.maxBodyBytes=8192;text=JSON.stringify(data);}
    if(body&&JSON.parse(body).operations?.length){const n=JSON.parse(body).operations.length;sentSizes.push(bytes.length);sentCounts.push(n);if(bytes.length>8192||n>50)throw Error('batch limit');batches++;if(response.status===200&&batches===2&&!dropped){dropped=true;res.destroy();return;}}
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(text);
   }catch{res.writeHead(500).end();}
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  try {await new Promise<void>((resolve,reject)=>{const child=spawn(binary,['smoke-https','https://127.0.0.1:'+(server.address() as {port:number}).port],{env:{...process.env,ORGANIZATION_TEST_CERT:join(folder,'cert.der'),ORGANIZATION_TEST_TOKENS:join(folder,'tokens.json')},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));child.on('error',reject);child.on('exit',c=>c===0?resolve():reject(Error('HTTPS Swift test failed')));});
   const state=(await store.read(organization.key)).state;
   if(!dropped||unauthenticated!==1||state.snapshot.revision!==127||Object.keys(state.receipts).length!==127||batches<5)throw Error('unexpected TLS evidence');
   console.log(`HTTPS API passed: ${batches} changed batches, max body ${Math.max(...sentSizes)} / 8192 bytes, max operations ${Math.max(...sentCounts)} / 50; revision/receipts=127; exactly one 401; no AWS.`);
  }finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
 }finally {await rm(folder,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
