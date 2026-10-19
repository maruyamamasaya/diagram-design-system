import {createHash} from 'node:crypto';
import {error} from './config';

export type LifecycleDocument = {id:string;title:string;type:string;version:number;formats:string[];pageCount:number;tags:string[]};
export type LifecycleEntry = {id:string;document:LifecycleDocument;revision:number;status:'active'|'trashed'|'deleting'|'deleted';updatedAt:string;plan?:DeletionPlan};
export type DeletionPlan = {id:string;revision:number;digest:string;sizeBytes:number;objectCount:number;keys:string[]};
export type LifecycleSnapshot = {schemaVersion:'library-lifecycle-1.0';entries:LifecycleEntry[]};
export interface LifecyclePort {
  read(id:string):Promise<{entry:LifecycleEntry;etag:string}|null>;
  list():Promise<LifecycleEntry[]>;
  compareAndSwap(id:string,etag:string|null,entry:LifecycleEntry):Promise<void>;
  documents(id:string):Promise<{document:LifecycleDocument;keys:string[];sizeBytes:number}>;
  remove(key:string):Promise<void>;
}
export function lifecycleID(id:string) {if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))error(400,'INVALID_ID');return id;}
export function validateLifecycleEntry(entry:LifecycleEntry,id:string) {
  lifecycleID(id);
  if(!entry||entry.id!==id||entry.document?.id!==id||!Number.isSafeInteger(entry.revision)||entry.revision<1||!['active','trashed','deleting','deleted'].includes(entry.status)||!Number.isFinite(Date.parse(entry.updatedAt)))error(409,'INVALID_LIFECYCLE');
  if(entry.status==='deleting'&&!entry.plan)error(409,'INVALID_LIFECYCLE');
  return entry;
}
function keysFor(id:string,keys:string[]) {
  const safe=keys.every(k=>!k.includes('..')&&!k.includes('\\')&&!k.includes('%')&&[ `library/diagrams/${id}/versions/`,`library/catalog/${id}/versions/`].some(prefix=>k.startsWith(prefix)));
  if(!safe||!keys.length||keys.length>10000||new Set(keys).size!==keys.length)error(409,'INVALID_DELETE_KEYS');
  return [...keys].sort();
}
function checkedPlan(plan:DeletionPlan,id:string) {
  if(!plan||plan.id!==id||!Number.isSafeInteger(plan.revision)||plan.revision<1||!Number.isSafeInteger(plan.sizeBytes)||plan.sizeBytes<0)error(409,'INVALID_DELETE_PLAN');
  const keys=keysFor(id,plan.keys);
  if(plan.objectCount!==keys.length)error(409,'INVALID_DELETE_PLAN');
  const base={id,revision:plan.revision,sizeBytes:plan.sizeBytes,objectCount:keys.length,keys};
  if(createHash('sha256').update(JSON.stringify(base)).digest('hex')!==plan.digest)error(409,'INVALID_DELETE_PLAN');
  return plan;
}
export class LibraryLifecycle {
  constructor(readonly port:LifecyclePort){}
  async snapshot():Promise<LifecycleSnapshot> {const entries=await this.port.list();if(entries.length>500)error(503,'LIFECYCLE_CAPACITY');return {schemaVersion:'library-lifecycle-1.0',entries:entries.map(e=>{validateLifecycleEntry(e,e.id);const {plan,...publicEntry}=e;void plan;return publicEntry;})};}
  async blocked(id:string) {const row=await this.port.read(lifecycleID(id));return row!=null&&row.entry.status!=='active';}
  async move(id:string,revision:number,trashed:boolean) {
    lifecycleID(id);const old=await this.port.read(id);
    if((old?.entry.revision??0)!==revision)error(409,'LIFECYCLE_CONFLICT');
    if(old&&['deleting','deleted'].includes(old.entry.status))error(409,'DELETE_IN_PROGRESS');
    const document=old?.entry.document??(await this.port.documents(id)).document;
    const next:LifecycleEntry={id,document,revision:revision+1,status:trashed?'trashed':'active',updatedAt:new Date().toISOString()};
    await this.port.compareAndSwap(id,old?.etag??null,next);return next;
  }
  async plan(id:string):Promise<DeletionPlan> {
    const old=await this.port.read(lifecycleID(id));
    if(old?.entry.status==='deleting')return checkedPlan(old.entry.plan!,id);
    if(old?.entry.status!=='trashed')error(409,'NOT_TRASHED');
    const objects=await this.port.documents(id);const keys=keysFor(id,objects.keys);
    if(!Number.isSafeInteger(objects.sizeBytes)||objects.sizeBytes<0)error(409,'INVALID_DELETE_SIZE');
    const base={id,revision:old.entry.revision,sizeBytes:objects.sizeBytes,objectCount:keys.length,keys};
    return {...base,digest:createHash('sha256').update(JSON.stringify(base)).digest('hex')};
  }
  async erase(id:string,digest:string) {
    lifecycleID(id);if(!/^[a-f0-9]{64}$/.test(digest))error(400,'INVALID_DELETE_PLAN');
    let old=await this.port.read(id);
    if(old?.entry.status==='deleted') {if(old.entry.plan?.digest!==digest)error(409,'LIFECYCLE_CONFLICT');return old.entry;}
    const plan=await this.plan(id);if(plan.digest!==digest)error(409,'DELETE_PLAN_CHANGED');
    keysFor(id,plan.keys);
    if(old?.entry.status!=='deleting') {
      const next:LifecycleEntry={...old!.entry,status:'deleting',revision:old!.entry.revision+1,updatedAt:new Date().toISOString(),plan};
      await this.port.compareAndSwap(id,old!.etag,next);
      old=await this.port.read(id);
    }
    if(old?.entry.status!=='deleting'||old.entry.plan?.digest!==digest)error(409,'LIFECYCLE_CONFLICT');
    // Each key is allowlisted from validated manifests. Failures retain the durable
    // deleting record, allowing the exact same confirmed plan to resume after restart.
    for(const key of plan.keys)await this.port.remove(key);
    const next:LifecycleEntry={...old.entry,status:'deleted',revision:old.entry.revision+1,updatedAt:new Date().toISOString()};
    await this.port.compareAndSwap(id,old.etag,next);return next;
  }
}
