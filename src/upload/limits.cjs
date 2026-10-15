'use strict';
// Decimal MB; inclusive limits. Includes all objects in the upload plan.
const FILE_LIMIT_BYTES=20_000_000;
const TOTAL_LIMIT_BYTES=50_000_000;
const {approvals}=require('../../config/upload-size-approvals.json');
function uploadSizeCheck(files,storage) {
  // Human-approved, immutable object allowlist. Unknown destinations, bytes,
  // names, and versions retain the default limits, including low-level writes.
  const approval=files.length&&approvals.find(a=>storage&&Object.entries(a.storage).every(([k,v])=>storage[k]===v)&&
    new Set(files.map(f=>f.name)).size===files.length&&files.every(f=>a.files.some(x=>x.name===f.name&&x.sizeBytes===f.sizeBytes&&x.sha256===f.sha256)));
  const fileLimitBytes=approval?approval.fileLimitBytes:FILE_LIMIT_BYTES;
  const totalLimitBytes=approval?approval.totalLimitBytes:TOTAL_LIMIT_BYTES;
  const totalBytes=files.reduce((sum,f)=>sum+f.sizeBytes,0);
  const oversized=files.filter(f=>f.sizeBytes>=fileLimitBytes).map(f=>({name:f.name,sizeBytes:f.sizeBytes}));
  return {blocked:oversized.length>0||totalBytes>=totalLimitBytes,totalBytes,oversized,fileLimitBytes,totalLimitBytes,approvedObjectCount:approval?approval.files.length:0};
}
function assertUploadSize(files,storage) {
  const check=uploadSizeCheck(files,storage);
  if(check.blocked) {const e=new Error(`Upload stopped: ${check.oversized.map(f=>`${f.name}=${f.sizeBytes} bytes`).join(', ')||'no single-file excess'}; total=${check.totalBytes} bytes (stop at file >=${check.fileLimitBytes} bytes or total >=${check.totalLimitBytes} bytes).`);e.name='UploadSizeLimitError';e.sizeCheck=check;throw e;}
  return check;
}
module.exports={uploadSizeCheck,assertUploadSize};
