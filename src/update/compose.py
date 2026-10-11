"""Compose registered local deck pages, preserving native OOXML dependency graphs."""
import copy
import json
import posixpath as pp
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from pypdf import PdfReader, PdfWriter

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
for prefix, uri in [('p', P), ('r', R), ('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')]:
    ET.register_namespace(prefix, uri)

def xml(data):
    if b'<!DOCTYPE' in data or b'<!ENTITY' in data:
        raise ValueError('DTD/entity prohibited')
    return ET.fromstring(data)

def serialized(root):
    if root.tag.startswith('{' + CT + '}'):
        ET.register_namespace('', CT)
    elif root.tag.startswith('{' + REL + '}'):
        ET.register_namespace('', REL)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)

def relpath(part):
    return pp.join(pp.dirname(part), '_rels', pp.basename(part) + '.rels') if part else '_rels/.rels'

def target(part, value):
    resolved = pp.normpath(pp.join(pp.dirname(part), value)) if not value.startswith('/') else value[1:]
    if resolved.startswith('../') or resolved in ('.', '..') or '\\' in resolved:
        raise ValueError('Unsafe relationship target')
    return resolved

class Package:
    def __init__(self, file):
        with zipfile.ZipFile(file) as z:
            if len(z.namelist()) != len(set(z.namelist())):
                raise ValueError('Duplicate ZIP parts')
            self.parts = {name: z.read(name) for name in z.namelist() if not name.endswith('/')}
        self.types = xml(self.parts['[Content_Types].xml'])
        roots = self.relationships('')
        office = [r for r in roots if r.get('Type') == R + '/officeDocument']
        if len(office) != 1:
            raise ValueError('Missing presentation root')
        self.main = target('', office[0].get('Target'))
        self.presentation = xml(self.parts[self.main])
        links = {r.get('Id'): r for r in self.relationships(self.main)}
        self.slides = [target(self.main, links[s.get('{' + R + '}id')].get('Target')) for s in self.presentation.findall('p:sldIdLst/p:sldId', {'p': P})]
        self.overrides = {x.get('PartName')[1:]: x.get('ContentType') for x in self.types if x.tag == '{' + CT + '}Override'}
        self.defaults = {x.get('Extension'): x.get('ContentType') for x in self.types if x.tag == '{' + CT + '}Default'}

    def relationships(self, part):
        data = self.parts.get(relpath(part))
        return list(xml(data)) if data else []

def compose_pptx(packages, pages, output):
    baseline = packages[0]
    mappings, content, kinds = {}, {}, {}
    # Selected slide parts receive ordinary slideN.xml paths for compatibility.
    for i, (which, page) in enumerate(pages):
        key = (which, packages[which].slides[page])
        if key in mappings:
            raise ValueError('Duplicate selected slide')
        mappings[key] = f'ppt/slides/slide{i + 1}.xml'
    visiting = set()

    def clone(which, old):
        key = (which, old)
        if key not in mappings:
            directory, name = pp.split(old)
            mappings[key] = pp.join(directory, f'package{which}_{name}')
        new = mappings[key]
        if key in visiting:
            return new
        visiting.add(key)
        package = packages[which]
        if old not in package.parts:
            raise ValueError('Missing related OOXML part: ' + old)
        content[new] = package.parts[old]
        if old in package.overrides:
            kinds[new] = package.overrides[old]
        relationships = package.relationships(old)
        if relationships:
            root = ET.Element('{' + REL + '}Relationships')
            for relationship in relationships:
                r = copy.deepcopy(relationship)
                if r.get('TargetMode') == 'External':
                    raise ValueError('External relationships unsupported for local partial decks')
                dest = clone(which, target(old, r.get('Target')))
                r.set('Target', pp.relpath(dest, pp.dirname(new)))
                root.append(r)
            content[relpath(new)] = serialized(root)
        return new

    relationships = ET.Element('{' + REL + '}Relationships')
    def add_relation(kind, part):
        rid = 'rId' + str(len(relationships) + 1)
        ET.SubElement(relationships, '{' + REL + '}Relationship', Id=rid, Type=R + '/' + kind, Target=pp.relpath(part, 'ppt'))
        return rid

    presentation = copy.deepcopy(baseline.presentation)
    # Registered generated decks have no custom shows, sections or slide hyperlink lists.
    if presentation.find('{' + P + '}custShowLst') is not None or presentation.find('{' + P + '}extLst') is not None:
        raise ValueError('Custom shows/extended presentation structure unsupported')
    for kind in ('sldMasterIdLst', 'notesMasterIdLst', 'handoutMasterIdLst', 'sldIdLst'):
        element = presentation.find('{' + P + '}' + kind)
        if element is not None:
            presentation.remove(element)
    slide_list = ET.Element('{' + P + '}sldIdLst')
    for i, (which, page) in enumerate(pages):
        rid = add_relation('slide', clone(which, packages[which].slides[page]))
        ET.SubElement(slide_list, '{' + P + '}sldId', id=str(256 + i), attrib={'{' + R + '}id': rid})
    # Keep non-slide presentation settings from the baseline.
    for r in baseline.relationships(baseline.main):
        kind = r.get('Type').rsplit('/', 1)[-1]
        if kind in ('slide', 'slideMaster', 'notesMaster', 'handoutMaster'):
            continue
        if r.get('TargetMode') == 'External':
            raise ValueError('External presentation settings unsupported')
        add_relation(kind, clone(0, target(baseline.main, r.get('Target'))))
    position = 0
    for kind, child, mime in [('sldMasterIdLst', 'sldMasterId', 'slideMaster'), ('notesMasterIdLst', 'notesMasterId', 'notesMaster'), ('handoutMasterIdLst', 'handoutMasterId', 'handoutMaster')]:
        masters = sorted(name for name, typ in kinds.items() if typ == f'application/vnd.openxmlformats-officedocument.presentationml.{mime}+xml')
        if masters:
            element = ET.Element('{' + P + '}' + kind)
            for i, name in enumerate(masters):
                attrs = {'{' + R + '}id': add_relation(mime, name)}
                if child == 'sldMasterId':
                    attrs['id'] = str(2147483648 + i)
                ET.SubElement(element, '{' + P + '}' + child, attrs)
            presentation.insert(position, element)
            position += 1
    presentation.insert(position, slide_list)
    content['ppt/presentation.xml'] = serialized(presentation)
    content['ppt/_rels/presentation.xml.rels'] = serialized(relationships)
    kinds['ppt/presentation.xml'] = 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
    root_rels = ET.Element('{' + REL + '}Relationships')
    ET.SubElement(root_rels, '{' + REL + '}Relationship', Id='rId1', Type=R + '/officeDocument', Target='ppt/presentation.xml')
    for r in baseline.relationships(''):
        if r.get('Type') == R + '/officeDocument':
            continue
        if r.get('TargetMode') == 'External':
            raise ValueError('External package root unsupported')
        new = clone(0, target('', r.get('Target')))
        item = copy.deepcopy(r)
        item.set('Id', 'rId' + str(len(root_rels) + 1))
        item.set('Target', new)
        root_rels.append(item)
    content['_rels/.rels'] = serialized(root_rels)
    types = ET.Element('{' + CT + '}Types')
    defaults = {}
    for package in packages:
        for ext, typ in package.defaults.items():
            if ext in defaults and defaults[ext] != typ:
                raise ValueError('Conflicting OOXML content types')
            defaults[ext] = typ
    for ext, typ in sorted(defaults.items()):
        ET.SubElement(types, '{' + CT + '}Default', Extension=ext, ContentType=typ)
    for name, typ in sorted(kinds.items()):
        ET.SubElement(types, '{' + CT + '}Override', PartName='/' + name, ContentType=typ)
    content['[Content_Types].xml'] = serialized(types)
    with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(content.items()):
            z.writestr(name, data)
    result = Package(output)
    if len(result.slides) != len(pages):
        raise ValueError('Composed PPTX page count mismatch')
    # Prove each native slide XML was preserved byte-for-byte.
    for i, (which, page) in enumerate(pages):
        if result.parts[result.slides[i]] != packages[which].parts[packages[which].slides[page]]:
            raise ValueError('Native slide content changed')

def main():
    manifest = json.loads(Path(sys.argv[1]).read_text())
    directories = manifest['directories']
    pages = [(p['package'], p['page'] - 1) for p in manifest['pages']]
    readers = [PdfReader(str(Path(d) / 'document.pdf')) for d in directories]
    packages = [Package(Path(d) / 'presentation.pptx') for d in directories]
    for i, (reader, package) in enumerate(zip(readers, packages)):
        if len(reader.pages) != len(package.slides) or len(reader.pages) != manifest['pageCounts'][i]:
            raise ValueError('Source deck page count mismatch')
    writer = PdfWriter()
    for which, index in pages:
        page = readers[which].pages[index]
        if abs(float(page.mediabox.width) - 960) > .01 or abs(float(page.mediabox.height) - 540) > .01:
            raise ValueError('Unexpected PDF dimensions')
        writer.add_page(page)
    out = Path(manifest['output'])
    with (out / 'document.pdf').open('xb') as f:
        writer.write(f)
    if len(PdfReader(out / 'document.pdf').pages) != len(pages):
        raise ValueError('PDF page count mismatch')
    compose_pptx(packages, pages, out / 'export-validation' / 'composed.pptx')
    print(json.dumps({'pdfPages': len(pages), 'pptxPages': len(pages), 'nativeSlideXml': 'unchanged'}))

if __name__ == '__main__':
    main()
