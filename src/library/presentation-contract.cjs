'use strict';
const {uploadSizeCheck}=require('../upload/limits.cjs');
const target = {schemaVersion:'1.0',bucket:'diagram-design-system-676643701781-apne1',region:'ap-northeast-1',expectedBucketOwner:'676643701781',prefix:'library',encryption:'AES256',approved:false};
const mime={png:'image/png',svg:'image/svg+xml',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
function presentationManifest(value,key,modified,expectedTarget=target) {
 const m=value;
 function fail() {const e=new Error('INVALID_MANIFEST');e.code='INVALID_MANIFEST';throw e;}
 if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['schemaVersion','uploadPolicy','diagramId','version','title','storage','formats','files','metadataKey','catalogKey'].includes(k)))fail();
 const illustration=m?.schemaVersion==='illustration-s3-1.0';
 if((illustration?m.uploadPolicy!=='png-pdf-v1':m.schemaVersion!=='presentation-s3-1.0'||m.uploadPolicy!=='pdf-pptx-png-v1')||!/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.test(m.diagramId)||!Number.isInteger(m.version)||m.version<1||m.version>999999||typeof m.title!=='string'||!m.title.length||m.title.length>2000)fail();
 const base=`library/diagrams/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}`;
 if(m.catalogKey!==key||key!==`library/catalog/${m.diagramId}/versions/${String(m.version).padStart(6,'0')}/upload-manifest.json`||m.metadataKey!==base+'/upload-manifest.json')fail();
 if(!m.storage||Object.keys(m.storage).length!==5||Object.keys(m.storage).some(k=>m.storage[k]!==expectedTarget[k]))fail();
 const formats=illustration?['png','pdf']:['png','pdf','pptx'];
 if(!Array.isArray(m.formats)||m.formats.length!==formats.length||new Set(m.formats).size!==formats.length||!formats.every(f=>m.formats.includes(f)))fail();
 if(!Array.isArray(m.files)||m.files.length<(illustration?2:3)||m.files.length>501)fail();
 const seen=new Set(),pages=[];
 const files=m.files.map((f)=>{
  if(!f||Object.keys(f).some(k=>!['name','contentType','sizeBytes','sha256','key'].includes(k))||typeof f.name!=='string'||seen.has(f.name))fail();
  seen.add(f.name);let format='';
  const page=/^slides\/(?:slide-)?([0-9]{3})\/slide\.png$/.exec(f.name);
  if(illustration){if(f.name==='diagram.png'){format='png';pages.push(1);}else if(f.name==='diagram.pdf')format='pdf';else fail();}
  else if(page){const n=Number(page[1]);if(n<1)fail();pages.push(n);format='png';}
  else if(f.name==='document.pdf')format='pdf';else if(f.name==='presentation.pptx')format='pptx';else fail();
  if(f.key!==base+'/'+f.name||f.contentType!==mime[format]||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1||typeof f.sha256!=='string'||!/^[a-f0-9]{64}$/.test(f.sha256))fail();
  return {...f,format,role:format==='png'?'preview':'document'};
 });
 pages.sort((a,b)=>a-b);
 if((illustration?m.files.length!==2||!seen.has('diagram.pdf'):!seen.has('document.pdf')||!seen.has('presentation.pptx'))||!pages.length||pages.some((n,i)=>n!==i+1)||!Number.isFinite(Date.parse(modified)))fail();
 // Reuse the upload policy after schema/key checks. Only exact approved hashes
 // and destination receive the exception; a new version or changed byte does not.
 const size=uploadSizeCheck(files.map(f=>({name:f.key,sizeBytes:f.sizeBytes,sha256:f.sha256})),m.storage);
 if(size.blocked||(size.approvedObjectCount&&files.length+2!==size.approvedObjectCount))fail();
 return {diagramId:m.diagramId,title:m.title,diagramType:illustration?'illustration':'presentation',version:m.version,createdAt:modified,updatedAt:modified,outputFormats:m.formats,files,validation:{checks:{manifestSchema:'合格',artifactIntegrity:'未検証',visualReview:'未検証'}},pageCount:pages.length,storage:m.storage,catalogKey:m.catalogKey};
}

module.exports={presentationManifest,target};
