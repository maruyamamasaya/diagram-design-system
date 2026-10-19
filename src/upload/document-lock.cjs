'use strict';
const {randomUUID}=require('node:crypto');
const {GetObjectCommand,PutObjectCommand,ListObjectsV2Command}=require('@aws-sdk/client-s3');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
// No expiry: a crashed publisher cannot wake up after its lease was stolen.
// Recovery is explicit after confirming that the previous process has stopped.
class DocumentLock {
  constructor(client,target){this.client=client;this.target=target;}
  params(id){if(!UUID.test(id))throw Error('INVALID_DOCUMENT_ID');return {Bucket:this.target.bucket,ExpectedBucketOwner:this.target.expectedBucketOwner,Key:`${this.target.prefix}/document-locks/${id}.json`};}
  async read(id){
    const params=this.params(id);
    const listing=await this.client.send(new ListObjectsV2Command({Bucket:params.Bucket,ExpectedBucketOwner:params.ExpectedBucketOwner,Prefix:params.Key,MaxKeys:1}));
    if(!(listing.Contents??[]).some(o=>o.Key===params.Key))return null;
    let r;try{r=await this.client.send(new GetObjectCommand(this.params(id)));}catch(e){if(e.name==='NoSuchKey')return null;throw e;}
    if(!r.ETag||!r.ContentLength||r.ContentLength>4096||r.ServerSideEncryption!=='AES256')throw Error('INVALID_DOCUMENT_LOCK');
    const bytes=await r.Body.transformToByteArray();if(bytes.length>4096)throw Error('INVALID_DOCUMENT_LOCK');
    const value=JSON.parse(Buffer.from(bytes).toString('utf8'));
    if(value.schemaVersion!==1||value.id!==id||typeof value.held!=='boolean'||!['upload','delete','move'].includes(value.kind)||typeof value.owner!=='string'||!value.owner||value.owner.length>128)throw Error('INVALID_DOCUMENT_LOCK');
    return {value,etag:r.ETag};
  }
  async put(id,value,etag){
    await this.client.send(new PutObjectCommand({...this.params(id),Body:JSON.stringify(value),ContentType:'application/json',ServerSideEncryption:'AES256',...(etag?{IfMatch:etag}:{IfNoneMatch:'*'})}));
  }
  async acquire(id,kind,owner=String(randomUUID())){
    if(!['upload','delete','move'].includes(kind)||typeof owner!=='string'||!owner||owner.length>128)throw Error('INVALID_DOCUMENT_LOCK');
    const old=await this.read(id);
    if(old?.value.held){if(['delete','move'].includes(kind)&&old.value.kind===kind&&old.value.owner===owner)return owner;throw Error('DOCUMENT_BUSY');}
    const value={schemaVersion:1,id,kind,owner,held:true};
    try{await this.put(id,value,old?.etag);}catch(e){
      // Only our unique operation can be recovered after a lost PUT acknowledgement.
      const current=await this.read(id);
      if(current?.value.held&&current.value.owner===owner&&current.value.kind===kind)return owner;
      if(e.$metadata?.httpStatusCode===412)throw Error('DOCUMENT_BUSY');throw e;
    }
    return owner;
  }
  async release(id,kind,owner){
    const current=await this.read(id);
    if(!current||current.value.owner!==owner||current.value.kind!==kind)throw Error('DOCUMENT_LOCK_LOST');
    if(!current.value.held)return;
    await this.put(id,{...current.value,held:false},current.etag);
  }
}
module.exports={DocumentLock};
