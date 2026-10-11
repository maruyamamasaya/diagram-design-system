"""Small native-package integration fixture for the partial deck composer."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from pypdf import PdfWriter, PdfReader

module_path = Path(__file__).resolve().parents[2] / 'src/update/compose.py'
spec = importlib.util.spec_from_file_location('composer', module_path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
P, R, REL, CT = m.P, m.R, m.REL, m.CT

def relationships(items):
    root = ET.Element('{' + REL + '}Relationships')
    for index, (kind, dest) in enumerate(items, 1):
        ET.SubElement(root, '{' + REL + '}Relationship', Id=f'rId{index}', Type=R + '/' + kind, Target=dest)
    return m.serialized(root)

def package(directory, labels):
    directory.mkdir()
    w = PdfWriter()
    for label in labels:
        w.add_blank_page(width=960, height=540)
    w.write(directory / 'document.pdf')
    presentation = ET.Element('{' + P + '}presentation')
    slide_list = ET.SubElement(presentation, '{' + P + '}sldIdLst')
    parts = {'_rels/.rels': relationships([('officeDocument', 'ppt/presentation.xml')])}
    links = []
    overrides = {'ppt/presentation.xml': 'presentation.main'}
    for i, label in enumerate(labels, 1):
        name = f'ppt/slides/slide{i}.xml'
        ET.SubElement(slide_list, '{' + P + '}sldId', id=str(255+i), attrib={'{' + R + '}id': f'rId{i}'})
        links.append(('slide', f'slides/slide{i}.xml'))
        parts[name] = f'<p:sld xmlns:p="{P}"><p:cSld name="{label}"/></p:sld>'.encode()
        parts[m.relpath(name)] = relationships([('notesSlide', f'../notesSlides/notesSlide{i}.xml'), ('slideLayout', '../slideLayouts/slideLayout1.xml')])
        parts[f'ppt/notesSlides/notesSlide{i}.xml'] = f'<p:notes xmlns:p="{P}"><p:cSld name="notes-{label}"/></p:notes>'.encode()
        parts[f'ppt/notesSlides/_rels/notesSlide{i}.xml.rels'] = relationships([('slide', f'../slides/slide{i}.xml')])
        overrides[name] = 'slide'
        overrides[f'ppt/notesSlides/notesSlide{i}.xml'] = 'notesSlide'
    # A layout/master dependency cycle must remain closed after composition.
    parts['ppt/slideLayouts/slideLayout1.xml'] = f'<p:sldLayout xmlns:p="{P}"/>'.encode()
    parts['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = relationships([('slideMaster','../slideMasters/slideMaster1.xml')])
    parts['ppt/slideMasters/slideMaster1.xml'] = f'<p:sldMaster xmlns:p="{P}"/>'.encode()
    parts['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = relationships([('slideLayout','../slideLayouts/slideLayout1.xml')])
    overrides['ppt/slideLayouts/slideLayout1.xml'] = 'slideLayout'
    overrides['ppt/slideMasters/slideMaster1.xml'] = 'slideMaster'
    parts['ppt/presentation.xml'] = m.serialized(presentation)
    parts['ppt/_rels/presentation.xml.rels'] = relationships(links)
    types = ET.Element('{' + CT + '}Types')
    ET.SubElement(types, '{' + CT + '}Default', Extension='rels', ContentType='application/vnd.openxmlformats-package.relationships+xml')
    ET.SubElement(types, '{' + CT + '}Default', Extension='xml', ContentType='application/xml')
    for part, suffix in overrides.items():
        ET.SubElement(types, '{' + CT + '}Override', PartName='/' + part, ContentType=f'application/vnd.openxmlformats-officedocument.presentationml.{suffix}+xml')
    parts['[Content_Types].xml'] = m.serialized(types)
    with zipfile.ZipFile(directory / 'presentation.pptx', 'w') as z:
        for name, data in parts.items():
            z.writestr(name, data)

with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    package(root/'old', ['old-1', 'old-2', 'omitted'])
    package(root/'new', ['new-1', 'new-2'])
    snapshots = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
    out = root/'out'
    (out/'export-validation').mkdir(parents=True)
    manifest = {'directories':[str(root/'old'),str(root/'new')], 'pageCounts':[3,2], 'pages':[{'package':0,'page':2},{'package':1,'page':1},{'package':1,'page':2},{'package':0,'page':1}], 'output':str(out)}
    file = root/'manifest.json'
    file.write_text(json.dumps(manifest))
    sys.argv = ['compose.py', str(file)]
    m.main()
    p = m.Package(out/'export-validation/composed.pptx')
    assert len(PdfReader(out/'document.pdf').pages) == len(p.slides) == 4
    assert [ET.fromstring(p.parts[s]).find('{' + P + '}cSld').get('name') for s in p.slides] == ['old-2','new-1','new-2','old-1']
    assert b'<Types xmlns="' in p.parts['[Content_Types].xml']
    assert all(hashlib.sha256(Path(name).read_bytes()).hexdigest() == digest for name,digest in snapshots.items())
    for part in p.parts:
        if not part.endswith('.rels'):
            continue
        owner = '' if part == '_rels/.rels' else part.replace('/_rels/', '/').removesuffix('.rels')
        assert all(m.target(owner, r.get('Target')) in p.parts for r in p.relationships(owner))
    # Unsupported external dependencies must fail rather than be silently dropped.
    source = m.Package(root/'old/presentation.pptx')
    link = ET.Element('{' + REL + '}Relationships')
    ET.SubElement(link, '{' + REL + '}Relationship', Id='external', Type=R+'/hyperlink', Target='https://example.invalid', TargetMode='External')
    source.parts[m.relpath(source.slides[0])] = m.serialized(link)
    try:
        m.compose_pptx([source], [(0,0)], root/'forbidden.pptx')
    except ValueError as error:
        assert 'External' in str(error)
    else:
        raise AssertionError('External dependency accepted')
    assert not (root/'forbidden.pptx').exists()
