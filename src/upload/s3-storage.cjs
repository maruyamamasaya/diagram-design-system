'use strict';
const {S3Client,GetBucketLocationCommand,GetPublicAccessBlockCommand,GetBucketEncryptionCommand,GetBucketOwnershipControlsCommand,GetBucketPolicyStatusCommand,ListObjectsV2Command,PutObjectCommand,GetObjectCommand}=require('@aws-sdk/client-s3');
const {fromNodeProviderChain}=require('@aws-sdk/credential-providers');
const {NodeHttpHandler}=require('@smithy/node-http-handler');
const {sha256,validateConfig}=require('./metadata.cjs');
const notFound=e=>e?.name==='NoSuchKey'||e?.name==='NotFound'||e?.$metadata?.httpStatusCode===404;
class S3Storage {
  constructor(config,{client}={}) {
    this.config=validateConfig(config);
    this.client=client||new S3Client({region:config.region,credentials:fromNodeProviderChain(config.profile?{profile:config.profile}:{}),maxAttempts:3,requestHandler:new NodeHttpHandler({connectionTimeout:5000,requestTimeout:30000})});
  }
  params(Key) {return {Bucket:this.config.bucket,ExpectedBucketOwner:this.config.expectedBucketOwner,...(Key?{Key}:{})};}
  assertKey(key) {if(!key.startsWith(`${this.config.prefix}/`)||key.includes('..')||key.includes('\\')) throw new Error('Object key outside configured prefix.');}
  async preflight() {
    const p=this.params();
    const location=await this.client.send(new GetBucketLocationCommand(p));
    if((location.LocationConstraint||'us-east-1')!==this.config.region) throw new Error('Bucket region mismatch.');
    const block=await this.client.send(new GetPublicAccessBlockCommand(p));
    if(!['BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets'].every(k=>block.PublicAccessBlockConfiguration?.[k]===true)) throw new Error('All four bucket public access blocks must be enabled.');
    const ownership=await this.client.send(new GetBucketOwnershipControlsCommand(p));
    if(!ownership.OwnershipControls?.Rules?.some(r=>r.ObjectOwnership==='BucketOwnerEnforced')) throw new Error('BucketOwnerEnforced is required.');
    const encryption=await this.client.send(new GetBucketEncryptionCommand(p));
    if(!encryption.ServerSideEncryptionConfiguration?.Rules?.every(r=>r.ApplyServerSideEncryptionByDefault?.SSEAlgorithm==='AES256')||!encryption.ServerSideEncryptionConfiguration.Rules.length) throw new Error('Bucket default encryption must be SSE-S3; existing KMS buckets are not modified or downgraded.');
    try {const policy=await this.client.send(new GetBucketPolicyStatusCommand(p));if(policy.PolicyStatus?.IsPublic!==false) throw new Error('Bucket policy is public or unknown.');} catch(e) {if(e.name!=='NoSuchBucketPolicy') throw e;}
    return {region:this.config.region,publicAccessBlocked:true,ownership:'BucketOwnerEnforced',encryption:'AES256'};
  }
  async read(key) {
    this.assertKey(key);
    let response;
    try {response=await this.client.send(new GetObjectCommand(this.params(key)));} catch(e) {if(notFound(e)) return null;throw e;}
    // Consume/discard every response stream, including rejected oversized responses.
    if(response.ContentLength>64*1024*1024) {response.Body?.destroy?.();throw new Error('Remote object exceeds size limit.');}
    const bytes=Buffer.from(await response.Body.transformToByteArray());
    return {bytes,contentType:response.ContentType,encryption:response.ServerSideEncryption,versionId:response.VersionId};
  }
  async checkCapacity(metadata) {
    const prefix=`${this.config.prefix}/catalog/${metadata.diagramId}/versions/`;
    let token,count=0;
    do {
      const response=await this.client.send(new ListObjectsV2Command({...this.params(),Prefix:prefix,MaxKeys:1000,...(token?{ContinuationToken:token}:{})}));
      count+=(response.Contents||[]).filter(o=>o.Key.endsWith('/metadata.json')).length;
      if(count>=(this.config.maxVersions||3)) throw new Error('Version retention limit reached. Review old versions and obtain deletion approval before uploading another version.');
      token=response.IsTruncated?response.NextContinuationToken:null;
      if(response.IsTruncated&&!token) throw new Error('Invalid S3 pagination response.');
    } while(token);
  }
  async verify(key,bytes,contentType) {
    const existing=await this.read(key);
    if(!existing||existing.bytes.length!==bytes.length||sha256(existing.bytes)!==sha256(bytes)||existing.contentType!==contentType||existing.encryption!=='AES256') throw new Error(`Remote verification failed or conflicting object: ${key}`);
    return {key,sha256:sha256(bytes),sizeBytes:bytes.length,versionId:existing.versionId||null};
  }
  async write(key,bytes,contentType) {
    this.assertKey(key);
    if(!this.config.approved) throw new Error('Destination approval is required before writes.');
    const checksum=Buffer.from(sha256(bytes),'hex').toString('base64');
    try {await this.client.send(new PutObjectCommand({...this.params(key),Body:bytes,ContentType:contentType,IfNoneMatch:'*',ServerSideEncryption:'AES256',ChecksumSHA256:checksum,CacheControl:'private, no-store'}));}
    catch(e) {if(e.name!=='PreconditionFailed'&&e.$metadata?.httpStatusCode!==412) throw e;}
    // Also handles a successful write whose response was lost and returned 412 on SDK retry.
    return this.verify(key,bytes,contentType);
  }
  close() {this.client.destroy?.();}
}
module.exports={S3Storage};
