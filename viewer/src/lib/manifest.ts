import { error } from './config';
export type Artifact = 'png' | 'svg' | 'pdf' | 'pptx' | 'input' | 'validation';
export type File = {name:string;format:string;role:string;contentType:string;sizeBytes:number;sha256:string;key:string};
export type Manifest = {
 diagramId:string;title:string;diagramType:string;version:number;createdAt:string;updatedAt:string;
 outputFormats:string[];files:File[];validation:{checks:Record<string,string>};pageCount:number;
 storage:{bucket:string;region:string;expectedBucketOwner:string;prefix:string;encryption:string};catalogKey:string;
};
export const target = {schemaVersion:'1.0',bucket:'diagram-design-system-676643701781-apne1',region:'ap-northeast-1',expectedBucketOwner:'676643701781',prefix:'library',encryption:'AES256',approved:false};
const mime:Record<string,string>={png:'image/png',svg:'image/svg+xml',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export function presentationManifest(value:unknown,key:string,modified:string):Manifest {
 const m=value as Record<string,any>;
 function fail():never {return error(409,'INVALID_MANIFEST');}
 if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['schemaVersion','uploadPolicy','diagramId','version','title','storage','formats','files','metadataKey','catalogKey'].includes(k)))fail();
 if(m.schemaVersion!=='presentation-s3-1.0'||m.uploadPolicy!=='pdf-pptx-png-v1'||!/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.test(m.diagramId)||!Number.isInteger(m.version)||m.version<1||m.version>999999||typeof m.title!=='string'||!m.title.length||m.title.length>2000)fail();
 const base=`library/diagrams/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}`;
 if(m.catalogKey!==key||key!==`library/catalog/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}/upload-manifest.json`||m.metadataKey!==base+'/upload-manifest.json')fail();
 if(!m.storage||Object.keys(m.storage).length!==5||Object.keys(m.storage).some(k=>m.storage[k]!==target[k as keyof typeof target]))fail();
 if(!Array.isArray(m.formats)||m.formats.length!==3||new Set(m.formats).size!==3||!['png','pdf','pptx'].every(f=>m.formats.includes(f)))fail();
 if(!Array.isArray(m.files)||m.files.length<3||m.files.length>501)fail();
 const seen=new Set<string>(),pages:number[]=[];
 const files:File[]=m.files.map((f:any)=>{
  if(!f||Object.keys(f).some(k=>!['name','contentType','sizeBytes','sha256','key'].includes(k))||typeof f.name!=='string'||seen.has(f.name))fail();
  seen.add(f.name);let format='';
  const page=/^slides\/([0-9]{3})\/slide\.png$/.exec(f.name);
  if(page){const n=Number(page[1]);if(n<1)fail();pages.push(n);format='png';}
  else if(f.name==='document.pdf')format='pdf';else if(f.name==='presentation.pptx')format='pptx';else fail();
  if(f.key!==base+'/'+f.name||f.contentType!==mime[format]||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1||f.sizeBytes>=20_000_000||typeof f.sha256!=='string'||!/^[a-f0-9]{64}$/.test(f.sha256))fail();
  return {...f,format,role:format==='png'?'preview':'document'};
 });
 pages.sort((a,b)=>a-b);
 if(!seen.has('document.pdf')||!seen.has('presentation.pptx')||!pages.length||pages.some((n,i)=>n!==i+1)||files.reduce((n,f)=>n+f.sizeBytes,0)>=50_000_000||!Number.isFinite(Date.parse(modified)))fail();
 return {diagramId:m.diagramId,title:m.title,diagramType:'presentation',version:m.version,createdAt:modified,updatedAt:modified,outputFormats:m.formats,files,validation:{checks:{manifestSchema:'合格',artifactIntegrity:'未検証',visualReview:'未検証'}},pageCount:pages.length,storage:m.storage,catalogKey:m.catalogKey};
}
