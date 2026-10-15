// Read-only app API -> presigned S3 GET verification. Never print bearer tokens/URLs.
import {handle} from '../src/lib/api';
import {createSession,token} from '../src/lib/auth';
import {createHash} from 'node:crypto';
async function main(){
 const id='4f2af5d0-86c9-4709-9dad-9f6a67e5ac10',s=createSession(),auth={Authorization:`Bearer ${await token(s.id,s.sub)}`};
 const request=(url:string,body?:unknown)=>new Request('http://127.0.0.1:3000'+url,{method:body?'POST':'GET',headers:{...auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const list=await handle(request('/v1/diagrams?q='+encodeURIComponent('2040年の産業')),'api',['diagrams']);if(list.status!==200)throw Error('List status '+list.status);const l=await list.json();if(!l.items.some((x:any)=>x.id===id&&x.pageCount===40))throw Error('40-page deck absent from list');
 const detail=await handle(request('/v1/diagrams/'+id),'api',['diagrams',id]);if(detail.status!==200)throw Error('Detail failed');const d=await detail.text();if(d.includes('library/diagrams')||d.includes('676643701781'))throw Error('Internal storage leaked');
 const results=[];
 for(const [artifact,page] of [...Array.from({length:40},(_,i)=>['png',i+1] as const),['pdf',1] as const,['pptx',1] as const]){
  const r=await handle(request('/v1/diagrams/'+id+'/access-url',{artifact,page,purpose:artifact==='pptx'?'download':'preview'}),'api',['diagrams',id,'access-url']);if(r.status!==200)throw Error('Access status '+r.status);const a=await r.json();const got=await fetch(a.url);if(!got.ok)throw Error('Signed GET failed');const bytes=Buffer.from(await got.arrayBuffer());if(bytes.length!==a.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('Integrity mismatch');results.push({artifact,page,sizeBytes:bytes.length,sha256Verified:true});
 }
 console.log(JSON.stringify({id,pageCount:40,listStatus:200,detailStatus:200,verified:results.length,results}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
