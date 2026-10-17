import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { ApiError } from '../config';
import { CASConflict, type OrganizationStore } from './service';
import type { State } from './model';
/** Inert until explicitly constructed/injected. No default client, AWS lookup or auto-create. */
export class S3OrganizationStore implements OrganizationStore {
 constructor(private client:Pick<S3Client,'send'>,private settings:{bucket:string;expectedBucketOwner:string;key:string}) {
  if(!/^library\/organization\/v1\/[a-f0-9]{64}\/state\.json$/.test(settings.key)||!/^\d{12}$/.test(settings.expectedBucketOwner)||!settings.bucket)throw Error('Invalid organization store settings');
 }
 private check(key:string){if(key!==this.settings.key)throw new ApiError(403,'ORGANIZATION_KEY_REJECTED');}
 async read(key:string){
  this.check(key);
  const result=await this.client.send(new GetObjectCommand({Bucket:this.settings.bucket,Key:key,ExpectedBucketOwner:this.settings.expectedBucketOwner}));
  if(!result.ETag||!result.Body||(result.ContentLength??0)>16*1024*1024)throw new ApiError(503,'ORGANIZATION_STATE_INVALID');
  const body=await result.Body.transformToString();if(Buffer.byteLength(body)>16*1024*1024)throw new ApiError(503,'ORGANIZATION_CAPACITY');
  return {etag:result.ETag,state:JSON.parse(body) as State};
 }
 async put(key:string,etag:string,state:State){
  this.check(key);if(!etag)throw new ApiError(503,'ORGANIZATION_ETAG_MISSING');
  const body=JSON.stringify(state);if(Buffer.byteLength(body)>16*1024*1024)throw new ApiError(503,'ORGANIZATION_CAPACITY');
  try {await this.client.send(new PutObjectCommand({Bucket:this.settings.bucket,Key:key,ExpectedBucketOwner:this.settings.expectedBucketOwner,IfMatch:etag,ServerSideEncryption:'AES256',ContentType:'application/json',Body:body}));}
  catch(e){const status=(e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode;if(status===409||status===412)throw new CASConflict();throw e;}
 }
}
