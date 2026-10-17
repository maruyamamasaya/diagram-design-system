import { createHash } from 'node:crypto';
import { ApiError } from '../config';
import { decodeRequest, emptyState, ProtocolError, transition, uuid, type State } from './model';

export class CASConflict extends Error { }
export interface OrganizationStore {
 read(key: string): Promise<{etag: string; state: State}>;
 put(key: string, etag: string, state: State): Promise<void>;
}
export const organizationKey = (issuer:string,sub:string) => 'library/organization/v1/'+createHash('sha256').update(issuer+'\n'+sub).digest('hex')+'/state.json';
export class OrganizationService {
 readonly key: string;
 constructor(readonly store:OrganizationStore, readonly owner:{issuer:string;sub:string;libraryID:string}, readonly clock:()=>number=()=>Date.now()/1000-978307200, readonly pause:(attempt:number)=>Promise<void>=async attempt=>{await new Promise(r=>setTimeout(r,50*2**attempt+Math.random()*50));}) { if(!uuid(owner.libraryID)||!owner.issuer||!owner.sub)throw Error('Invalid organization owner');this.owner=Object.freeze({...owner,libraryID:owner.libraryID.toUpperCase()});this.key=organizationKey(owner.issuer,owner.sub); }
 async handle(req:Request, principal:{issuer:string;sub:string}, route:string):Promise<Response> {
  if(principal.issuer!==this.owner.issuer||principal.sub!==this.owner.sub)throw new ApiError(404,'NOT_FOUND');
  if(route==='organization/bootstrap'&&req.method==='GET')return this.response({libraryID:this.owner.libraryID,protocolVersion:1,limit:5,windowSeconds:3600,maxOperations:50});
  if(route!=='organization/sync'||req.method!=='POST')throw new ApiError(404,'NOT_FOUND');
  if(new URL(req.url).search)throw new ApiError(400,'INVALID_REQUEST');
  const declared=req.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>262144))throw new ApiError(413,'REQUEST_TOO_LARGE');
  // Stream bound prevents unbounded allocations even without Content-Length.
  const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'INVALID_REQUEST');let size=0;const chunks:Uint8Array[]=[];
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>262144){await reader.cancel();throw new ApiError(413,'REQUEST_TOO_LARGE');}chunks.push(part.value);}
  let input;
  try {input=decodeRequest(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}catch{throw new ApiError(400,'INVALID_REQUEST');}
  if(input.libraryID!==this.owner.libraryID)throw new ApiError(404,'NOT_FOUND');
  if((input.operations?.length??0)>50)throw new ApiError(413,'TOO_MANY_OPERATIONS');
  if(input.operations?.some(op=>op.value.folder?._0?.iconFile!==undefined))throw new ApiError(400,'LOCAL_ASSET_REJECTED');
  for(let attempt=0;attempt<3;attempt++) {
   const current=await this.store.read(this.key);this.validateState(current.state);
   let next;
   try {next=transition(current.state,input,this.clock());}catch(e){if(e instanceof ProtocolError)throw new ApiError(400,'INVALID_OPERATION');throw e;}
   if(Buffer.byteLength(JSON.stringify(next.state))>16*1024*1024)throw new ApiError(503,'ORGANIZATION_CAPACITY');
   if(next.body.reply&&Buffer.byteLength(JSON.stringify(next.body.reply.snapshot))>1024*1024)throw new ApiError(503,'SNAPSHOT_CAPACITY');
   if(Buffer.byteLength(JSON.stringify(next.body))>2*1024*1024)throw new ApiError(503,'RESPONSE_CAPACITY');
   try {
    // Reservations, budget and receipts share one CAS object. No memory-only counter.
    await this.store.put(this.key,current.etag,next.state);
    return this.response(next.error?{error:{code:'INVALID_OPERATION',message:'INVALID_OPERATION'}}:next.body,next.status);
   }catch(e){if(!(e instanceof CASConflict))throw e;if(attempt<2)await this.pause(attempt);}
  }
  return this.response({error:{code:'SYNC_BUSY',message:'SYNC_BUSY'}},503,{'Retry-After':'30'});
 }
 private validateState(state:State) {
  const map=(x:unknown):x is Record<string,any> => !!x&&typeof x==='object'&&!Array.isArray(x);
  const integer=(x:unknown) => Number.isSafeInteger(x)&&Number(x)>=0;
  let valid=state?.schemaVersion===1&&state.snapshot?.libraryID===this.owner.libraryID&&integer(state.snapshot.revision)&&map(state.snapshot.records)&&map(state.receipts)&&map(state.leases)&&map(state.challenges);
  if(valid) {
   valid=Object.values(state.snapshot.records).every(r=>map(r)&&integer(r.revision)&&r.revision<=state.snapshot.revision&&map(r.value)&&Object.keys(r.value).length===1)&&
    Object.entries(state.leases).every(([id,l])=>uuid(id)&&map(l)&&map(l.permit)&&l.permit.id===id&&Number.isFinite(l.startedAt)&&Number.isFinite(l.permit.expiresAt)&&typeof l.closed==='boolean'&&map(l.requests)&&Object.keys(l.requests).length<=12&&Object.entries(l.requests).every(([id,n])=>uuid(id)&&Number.isInteger(n)&&Number(n)>=1&&Number(n)<=3))&&
    Object.entries(state.challenges).every(([id,c])=>uuid(id)&&map(c)&&uuid(c.token)&&Number.isFinite(c.expiresAt))&&Object.keys(state.challenges).length<=32&&
    Object.entries(state.receipts).every(([id,r])=>uuid(id)&&map(r)&&r.operation?.id===id&&['accepted','conflict','invalid'].includes(r.disposition));
  }
  if(!valid)throw new ApiError(503,'ORGANIZATION_STATE_INVALID');
 }
 private response(body:unknown,status=200,extra:Record<string,string>={}) {return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
}
/** Explicit test initialization only. Production missing state must fail, never become empty. */
export class MemoryOrganizationStore implements OrganizationStore {
 private values=new Map<string,{etag:number;state:State}>();
 reads=0;writes=0;
 initialize(key:string,libraryID:string){if(this.values.has(key))throw Error('already initialized');this.values.set(key,{etag:1,state:emptyState(libraryID)});}
 async read(key:string){this.reads++;const found=this.values.get(key);if(!found)throw new ApiError(503,'ORGANIZATION_STATE_MISSING');return {etag:String(found.etag),state:structuredClone(found.state)};}
 async put(key:string,etag:string,state:State){const found=this.values.get(key);if(!found||String(found.etag)!==etag)throw new CASConflict();this.values.set(key,{etag:found.etag+1,state:structuredClone(state)});this.writes++;}
}
