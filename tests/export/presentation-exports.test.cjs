"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const {
  generatePresentation,
  hash,
} = require("../../src/presentation/engine.cjs");
const { exportPresentation } = require("../../src/presentation/export.cjs");
const fixture = require("../../examples/linux-operations/presentation-dense.json");
const root = path.resolve(__dirname, "../..");
const options = {
  output: path.join(root, "outputs/phase7-tests"),
  browserPath:
    process.env.DIAGRAM_BROWSER ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  sourceFiles: { input: path.join(root, "examples/linux-operations/input.md") },
};
for (const version of ["v1", "v2"])
  test(`${version} exports vector PDF and native editable PPTX with verified immutable inventory`, async () => {
    const p = structuredClone(fixture);
    p.presentationId = crypto.randomUUID();
    p.slides = [p.slides[0], p.slides[2], p.slides[4]];
    p.slides.forEach(
      (s) => (s.templateId = s.templateId.replace(/v[12]$/, version)),
    );
    const r = await generatePresentation(p, options);
    assert.equal(r.metadata.formats.pdf, "generated");
    assert.equal(r.metadata.formats.pptx, "generated");
    assert.equal(r.metadata.deckArtifacts.length, 2);
    for (const a of r.metadata.deckArtifacts)
      assert.equal(
        hash(await fs.readFile(path.join(r.directory, a.path))),
        a.sha256,
      );
    assert.ok(
      (await fs.readFile(path.join(r.directory, "document.pdf")))
        .subarray(0, 5)
        .toString() === "%PDF-",
    );
    const receipt = JSON.parse(
      await fs.readFile(
        path.join(r.directory, "export-validation/pptx-validation.json"),
        "utf8",
      ),
    );
    assert.ok(receipt);

    const python =
      process.env.DIAGRAM_PYTHON ||
      path.join(
        require("node:os").homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
      );
    const program =
      "import sys,json,re;from pypdf import PdfReader;from pathlib import Path;r=Path(sys.argv[1]);v=json.loads((r/'validation.json').read_text(encoding='utf-8'));pdf=PdfReader(r/'document.pdf');assert len(pdf.pages)==len(v['slides']);compact=lambda s:re.sub(r'\\s+','',s);assert all(compact(line) in compact(page.extract_text()) for page,slide in zip(pdf.pages,v['slides']) for b in slide['report']['blocks'] for line in b['lines'])";
    require("node:child_process").execFileSync(python, [
      "-c",
      program,
      r.directory,
    ]);
    await assert.rejects(
      exportPresentation(r.directory, options),
      /already exists/,
    );
    const schema = require("../../schemas/presentation-metadata.schema.json");
    assert.ok(
      new (require("ajv"))({ strict: true }).compile(schema)(r.metadata),
    );
  });
test("SVG integrity failure preserves local package and never creates PDF", async () => {
  const p = structuredClone(fixture);
  p.presentationId = crypto.randomUUID();
  p.slides = [p.slides[0]];
  const r = await generatePresentation(p, { ...options, exportFormats: [] });
  const svg = path.join(r.directory, r.metadata.slides[0].artifacts[0].path);
  await fs.appendFile(svg, "tamper");
  await assert.rejects(
    exportPresentation(r.directory, { ...options, formats: ["pdf"] }),
    /integrity mismatch/,
  );
  assert.ok(await fs.stat(svg));
  assert.ok(await fs.stat(path.join(r.directory, "slides/001/slide.png")));
  await assert.rejects(
    fs.stat(path.join(r.directory, "document.pdf")),
    /ENOENT/,
  );
  const f = JSON.parse(
    await fs.readFile(path.join(r.directory, "export-failure.json")),
  );
  assert.equal(f.localArtifactsPreserved, true);
});

test("fixed explanation widths survive native PPTX export and PDF text extraction", async () => {
  const p=structuredClone(fixture);
  p.presentationId=crypto.randomUUID();
  p.slides=[p.slides.find(s=>s.slideType === "table")];
  Object.assign(p.slides[0].content, {
    heading:"項目と説明を対応させる", columns:["項目","仕組みと条件"], widthProfile:"label-detail",
    rows:[["入力","原資料の前提と根拠を確認し、重要な条件を保持する。"],["出力","共通配置から生成し、文字と図の対応を確認する。"]],
  });
  const r=await generatePresentation(p,options);
  const python=process.env.DIAGRAM_PYTHON || path.join(require("node:os").homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe");
  const program=`import sys,zipfile,xml.etree.ElementTree as E,json,re
from pathlib import Path
from pypdf import PdfReader
r=Path(sys.argv[1]); ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(r/'presentation.pptx') as z:
 root=E.fromstring(z.read('ppt/slides/slide1.xml')); widths=[int(n.get('w')) for n in root.findall('.//a:tblGrid/a:gridCol',ns)]; assert len(widths)==2; assert abs(widths[1]/widths[0]-3)<0.001,widths
v=json.loads((r/'validation.json').read_text()); text=''.join(PdfReader(r/'document.pdf').pages[0].extract_text().split()); assert all(''.join(line.split()) in text for b in v['slides'][0]['report']['blocks'] for line in b['lines'])
print('Native PPTX width ratio 1:3; PDF text preserved')`;
  require("node:child_process").execFileSync(python,["-c",program,r.directory],{stdio:"inherit"});
  await fs.mkdir(path.join(root,"outputs/layout-profile-tests"), { recursive: true });
  await fs.writeFile(path.join(root,"outputs/layout-profile-tests/export-evidence.json"),JSON.stringify({directory:r.directory}));
});
