import {GetObjectCommand,PutObjectCommand,ListObjectsV2Command,DeleteObjectCommand,GetBucketVersioningCommand} from '@aws-sdk/client-s3';
import {catalog,s3,summary,invalidateCatalog,legacyLibraryState} from './store';
import {config,error} from './config';
import {target} from './manifest';
import {LibraryLifecycle,lifecycleID,validateLifecycleEntry,type LifecycleEntry,type LifecyclePort} from './lifecycle';
import {DocumentLock} from '../../../src/upload/document-lock.cjs';
const prefix='library/lifecycle/';
const owner={Bucket:target.bucket,ExpectedBucketOwner:target.expectedBucketOwner};
export class S3LifecyclePort implements LifecyclePort {
  async exclusive<T>(id:string,kind:'move'|'delete',ownerID:string,action:()=>Promise<T>):Promise<T> {
    const locks=new DocumentLock(s3(),target);
    try{await locks.acquire(id,kind,ownerID);}catch(e){if((e as Error).message==='DOCUMENT_BUSY')error(409,'DOCUMENT_BUSY');throw e;}
    try{const result=await action();await locks.release(id,kind,ownerID);return result;}
    catch(e){if((await this.read(id))?.entry.status!=='deleting')await locks.release(id,kind,ownerID);throw e;}
  }
  async read(id:string) {
    const key=prefix+lifecycleID(id)+'.json';
    const listing=await s3().send(new ListObjectsV2Command({...owner,Prefix:key,MaxKeys:1}));
    if((listing.Contents??[]).some(o=>o.Key===key))return this.readKnown(id);
    return this.readLegacy(id);
  }
  private async readKnown(id:string) {
    try {
      const r=await s3().send(new GetObjectCommand({...owner,Key:prefix+lifecycleID(id)+'.json'}));
      if(!r.ETag||!r.ContentLength||r.ContentLength>262144||r.ServerSideEncryption!=='AES256')error(409,'INVALID_LIFECYCLE');
      const bytes=await r.Body!.transformToByteArray();if(bytes.length>262144)error(409,'INVALID_LIFECYCLE');
      return {entry:validateLifecycleEntry(JSON.parse(Buffer.from(bytes).toString('utf8')),id),etag:r.ETag};
    }catch(e){if((e as {name?:string}).name!=='NoSuchKey')throw e;error(409,'LIFECYCLE_CHANGED');}
  }
  private async readLegacy(id:string) {
    const legacy=await legacyLibraryState(id);
    if(!legacy?.trashed)return null;
    const manifests=(await catalog()).filter(m=>m.diagramId===id);
    if(!manifests.length)error(409,'LEGACY_TRASH_NOT_IN_CATALOG');
    const document=summary(manifests.reduce((a,b)=>a.version>b.version?a:b));
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
          const row=await this.readKnown(id);if(!row)error(409,'LIFECYCLE_CHANGED');return row.entry;
        })));
      }
      continuation=page.NextContinuationToken;
    }while(continuation);
    // Preserve pre-existing shared trash without rewriting its state files.
    // The first explicit edit creates a CAS-protected entry in the new namespace.
    const known=new Set(entries.map(e=>e.id));let legacyCursor:string|undefined;
    const manifests=await catalog();
    do{
      const page=await s3().send(new ListObjectsV2Command({...owner,Prefix:'library/state/',MaxKeys:500,ContinuationToken:legacyCursor}));
      for(const object of page.Contents??[]) {
        const match=/^library\/state\/([a-f0-9-]{36})\.json$/.exec(object.Key??'');if(!match)error(409,'INVALID_LIBRARY_STATE');
        const id=lifecycleID(match[1]);if(known.has(id))continue;
        const r=await s3().send(new GetObjectCommand({...owner,Key:object.Key}));
        if(!r.ContentLength||r.ContentLength>4096||r.ServerSideEncryption!=='AES256')error(409,'INVALID_LIBRARY_STATE');
        const data=await r.Body!.transformToByteArray();if(data.length>4096)error(409,'INVALID_LIBRARY_STATE');
        const state=JSON.parse(Buffer.from(data).toString('utf8'));
        if(state.schemaVersion!=='library-state-1.0'||state.id!==id||typeof state.trashed!=='boolean'||Object.keys(state).length!==4||!Number.isFinite(Date.parse(state.updatedAt)))error(409,'INVALID_LIBRARY_STATE');
        if(state.trashed){const versions=manifests.filter(m=>m.diagramId===id);if(!versions.length)error(409,'LEGACY_TRASH_NOT_IN_CATALOG');entries.push({id,document:summary(versions.reduce((a,b)=>a.version>b.version?a:b)),revision:1,status:'trashed',updatedAt:state.updatedAt});}
        if(entries.length>500)error(503,'LIFECYCLE_CAPACITY');
      }
      legacyCursor=page.NextContinuationToken;
      if(page.IsTruncated&&!legacyCursor)error(409,'INVALID_PAGINATION');
    }while(legacyCursor);
    return entries;
  }
  async compareAndSwap(id:string,etag:string|null,entry:LifecycleEntry) {
    validateLifecycleEntry(entry,id);
    const body=JSON.stringify(entry);if(Buffer.byteLength(body)>262144)error(413,'LIFECYCLE_CAPACITY');
    try{await s3().send(new PutObjectCommand({...owner,Key:prefix+id+'.json',Body:body,ContentType:'application/json',ServerSideEncryption:'AES256',...(etag&&etag!=='legacy'?{IfMatch:etag}:{IfNoneMatch:'*'})}));}
    catch(e){if((e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===412)error(409,'LIFECYCLE_CONFLICT');throw e;}
  }
  async documents(id:string) {
    lifecycleID(id);invalidateCatalog();const manifests=(await catalog()).filter(m=>m.diagramId===id);if(!manifests.length)error(404,'NOT_FOUND');
    const latest=manifests.reduce((a,b)=>a.version>b.version?a:b);
    const keys:string[]=[];let sizeBytes=0;
    // Include interrupted uploads, whose files have no published catalog marker.
    // The digest displayed for confirmation covers the complete remote allowlist.
    for(const area of ['diagrams','catalog']) {
      const base=`library/${area}/${id}/versions/`;let continuation:string|undefined;
      do{
        const r=await s3().send(new ListObjectsV2Command({...owner,Prefix:base,MaxKeys:1000,ContinuationToken:continuation}));
        for(const object of r.Contents??[]) {
          const relative=object.Key?.slice(base.length);
          if(!relative||!/^\d{6}\/(diagram\.(svg|png|pdf)|input\.json|validation\.json|metadata\.json|upload-manifest\.json|document\.pdf|presentation\.pptx|slides\/\d{3}\/slide\.png)$/.test(relative)||!Number.isSafeInteger(object.Size)||object.Size!<0)error(409,'INVALID_DELETE_KEYS');
          keys.push(object.Key!);sizeBytes+=object.Size!;
          if(keys.length>10000)error(503,'DELETE_CAPACITY');
        }
        continuation=r.NextContinuationToken;
        if(r.IsTruncated&&!continuation)error(409,'INVALID_PAGINATION');
      }while(continuation);
    }
    keys.sort();
    return {document:summary(latest),keys,sizeBytes};
  }
  async remove(key:string) {
    if(!/^library\/(diagrams|catalog)\/[a-f0-9-]{36}\/versions\/[0-9]{6}\/[A-Za-z0-9._/-]+$/.test(key)||key.includes('..'))error(409,'INVALID_DELETE_KEYS');
    // Hard deletion of versioned buckets requires a different, explicitly reviewed
    // version-ID plan. Never report a delete marker as permanent removal.
    const versioning=await s3().send(new GetBucketVersioningCommand(owner));
    if(versioning.Status)error(409,'VERSIONED_DELETE_UNSUPPORTED');
    await s3().send(new DeleteObjectCommand({...owner,Key:key}));invalidateCatalog();
  }
  async verifyRemoved(id:string) {
    lifecycleID(id);
    for(const area of ['diagrams','catalog']) {
      const r=await s3().send(new ListObjectsV2Command({...owner,Prefix:`library/${area}/${id}/versions/`,MaxKeys:1}));
      if(r.Contents?.length)error(409,'UNPLANNED_OBJECTS_REMAIN');
    }
  }
}
let service:LibraryLifecycle|undefined;
export function lifecycleRuntime() {
  if(process.env.VIEWER_LIFECYCLE_ENABLED!=='true')return undefined;
  if(config().storage!=='s3')error(503,'LIFECYCLE_NOT_CONFIGURED');
  return service??=new LibraryLifecycle(new S3LifecyclePort());
}
