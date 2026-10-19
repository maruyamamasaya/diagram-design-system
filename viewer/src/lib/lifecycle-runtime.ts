import {GetObjectCommand,PutObjectCommand,ListObjectsV2Command,DeleteObjectCommand,GetBucketVersioningCommand} from '@aws-sdk/client-s3';
import {catalog,s3,summary,invalidateCatalog,legacyLibraryState} from './store';
import {config,error} from './config';
import {target} from './manifest';
import {LibraryLifecycle,lifecycleID,validateLifecycleEntry,type LifecycleEntry,type LifecyclePort} from './lifecycle';
const prefix='library/lifecycle/';
const owner={Bucket:target.bucket,ExpectedBucketOwner:target.expectedBucketOwner};
class S3LifecyclePort implements LifecyclePort {
  async read(id:string) {
    try {
      const r=await s3().send(new GetObjectCommand({...owner,Key:prefix+lifecycleID(id)+'.json'}));
      if(!r.ETag||!r.ContentLength||r.ContentLength>262144||r.ServerSideEncryption!=='AES256')error(409,'INVALID_LIFECYCLE');
      const bytes=await r.Body!.transformToByteArray();if(bytes.length>262144)error(409,'INVALID_LIFECYCLE');
      return {entry:validateLifecycleEntry(JSON.parse(Buffer.from(bytes).toString('utf8')),id),etag:r.ETag};
    }catch(e){if((e as {name?:string}).name!=='NoSuchKey')throw e;}
    const legacy=await legacyLibraryState(id);
    if(!legacy?.trashed)return null;
    const document=(await this.documents(id)).document;
    return {entry:{id,document,revision:1,status:'trashed' as const,updatedAt:legacy.updatedAt},etag:'legacy'};
  }
  async list() {
    const entries:LifecycleEntry[]=[];let continuation:string|undefined;
    do {
      const page=await s3().send(new ListObjectsV2Command({...owner,Prefix:prefix,ContinuationToken:continuation,MaxKeys:500}));
      const objects=page.Contents??[];
      if(entries.length+objects.length>500)error(503,'LIFECYCLE_CAPACITY');
      for(let offset=0;offset<objects.length;offset+=6) {
        entries.push(...await Promise.all(objects.slice(offset,offset+6).map(async object=>{
          const id=object.Key?.slice(prefix.length).replace(/\.json$/,'');
          if(!id||object.Key!==prefix+id+'.json')error(409,'INVALID_LIFECYCLE');
          const row=await this.read(id);if(!row)error(409,'LIFECYCLE_CHANGED');return row.entry;
        })));
      }
      continuation=page.NextContinuationToken;
    }while(continuation);
    // Preserve pre-existing shared trash without rewriting its state files.
    // The first explicit edit creates a CAS-protected entry in the new namespace.
    const ids=[...new Set((await catalog()).map(m=>m.diagramId))].filter(id=>!entries.some(e=>e.id===id));
    for(let offset=0;offset<ids.length;offset+=6) {
      for(const row of await Promise.all(ids.slice(offset,offset+6).map(id=>this.read(id))))if(row)entries.push(row.entry);
    }
    return entries;
  }
  async compareAndSwap(id:string,etag:string|null,entry:LifecycleEntry) {
    validateLifecycleEntry(entry,id);
    try{await s3().send(new PutObjectCommand({...owner,Key:prefix+id+'.json',Body:JSON.stringify(entry),ContentType:'application/json',ServerSideEncryption:'AES256',...(etag&&etag!=='legacy'?{IfMatch:etag}:{IfNoneMatch:'*'})}));}
    catch(e){if((e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===412)error(409,'LIFECYCLE_CONFLICT');throw e;}
  }
  async documents(id:string) {
    lifecycleID(id);invalidateCatalog();const manifests=(await catalog()).filter(m=>m.diagramId===id);if(!manifests.length)error(404,'NOT_FOUND');
    const latest=manifests.reduce((a,b)=>a.version>b.version?a:b);
    const keys=[...new Set(manifests.flatMap(m=>[m.catalogKey,m.catalogKey.replace('library/catalog/','library/diagrams/'),...m.files.map(f=>f.key)]))].sort();
    const sizeBytes=manifests.reduce((sum,m)=>sum+m.files.reduce((n,f)=>n+f.sizeBytes,0),0);
    return {document:summary(latest),keys,sizeBytes};
  }
  async remove(key:string) {
    // Hard deletion of versioned buckets requires a different, explicitly reviewed
    // version-ID plan. Never report a delete marker as permanent removal.
    const versioning=await s3().send(new GetBucketVersioningCommand(owner));
    if(versioning.Status)error(409,'VERSIONED_DELETE_UNSUPPORTED');
    await s3().send(new DeleteObjectCommand({...owner,Key:key}));invalidateCatalog();
  }
}
let service:LibraryLifecycle|undefined;
export function lifecycleRuntime() {
  if(process.env.VIEWER_LIFECYCLE_ENABLED!=='true')return undefined;
  if(config().storage!=='s3')error(503,'LIFECYCLE_NOT_CONFIGURED');
  return service??=new LibraryLifecycle(new S3LifecyclePort());
}
