"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {PNG}=require('pngjs');
const {fixture}=require('../../examples/graphic-slides/fixture.cjs');
const {generatePresentation,hash}=require('../../src/presentation/engine.cjs');
test('graphic export keeps original image bytes, native objects, full text and provenance',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'graphic-export-'));
 try {
  const png=new PNG({width:32,height:24});png.data.fill(255);const bytes=PNG.sync.write(png);await fs.writeFile(path.join(dir,'image.png'),bytes);
  const assets=[0,1].map(i=>({assetId:'asset'+i,path:'image.png',sha256:hash(bytes),kind:i?'generated':'existing',referenceId:'image'+i,origin:'Local synthetic export fixture',license:'Local test fixture',alt:'Image '+i,...(i?{prompt:'Fixture for generation disclosure; not a real generation'}:{})}));
  const p=fixture(assets);
  const r=await generatePresentation(p,{output:path.resolve('outputs/graphic-export-tests'),assetRoot:dir});
  assert.equal(r.metadata.formats.pdf,'generated');assert.equal(r.metadata.formats.pptx,'generated');
  const {loadPresentation}=require('../../src/upload/presentation.cjs');
  const config={schemaVersion:'1.0',bucket:'test-library',region:'ap-northeast-1',expectedBucketOwner:'123456789012',prefix:'library',encryption:'AES256',approved:true};
  const loaded=await loadPresentation(r.directory,config);
  assert.equal(loaded.files.length,8);assert.ok(loaded.files.every(f=>!f.name.includes('assets')));
  const snapshot=r.metadata.assets[0];await fs.appendFile(path.join(r.directory,snapshot.path),'changed');
  await assert.rejects(loadPresentation(r.directory,config),/snapshot integrity/);
  await fs.writeFile(path.join(r.directory,snapshot.path),bytes);
  const python=process.env.DIAGRAM_PYTHON || path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
  const program=`import sys,zipfile,json,hashlib,xml.etree.ElementTree as E
from pathlib import Path
from pypdf import PdfReader
r=Path(sys.argv[1]); v=json.loads((r/'validation.json').read_text()); pdf=PdfReader(r/'document.pdf'); assert len(pdf.pages)==6
for page,slide in zip(pdf.pages,v['slides']):
 text=''.join(page.extract_text().split())
 assert all(''.join(line.split()) in text for b in slide['report']['blocks'] for line in b['lines'])
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(r/'presentation.pptx') as z:
 roots=[E.fromstring(z.read('ppt/slides/slide%d.xml'%i)) for i in range(1,7)]
 assert sum(len(root.findall('.//p:pic',ns)) for root in roots)==3
 assert all(root.findall('.//p:sp',ns) for root in roots)
 assert len(roots[2].findall('.//p:sp',ns))>12
 media=[hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('ppt/media/') and n.endswith('.png')]; assert sys.argv[2] in media
 notes=''.join(z.read(n).decode() for n in z.namelist() if n.startswith('ppt/notesSlides/notesSlide') and n.endswith('.xml'))
 assert 'License:' in notes and 'SHA256:' in notes and 'Prompt:' in notes and 'Fixture for generation disclosure' in notes
print('Six PDF pages; full text; native objects; exact media; generation provenance: passed')`;
  require('node:child_process').execFileSync(python,['-c',program,r.directory,hash(bytes)],{stdio:'inherit'});
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
