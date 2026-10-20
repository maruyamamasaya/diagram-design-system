'use strict';
const {createHash}=require('node:crypto');
const revision=require('../../config/library-reader-contract.json');
const policy=require('../../config/upload-size-approvals.json');
const endpoint='https://2zpp6z8zvc.execute-api.ap-northeast-1.amazonaws.com/v1/reader-contract';
function readerContract(){return {schemaVersion:'reader-contract-1.0',fingerprint:createHash('sha256').update(JSON.stringify({revision,policy})).digest('hex')};}
async function verifyDeployedReader({request=fetch}={}) {
 const expected=readerContract();
 let actual;
 try {
  const r=await request(endpoint,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(r.status!==200||!r.headers.get('content-type')?.startsWith('application/json'))throw Error();
  const text=await r.text();if(text.length>1024)throw Error();actual=JSON.parse(text);
 }catch {throw Error('READER_CONTRACT_UNAVAILABLE: publication stopped before S3 writes');}
 if(actual.schemaVersion!==expected.schemaVersion||actual.fingerprint!==expected.fingerprint)throw Error('READER_CONTRACT_MISMATCH: deploy the reviewed reader contract before publication');
 return expected;
}
module.exports={readerContract,verifyDeployedReader};
