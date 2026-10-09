// Explicit read-only manual validation. Never print grants or credentials.
import {catalog,access} from '../src/lib/store';
import {createSession} from '../src/lib/auth';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
async function main() {
 const entries=await catalog(), m=entries.find(m=>m.diagramType==='presentation');
 if(!m) throw Error('No presentation');
 const principal=createSession();const results=[];
 for(const format of ['pdf','png','pptx'] as const) {
  const grant=await access(m,format,'download',principal.id,principal.sub,1);
  const response=await fetch(grant.url,{redirect:'error'});if(!response.ok)throw Error('Download failed');
  const data=Buffer.from(await response.arrayBuffer());if(data.length!==grant.sizeBytes||createHash('sha256').update(data).digest('hex')!==grant.sha256)throw Error('Integrity mismatch');
  results.push({format,sizeBytes:data.length,sha256:grant.sha256});
 }
 const report={readOnly:true,checkedAt:new Date().toISOString(),id:m.diagramId,version:m.version,results,publicOIDC:false,iosConnection:false};
 await fs.writeFile('../outputs/phase11b2/signed-download.json',JSON.stringify(report,null,2));console.log('PASS read-only signed PDF/PNG/PPTX download and SHA256 (local server credentials; not public OIDC/iOS)');
}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
