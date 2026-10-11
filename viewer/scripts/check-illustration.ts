// Read-only S3 verification through the shared viewer layer; no auth tokens/URLs logged.
import {find,file,access} from '../src/lib/store';
import {createHash} from 'node:crypto';
async function main() {
 const id=process.argv[2];if(!id)throw Error('Diagram ID required');
 const m=await find(id);if(m.diagramType!=='illustration'||m.pageCount!==1)throw Error('Not a standalone illustration');
 const results=[];
 for(const format of ['png','pdf'] as const) {
  const f=file(m,format),a=await access(m,format,'download','local-verification','local-owner');
  const r=await fetch(a.url);if(!r.ok)throw Error('Artifact GET failed');
  const b=Buffer.from(await r.arrayBuffer());if(b.length!==f.sizeBytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Artifact integrity mismatch');
  results.push({format,sizeBytes:b.length,sha256Verified:true});
 }
 console.log(JSON.stringify({type:m.diagramType,pageCount:m.pageCount,results}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
