import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {s3,catalog,catalogWarnings,invalidateCatalog,find} from '../src/lib/store';
process.env.VIEWER_SECRET='a'.repeat(64);process.env.VIEWER_STORAGE='s3';
test('one unreadable marker is isolated while valid catalog and direct reads remain available',async()=>{
 const good=JSON.parse(fs.readFileSync('.local/mock/presentation/metadata.json','utf8'));
 const badKey=good.catalogKey.replace('/000001/','/000002/');
 const client=s3();const old=client.send;
 (client as any).send=async(command:any)=>{
  switch(command.constructor.name){
   case 'GetBucketLocationCommand':return {LocationConstraint:'ap-northeast-1'};
   case 'GetPublicAccessBlockCommand':return {PublicAccessBlockConfiguration:{BlockPublicAcls:true,IgnorePublicAcls:true,BlockPublicPolicy:true,RestrictPublicBuckets:true}};
   case 'GetBucketOwnershipControlsCommand':return {OwnershipControls:{Rules:[{ObjectOwnership:'BucketOwnerEnforced'}]}};
   case 'GetBucketEncryptionCommand':return {ServerSideEncryptionConfiguration:{Rules:[{ApplyServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}]}};
   case 'GetBucketPolicyStatusCommand':return {PolicyStatus:{IsPublic:false}};
   case 'ListObjectsV2Command':return {Contents:[{Key:good.catalogKey},{Key:badKey}],IsTruncated:false};
   case 'GetObjectCommand':{
    const data=Buffer.from(command.input.Key===badKey?'{broken':JSON.stringify(good));
    return {ContentLength:data.length,ServerSideEncryption:'AES256',LastModified:new Date(),Body:{transformToByteArray:async()=>data}};
   }
   default:throw Error('Unexpected S3 command');
  }
 };
 try{invalidateCatalog();const items=await catalog();assert.equal(items.length,1);assert.equal(items[0].diagramId,good.diagramId);assert.deepEqual(catalogWarnings(),[{id:good.diagramId,version:2,code:'INVALID_MANIFEST'}]);assert.ok(!JSON.stringify(catalogWarnings()).includes('library/'));}
 finally{client.send=old;invalidateCatalog();}
});
