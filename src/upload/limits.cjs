'use strict';
// Decimal MB; inclusive limits. Includes all objects in the upload plan.
const FILE_LIMIT_BYTES=20_000_000;
const TOTAL_LIMIT_BYTES=50_000_000;
function uploadSizeCheck(files) {
  const totalBytes=files.reduce((sum,f)=>sum+f.sizeBytes,0);
  const oversized=files.filter(f=>f.sizeBytes>=FILE_LIMIT_BYTES).map(f=>({name:f.name,sizeBytes:f.sizeBytes}));
  return {blocked:oversized.length>0||totalBytes>=TOTAL_LIMIT_BYTES,totalBytes,oversized,fileLimitBytes:FILE_LIMIT_BYTES,totalLimitBytes:TOTAL_LIMIT_BYTES};
}
function assertUploadSize(files) {
  const check=uploadSizeCheck(files);
  if(check.blocked) {const e=new Error(`Upload stopped: ${check.oversized.map(f=>`${f.name}=${f.sizeBytes} bytes`).join(', ')||'no single-file excess'}; total=${check.totalBytes} bytes (stop at file >=20 MB or total >=50 MB).`);e.name='UploadSizeLimitError';e.sizeCheck=check;throw e;}
  return check;
}
module.exports={uploadSizeCheck,assertUploadSize};
