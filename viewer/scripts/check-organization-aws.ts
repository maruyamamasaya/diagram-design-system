/** Explicit, approved small synthetic test. Never loads ordinary bookshelf data. */
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Operation } from '../src/lib/organization/model';
async function main(){
 const base='../outputs/organization-sync-deployment';
 const review=JSON.parse(await fs.readFile('../outputs/organization-sync-readiness/review-20261018/review.json','utf8'));
 const config=JSON.parse(await fs.readFile(base+'/configuration-disabled.json','utf8'));
 const origin=config.Environment.Variables.VIEWER_ORIGIN;
 assert.equal(origin,'https://2zpp6z8zvc.execute-api.ap-northeast-1.amazonaws.com');
 const tokenPath='../mac-app/.build/sync-auth-check/access-token';
 const token=await fs.readFile(tokenPath,'utf8');assert.ok(token.length>50);
 let requests=0;
 async function http(path:string,body?:unknown){
  if(requests++)await new Promise(r=>setTimeout(r,1200)); // preserve existing stage 1 request/s
  const response=await fetch(origin+path,{method:body?'POST':'GET',redirect:'error',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,200,'HTTP '+response.status+' at '+path);return await response.json();
 }
 const bootstrap=await http('/v1/organization/bootstrap');assert.equal(bootstrap.libraryID,review.libraryID);assert.equal(bootstrap.limit,5);
 const uuid=()=>randomUUID().toUpperCase(),attemptID=uuid();
 const call=(action:string,operations?:Operation[],requestID=uuid(),knownRevision?:number)=>http('/v1/organization/sync',{action,libraryID:review.libraryID,attemptID,requestID,...(operations?{operations}:{}),...(knownRevision!==undefined?{knownRevision}:{})});
 assert.ok((await call('begin')).admission.permit);
 const initial=await call('sync',[]);assert.equal(initial.reply.snapshot.revision,0);assert.deepEqual(initial.reply.snapshot.records,{});
 const folderID=uuid(),key='folder/'+folderID.toLowerCase();
 const create:Operation={id:uuid(),key,expectedRevision:0,value:{folder:{_0:{id:folderID,name:'同期検証（合成データ）'}}}};
 const requestID=uuid();const first=await call('sync',[create],requestID);assert.equal(first.reply.receipts[0].disposition,'accepted');
 const replay=await call('sync',[create],requestID);assert.equal(replay.reply.snapshot.revision,1);
 const stale:Operation={id:uuid(),key,expectedRevision:0,value:{folder:{_0:{id:folderID,name:'競合検証'}}}};
 assert.equal((await call('sync',[stale])).reply.receipts[0].disposition,'conflict');
 const rename:Operation={id:uuid(),key,expectedRevision:1,value:{folder:{_0:{id:folderID,name:'同期検証済み'}}}};
 assert.equal((await call('sync',[rename])).reply.receipts[0].disposition,'accepted');
 const remove:Operation={id:uuid(),key,expectedRevision:2,value:{deleted:{}}};
 const removed=await call('sync',[remove]);assert.equal(removed.reply.receipts[0].disposition,'accepted');assert.deepEqual(removed.reply.snapshot.records[key].value,{deleted:{}});
 assert.equal((await call('sync',[],uuid(),3)).unchangedRevision,3);
 await call('finish');
 await fs.writeFile(base+'/small-https-test.json',JSON.stringify({passed:true,requests,revision:3,receipts:4,activeRecords:0,syntheticFolderID:folderID,quotaStarts:1,note:'Real Cognito Mac public client token and public HTTPS API to Lambda/S3; no ordinary bookshelf data loaded; tombstone/receipts retained.'},null,2));
 await fs.unlink(tokenPath);
 console.log('Real authenticated HTTPS passed: bootstrap, initial fetch, create, same-ID replay, stale conflict, rename, deletion, unchanged, finish. Zero active synthetic records; token removed.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
