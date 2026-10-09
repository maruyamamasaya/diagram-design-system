import sys,zipfile,xml.etree.ElementTree as E,pathlib
source,dest=sys.argv[1:3]
grid=set(sys.argv[3].split(',')) if len(sys.argv)>3 else set()
A='http://schemas.openxmlformats.org/drawingml/2006/main'
P='http://schemas.openxmlformats.org/presentationml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
E.register_namespace('a',A);E.register_namespace('p',P);E.register_namespace('r',R)
with zipfile.ZipFile(source) as inp,zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as out:
 for item in inp.infolist():
  b=inp.read(item.filename)
  if item.filename.startswith('ppt/slides/slide') and item.filename.endswith('.xml'):
   root=E.fromstring(b)
   for run in root.findall('.//{'+A+'}rPr'):
    latin=run.find('{'+A+'}latin')
    if latin is not None and latin.get('typeface')=='Noto Sans Mono':
     east=run.find('{'+A+'}ea')
     if east is not None:east.set('typeface','Noto Sans JP')
   for cell in root.findall('.//{'+A+'}tcPr'):
    for index,side in enumerate(['lnL','lnR','lnT','lnB']):
     for old in cell.findall('{'+A+'}'+side):cell.remove(old)
     page=item.filename.split('slide')[-1].split('.')[0]
     line=E.Element('{'+A+'}'+side,{'w':'15240' if page in grid else '0'})
     if page in grid:E.SubElement(E.SubElement(line,'{'+A+'}solidFill'),'{'+A+'}srgbClr',{'val':'777777'})
     else:E.SubElement(line,'{'+A+'}noFill')
     cell.insert(index,line)
   b=E.tostring(root,encoding='utf-8',xml_declaration=True)
  out.writestr(item,b)
