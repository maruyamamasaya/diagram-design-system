'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require('pngjs');
const {openBrowser}=require('../browser.cjs');
const {loadFont}=require('../font.cjs');
const {safeRead}=require('../upload/presentation.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const modes=['svg','hybrid','image'];
function validateJob(j) {
 if(!j||Object.keys(j).some(k=>!['schemaVersion','diagramId','version','title','mode','source','artwork','labels','prompt','assets','review'].includes(k))||j.schemaVersion!=='illustration-job-1.0'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(j.diagramId)||!Number.isInteger(j.version)||j.version<1||j.version>999999||typeof j.title!=='string'||!j.title.length||j.title.length>2000||!modes.includes(j.mode)||typeof j.source!=='string'||typeof j.artwork!=='string'||!Array.isArray(j.labels)||j.labels.some(s=>typeof s!=='string'||!s.length)||typeof j.prompt!=='string'||!Array.isArray(j.assets)||j.assets.some(a=>typeof a!=='string')||!j.review||Object.keys(j.review).some(k=>!['text','notes'].includes(k))||!['pending','passed'].includes(j.review.text)||typeof j.review.notes!=='string') throw Error('Invalid illustration job');
 if(!j.artwork.endsWith(j.mode==='image'?'.png':'.svg'))throw Error('Artwork extension does not match mode');
 if(j.mode==='hybrid'&&!j.assets.length)throw Error('Hybrid mode requires image assets');
 return j;
}
async function createIllustration(jobFile,{out='outputs',fontPath=process.env.DIAGRAM_FONT,browserPath=process.env.DIAGRAM_BROWSER}={}) {
 const root=path.dirname(path.resolve(jobFile)),j=validateJob(JSON.parse(await fs.readFile(jobFile,'utf8')));
 const source=await safeRead(root,j.source),artwork=await safeRead(root,j.artwork);
 if(!source.toString('utf8').trim())throw Error('Source is empty');
 const assets=await Promise.all(j.assets.map(async name=>({name,bytes:await safeRead(root,name)})));
 for(const a of assets)PNG.sync.read(a.bytes);
 let svg,png,width,height,font=null;
 if(j.mode==='image') {
  const decoded=PNG.sync.read(artwork);width=decoded.width;height=decoded.height;png=artwork;
  svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
 } else {svg=artwork.toString('utf8');if(j.mode==='hybrid'&&assets.some(a=>!svg.includes('data:image/png;base64,'+a.bytes.toString('base64'))))throw Error('Hybrid asset is not embedded in artwork');}
 const {browser,context}=await openBrowser(browserPath);
 let pdf,thumbnail,checks;
 try {
  const page=await context.newPage();
  const parsed=await page.evaluate(s=>{
   const d=new DOMParser().parseFromString(s,'image/svg+xml'),r=d.documentElement;
   if(d.querySelector('parsererror')||r.localName!=='svg'||r.namespaceURI!=='http://www.w3.org/2000/svg'||/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('Invalid SVG');
   const w=Number(r.getAttribute('width')),h=Number(r.getAttribute('height')),v=r.viewBox.baseVal;
   if(!Number.isFinite(w)||!Number.isFinite(h)||w<64||h<64||w>4096||h>4096||!r.getAttribute('viewBox')||v.width<=0||v.height<=0)throw Error('Invalid canvas dimensions');
   for(const e of d.querySelectorAll('*')) {
    if(e.namespaceURI!=='http://www.w3.org/2000/svg')throw Error('Unsafe element namespace');
    if(!['svg','g','defs','style','text','tspan','rect','circle','ellipse','line','polyline','polygon','path','image','marker','title','desc','clipPath'].includes(e.localName))throw Error('Unsupported SVG element');
    for(const a of e.attributes) {
     if(/^on/i.test(a.name))throw Error('Unsafe SVG handler');
     if(/href$/i.test(a.name)&&!/^#|^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.value))throw Error('External SVG reference');
     if(/url\(/i.test(a.value)&&!/^url\(#[A-Za-z0-9_-]+\)$/.test(a.value))throw Error('Unsafe SVG URL');
    }
    if(e.localName==='style'&&/@import|url\(|<\/style/i.test(e.textContent))throw Error('Unsafe SVG stylesheet');
   }
   return {width:w,height:h,strings:[...d.querySelectorAll('text')].map(e=>e.textContent)};
  },svg);
  width=parsed.width;height=parsed.height;
  if(j.mode!=='image') {
   if(!fontPath)throw Error('DIAGRAM_FONT or --font required');
   font=await loadFont(fontPath,[...parsed.strings,...j.labels]);
   svg=svg.replace(/(<svg\b[^>]*>)/,'$1<style>'+font.css+'text{font-family:DiagramJP}</style>');
   for(const label of j.labels)if(!parsed.strings.some(s=>s.includes(label)))throw Error('Missing expected label: '+label);
  }
  await page.setViewportSize({width,height});
  await page.setContent('<html><head><style>html,body{margin:0;background:white}svg{display:block}@page{margin:0;size:'+width+'px '+height+'px}</style></head><body>'+svg+'</body></html>');
  await page.evaluate(()=>document.fonts.ready);
  const bounds=await page.evaluate(()=>{
   const r=document.querySelector('svg'),v=r.getBoundingClientRect();
   return [...r.querySelectorAll('text')].every(e=>{const b=e.getBoundingClientRect();return b.left>=v.left&&b.top>=v.top&&b.right<=v.right&&b.bottom<=v.bottom});
  });
  if(!bounds)throw Error('Text outside canvas');
  if(!png)png=await page.screenshot({type:'png'});
  pdf=await page.pdf({width:width+'px',height:height+'px',printBackground:true,preferCSSPageSize:true});
  await page.setViewportSize({width:480,height:Math.round(480*height/width)});
  await page.addStyleTag({content:'svg{width:100vw;height:auto}'});
  thumbnail=await page.screenshot({type:'png'});
  PNG.sync.read(png);PNG.sync.read(thumbnail);
  checks={decode:'passed',textBounds:j.mode==='image'?'not_applicable':'passed',expectedLabels:j.mode==='image'?'manual':'passed',textReview:j.review.text};
 }finally{await browser.close();}
 const target=path.resolve(out,j.diagramId,'versions',String(j.version).padStart(6,'0'));
 await fs.mkdir(path.dirname(target),{recursive:true});
 // Atomic directory publication: failure never creates a reusable completed version.
 const temp=await fs.mkdtemp(path.join(path.dirname(target),'.illustration-'));
 const replayJob={...j,source:'source.md',artwork:j.mode==='image'?'diagram.png':'input-artwork.svg',assets:assets.map((a,i)=>`assets/${i+1}.png`)};
 const files={'source.md':source,'source.json':Buffer.from(JSON.stringify(replayJob,null,2)+'\n'),'artwork.svg':Buffer.from(svg),'diagram.png':png,'diagram.pdf':pdf,'thumbnail.png':thumbnail};
 if(j.mode!=='image')files['input-artwork.svg']=artwork;
 assets.forEach((a,i)=>files[`assets/${i+1}.png`]=a.bytes);
 const validation={schemaVersion:'illustration-validation-1.0',checks,notes:j.review.notes,mode:j.mode,width,height,font:font?.info||null};
 files['validation.json']=Buffer.from(JSON.stringify(validation,null,2)+'\n');
 const metadata={schemaVersion:'illustration-package-1.0',diagramId:j.diagramId,version:j.version,title:j.title,mode:j.mode,createdAt:new Date().toISOString(),artifacts:Object.entries(files).map(([name,b])=>({name,sizeBytes:b.length,sha256:hash(b)}))};
 try {
  for(const [name,b] of Object.entries(files)){await fs.mkdir(path.dirname(path.join(temp,name)),{recursive:true});await fs.writeFile(path.join(temp,name),b,{flag:'wx'});}
  await fs.writeFile(path.join(temp,'metadata.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
  await fs.rename(temp,target);
 }catch(e){await fs.rm(temp,{recursive:true,force:true});throw e;}
 return {directory:target,metadata,validation};
}
module.exports={createIllustration,validateJob,hash};
