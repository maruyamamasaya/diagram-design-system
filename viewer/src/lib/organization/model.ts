import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export type Value = { [kind: string]: { _0?: any } };
export type Operation = { id: string; key: string; expectedRevision: number; value: Value };
export type Snapshot = { libraryID: string; revision: number; records: Record<string, { value: Value; revision: number }> };
export type Receipt = { operation: Operation; disposition: 'accepted'|'conflict'|'invalid'; current?: Snapshot['records'][string] };
export type Quota = { used: number; limit: number; nextAllowedAt?: number; challenge?: string };
export type WireRequest = { action: 'begin'|'sync'|'finish'; libraryID: string; attemptID: string; requestID: string; consent?: string; operations?: Operation[]; knownRevision?: number };
export type WireReply = { admission?: {permit?: {id: string; expiresAt: number}; quota: Quota}; failure?: {reason: string; quota: Quota}; reply?: {receipts: Receipt[]; snapshot: Snapshot}; unchangedRevision?: number };
type Lease = { permit: {id: string; expiresAt: number}; startedAt: number; closed: boolean; requests: Record<string,number> };
export type State = { schemaVersion: 1; snapshot: Snapshot; receipts: Record<string, Receipt>; leases: Record<string, Lease>; challenges: Record<string, {token: string; expiresAt: number}> };
export function emptyState(libraryID: string): State { return {schemaVersion:1,snapshot:{libraryID,revision:0,records:{}},receipts:{},leases:{},challenges:{}}; }
export class ProtocolError extends Error { }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = (s: unknown): s is string => typeof s === 'string' && uuidPattern.test(s);
const object = (x: any): x is Record<string, any> => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = (x: any) => Number.isSafeInteger(x) && x >= 0;
const shape = (x: any, keys: string[]) => object(x) && Object.keys(x).every(k=>keys.includes(k));
const eq = (a: any, b: any): boolean => isDeepStrictEqual(canonical(a), canonical(b));
function canonical(x: any): any { if(typeof x === 'string') return x.normalize('NFC'); if(Array.isArray(x))return x.map(canonical); if(object(x)) return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,canonical(v)])); return x; }
const trim = (s: string) => s.replace(/^[\p{White_Space}\uFEFF]+|[\p{White_Space}\uFEFF]+$/gu,'');
const graphemes = (s: string) => [...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(s)].length;
const kind = (v: Value) => Object.keys(v)[0];
const arg = (v: Value) => v[kind(v)]._0;
const folderKey = (id: string) => 'folder/'+id.toLowerCase();
export const encoded = (s: string) => Buffer.from(s).toString('base64').replaceAll('/','_').replaceAll('+','-');
function decoded(s: string): string | undefined { try { const standard=s.replaceAll('_','/').replaceAll('-','+');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(standard))return undefined;const b=Buffer.from(standard,'base64'); return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b); } catch { return undefined; } }
export const tagKey = (id: string, tag: string) => 'tag/'+encoded(id)+'/'+encoded(trim(tag).toLowerCase());

/** Decode the Swift Codable enum envelope without accepting asset/URL fields. */
export function decodeRequest(input: unknown): WireRequest {
 const x=structuredClone(input) as any;
 if(!shape(x,['action','libraryID','attemptID','requestID','consent','operations','knownRevision']) || !['begin','sync','finish'].includes(x.action) || !uuid(x.libraryID)||!uuid(x.attemptID)||!uuid(x.requestID) || (x.consent!==undefined&&!uuid(x.consent)) || (x.knownRevision!==undefined&&!integer(x.knownRevision))) throw new ProtocolError('request');
 for(const k of ['libraryID','attemptID','requestID','consent']) if(x[k]) x[k]=x[k].toUpperCase();
 if(x.operations!==undefined) {
  if(!Array.isArray(x.operations)||x.operations.length>500)throw new ProtocolError('operations');
  for(const op of x.operations) {
   if(!shape(op,['id','key','expectedRevision','value'])||!uuid(op.id)||typeof op.key!=='string'||op.key.length>4096||!integer(op.expectedRevision)||!object(op.value)||Object.keys(op.value).length!==1)throw new ProtocolError('operation');
   op.id=op.id.toUpperCase();const k=kind(op.value), a=arg(op.value);
   if(!['folder','assignment','group','tag','collection','order','deleted'].includes(k)||!shape(op.value[k],k==='deleted'?[]:['_0'])||(k!=='deleted'&&a===undefined))throw new ProtocolError('enum');
   if(k==='folder') {
    if(!shape(a,['id','name','parentID','iconFile'])||!uuid(a.id)||typeof a.name!=='string'||(a.parentID!==undefined&&!uuid(a.parentID))||(a.iconFile!==undefined&&typeof a.iconFile!=='string'))throw new ProtocolError('folder');
    a.id=a.id.toUpperCase();if(a.parentID)a.parentID=a.parentID.toUpperCase();
   }
   if(k==='assignment'){if(!uuid(a))throw new ProtocolError('assignment');op.value[k]._0=a.toUpperCase();}
   if(k==='group'&&!['仕事','私用','その他'].includes(a))throw new ProtocolError('group');
   if(k==='tag'&&typeof a!=='string')throw new ProtocolError('tag');
   if(k==='order'){if(!Array.isArray(a)||!a.every(uuid))throw new ProtocolError('order');op.value[k]._0=a.map((id:string)=>id.toUpperCase());}
   if(k==='collection') {
    if(!shape(a,['id','title','members'])||!uuid(a.id)||typeof a.title!=='string'||!Array.isArray(a.members))throw new ProtocolError('collection');a.id=a.id.toUpperCase();
    for(const m of a.members)if(!shape(m,['id','title','type','version','formats','pageCount','tags'])||typeof m.id!=='string'||!m.id||typeof m.title!=='string'||typeof m.type!=='string'||!integer(m.version)||!integer(m.pageCount)||!Array.isArray(m.formats)||!m.formats.every((v:any)=>typeof v==='string')||!Array.isArray(m.tags)||!m.tags.every((v:any)=>typeof v==='string'))throw new ProtocolError('member');
   }
  }
 }
 if(x.action!=='sync'&&(x.operations!==undefined||x.knownRevision!==undefined))throw new ProtocolError('action body');
 return x;
}
function valid(op: Operation, state: State): boolean {
 const parts=op.key.split('/'), k=kind(op.value), a=arg(op.value), records=state.snapshot.records;
 const tombstone=records[op.key]&&kind(records[op.key].value)==='deleted';
 const folder=(id:string)=> {const record=records[folderKey(id)];return record&&kind(record.value)==='folder'?arg(record.value):undefined;};
 switch(k) {
  case 'folder': {
   if(op.key!==folderKey(a.id)||tombstone||a.iconFile!==undefined||!trim(a.name)||graphemes(a.name)>120)return false;
   let parent=a.parentID;const seen=new Set([a.id]);while(parent){const node=folder(parent);if(seen.has(parent)||!node)return false;seen.add(parent);parent=node.parentID;}return true;
  }
  case 'assignment': return parts.length===2&&parts[0]==='assignment'&&!!decoded(parts[1])&&!!folder(a);
  case 'group': return parts.length===2&&parts[0]==='group'&&!!decoded(parts[1]);
  case 'tag': { const id=parts.length===3?decoded(parts[1]):undefined;return !!id&&parts[0]==='tag'&&trim(a)===a&&!!a&&op.key===tagKey(id,a); }
  case 'collection': return op.key==='collection/'+a.id.toLowerCase()&&!tombstone&&!!trim(a.title)&&graphemes(a.title)<=120&&a.members.length>0&&a.members.length<=100&&new Set(a.members.map((m:any)=>m.id.normalize('NFC'))).size===a.members.length;
  case 'order': return op.key==='folder-order'&&new Set(a).size===a.length&&a.every((id:string)=>!!folder(id));
  case 'deleted': {
   if(parts.length===2&&uuid(parts[1])&&['folder','collection'].includes(parts[0]))return op.key===parts[0]+'/'+parts[1].toLowerCase();
   if(parts.length===2&&['assignment','group'].includes(parts[0])){const id=decoded(parts[1]);return !!id&&op.key===parts[0]+'/'+encoded(id);}
   if(parts.length===3&&parts[0]==='tag'){const id=decoded(parts[1]),t=decoded(parts[2]);return !!id&&!!t&&op.key===tagKey(id,t);}return false;
  }
 }return false;
}
function cascade(state: State, key: string) {
 const records=state.snapshot.records, deleted=new Set([key]);let again=true;
 const mark=(key:string)=>records[key]={value:{deleted:{}},revision:state.snapshot.revision};
 while(again){again=false;for(const [key,record] of Object.entries(records))if(kind(record.value)==='folder'){const parent=arg(record.value).parentID;if(parent&&deleted.has(folderKey(parent))){mark(key);deleted.add(key);again=true;}}}
 for(const [key,record] of Object.entries(records)) {
  if(kind(record.value)==='assignment'&&deleted.has(folderKey(arg(record.value))))mark(key);
  if(kind(record.value)==='order')records[key]={value:{order:{_0:arg(record.value).filter((id:string)=>!deleted.has(folderKey(id)))}},revision:state.snapshot.revision};
 }
}
function submit(state: State, operations: Operation[]) {
 const identities=new Map<string,Operation>();
 for(const op of operations){const prior=identities.get(op.id)||state.receipts[op.id]?.operation;if(prior&&!eq(prior,op))throw new ProtocolError('operation ID reused');identities.set(op.id,op);}
 const receipts: Receipt[]=[];
 for(const op of operations){
  const prior=state.receipts[op.id];if(prior){receipts.push(prior);continue;}
  const current=state.snapshot.records[op.key];let disposition: Receipt['disposition'];
  if(!valid(op,state))disposition='invalid';
  else if(eq(current?.value,op.value))disposition='accepted';
  else if((current?.revision??0)!==op.expectedRevision)disposition='conflict';
  else {state.snapshot.revision++;state.snapshot.records[op.key]={value:op.value,revision:state.snapshot.revision};if(kind(op.value)==='deleted'&&op.key.startsWith('folder/'))cascade(state,op.key);disposition='accepted';}
  const receipt:Receipt={operation:op,disposition};if(state.snapshot.records[op.key])receipt.current=state.snapshot.records[op.key];state.receipts[op.id]=structuredClone(receipt);receipts.push(receipt);
 }
 return {receipts,snapshot:state.snapshot};
}
export function quota(state: State, now: number): Quota {
 const starts=Object.values(state.leases).filter(l=>now-l.startedAt<3600).map(l=>l.startedAt).sort((a,b)=>a-b);
 return {used:starts.length,limit:5,...(starts.length>=5?{nextAllowedAt:starts[starts.length-5]+3600}:{})};
}
/** Pure deterministic transition except the injected challenge UUID. Time is Swift reference seconds. */
export function transition(before: State, request: WireRequest, now: number, nonce:()=>string=()=>randomUUID().toUpperCase()): {state: State; body: WireReply; status: number; error?: string} {
 if(request.libraryID!==before.snapshot.libraryID)throw new ProtocolError('wrong library');
 const state=structuredClone(before);state.leases=Object.fromEntries(Object.entries(state.leases).filter(([,l])=>now-l.startedAt<3600));state.challenges=Object.fromEntries(Object.entries(state.challenges).filter(([,c])=>c.expiresAt>now));
 let body:WireReply={},status=200;const id=request.attemptID;
 if(request.action==='begin') {
  const lease=state.leases[id];
  if(lease){body.admission={...(!lease.closed&&lease.permit.expiresAt>now?{permit:lease.permit}:{}),quota:quota(state,now)};}
  else if(quota(state,now).used>=5&&!(state.challenges[id]?.token===request.consent&&state.challenges[id]?.expiresAt>now)){
   if(!state.challenges[id]){if(Object.keys(state.challenges).length>=32){const oldest=Object.keys(state.challenges).sort((a,b)=>state.challenges[a].expiresAt-state.challenges[b].expiresAt)[0];delete state.challenges[oldest];}state.challenges[id]={token:nonce(),expiresAt:now+300};}
   body.admission={quota:{...quota(state,now),challenge:state.challenges[id].token}};
  } else {delete state.challenges[id];const permit={id,expiresAt:now+600};state.leases[id]={permit,startedAt:now,closed:false,requests:{}};body.admission={permit,quota:quota(state,now)};}
  if(!body.admission?.permit)status=429;
 } else if(request.action==='finish'){if(state.leases[id])state.leases[id].closed=true;}
 else {
  const lease=state.leases[id], attempts=lease?.requests[request.requestID]??0;
  const reason=!lease||lease.closed||lease.permit.expiresAt<=now?'permit_expired':attempts>=3||(attempts===0&&Object.keys(lease.requests).length>=12)?'request_budget':undefined;
  if(reason){body.failure={reason,quota:quota(state,now)};status=429;}
  else {lease.requests[request.requestID]=attempts+1;
   if(request.operations?.length===0&&request.knownRevision===state.snapshot.revision)body.unchangedRevision=state.snapshot.revision;
   else {try {body.reply=submit(state,request.operations??[]);}catch(e){if(e instanceof ProtocolError)return {state,body:{},status:400,error:'invalidValue'};throw e;}}
  }
 }
 return {state,body,status};
}
