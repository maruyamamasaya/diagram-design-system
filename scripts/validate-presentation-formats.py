import sys,json,pathlib,zipfile,re,xml.etree.ElementTree as E
from PIL import Image,ImageChops,ImageFilter
import logging
logging.getLogger("pdfminer").setLevel(logging.ERROR)
from pypdf import PdfReader
import pdfplumber
r=pathlib.Path(sys.argv[1]).resolve();out=r/'format-validation';out.mkdir(exist_ok=True)
validation=json.loads((r/'validation.json').read_text(encoding='utf-8'))
reader=PdfReader(r/'document.pdf');assert len(reader.pages)==len(validation['slides'])
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
def compact(s):return re.sub(r'\s+','',s)
def similarity(a,b):
 a=a.convert('L').resize((1600,900));b=b.convert('L').resize((1600,900))
 ma=a.point(lambda v:255 if v<230 else 0);mb=b.point(lambda v:255 if v<230 else 0)
 hits1=ImageChops.multiply(ma,mb.filter(ImageFilter.MaxFilter(5))).histogram()[255]
 hits2=ImageChops.multiply(mb,ma.filter(ImageFilter.MaxFilter(5))).histogram()[255]
 return (hits1+hits2)/max(1,ma.histogram()[255]+mb.histogram()[255])
report={'pages':[],'pdfGlyphsEmbedded':True,'pdfFontTypes':[],'pdfRasterImages':0,'pptxImages':0,'pptxNativeTables':0,'sourceUnitToPoint':0.6,'minSourceFontSize':20}
with pdfplumber.open(r/'document.pdf') as pdf,zipfile.ZipFile(r/'presentation.pptx') as z:
 for index,(page,expected) in enumerate(zip(reader.pages,validation['slides']),1):
  assert abs(float(page.mediabox.width)-960)<0.1 and abs(float(page.mediabox.height)-540)<0.1
  expectedLines=[line for b in expected['report']['blocks'] for line in b['lines']]
  pdfText=compact(pdf.pages[index-1].extract_text() or '')
  missingPdf=[line for line in expectedLines if compact(line) not in pdfText];assert not missingPdf,missingPdf
  for f in page['/Resources'].get('/Font',{}).values():
   f=f.get_object()
   if '/DescendantFonts' in f:f=f['/DescendantFonts'][0].get_object()
   subtype=str(f.get('/Subtype'));report['pdfFontTypes'].append(subtype)
   if subtype=='/Type3':
    assert len(f['/CharProcs'])>0
    assert all(not re.search(rb'(^|\n)BI\s',p.get_object().get_data()) for p in f['/CharProcs'].values())
   else:
    desc=f.get('/FontDescriptor');assert desc is not None
    assert any(k in desc.get_object() for k in ['/FontFile','/FontFile2','/FontFile3'])
  report['pdfRasterImages']+=len(pdf.pages[index-1].images)
  xml=E.fromstring(z.read(f'ppt/slides/slide{index}.xml'))
  text=compact(''.join(n.text or '' for n in xml.findall('.//a:t',ns)))
  missingPptx=[line for line in expectedLines if compact(line) not in text];assert not missingPptx,missingPptx
  report['pptxImages']+=len(xml.findall('.//p:pic',ns));report['pptxNativeTables']+=len(xml.findall('.//a:tbl',ns))
  sizes=[float(n.attrib['sz'])/100 for n in xml.findall('.//a:rPr',ns) if 'sz' in n.attrib];assert min(sizes)>=12-0.01
  reference=Image.open(r/f'slides/{index:03d}/slide.png').resize((1600,900))
  pdfImg=Image.open(r/f'format-validation/pdf-{index}.png');pptx=Image.open(r/f'format-validation/powerpoint/{index:03d}.png')
  p1=similarity(reference,pdfImg);p2=similarity(reference,pptx)
  row={'page':index,'pdfForegroundAgreementWithin2px':round(p1,5),'pptxForegroundAgreementWithin2px':round(p2,5),'pdfText':'matched','pptxText':'matched','minPptxFontPt':min(sizes)}
  report['pages'].append(row)
  comparison=Image.new('RGB',(2400,450),'white')
  for j,img in enumerate([reference,pdfImg,pptx]):comparison.paste(img.convert('RGB').resize((800,450)),(j*800,0))
  comparison.save(out/f'comparison-{index:03d}.png')
 assert report['pdfRasterImages']==0 and report['pptxImages']==0 and report['pptxNativeTables']>=1
report['powerpointEditing']=json.loads((out/'powerpoint/powerpoint.json').read_text(encoding='utf-8-sig'))['editing']
(out/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
report['pdfFontTypes']=sorted(set(report['pdfFontTypes']))
print(json.dumps(report,ensure_ascii=True))
