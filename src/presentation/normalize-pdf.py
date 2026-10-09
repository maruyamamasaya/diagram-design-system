"""Preserve PDF glyph drawing; repair shared-glyph ToUnicode aliases only when embedded fonts and source identify one character."""
import sys,json,re,unicodedata
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject,DecodedStreamObject
source,destination,expectedFile=sys.argv[1:4]
input=json.load(open(expectedFile,encoding='utf-8'))
expected=set(''.join(input['lines']))
aliases=input['aliases']
writer=PdfWriter();writer.clone_document_from_reader(PdfReader(source));seen=set();changes=[]
for page in writer.pages:
 for reference in page['/Resources'].get('/Font',{}).values():
  font=reference.get_object();key=id(font)
  if key in seen or '/ToUnicode' not in font:continue
  seen.add(key);raw=font['/ToUnicode'].get_object().get_data().decode('ascii')
  def pair(match):
   try:old=bytes.fromhex(match[2]).decode('utf-16-be')
   except (ValueError,UnicodeError):return match[0]
   new=aliases.get(old,old)
   # Never normalize source commands or intentionally supplied compatibility characters.
   if old!=new and all(c not in expected for c in old) and all(c in expected for c in new):
    changes.append({'from':old,'to':new});return match[1]+'<'+new.encode('utf-16-be').hex().upper()+'>'
   return match[0]
  def block(m):return re.sub(r'(<[0-9A-Fa-f]+>\s*)<([0-9A-Fa-f]+)>',pair,m[0])
  repaired=re.sub(r'\d+ beginbfchar[\s\S]*?endbfchar',block,raw)
  if repaired!=raw:
   stream=DecodedStreamObject();stream.set_data(repaired.encode('ascii'));font[NameObject('/ToUnicode')]=writer._add_object(stream)
with open(destination,'wb') as out:writer.write(out)
print(json.dumps({'toUnicodeCorrections':changes},ensure_ascii=True))
