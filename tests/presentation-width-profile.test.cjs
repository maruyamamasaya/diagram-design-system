"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), crypto = require("node:crypto");
const { validatePresentation } = require("../src/presentation/validate.cjs");
const { generatePresentation } = require("../src/presentation/engine.cjs");
const fixture = require("../examples/linux-operations/presentation-dense.json");
function deck(profile, count) {
  const p = structuredClone(fixture);
  p.presentationId = crypto.randomUUID();
  p.slides = [p.slides.find(s => s.slideType === "table")];
  const c = p.slides[0].content;
  c.heading = "説明・具体例・条件を対応させる";
  c.columns = ["項目", "仕組みと理由", "具体例", "成立条件"].slice(0, count);
  if (count === 3) c.columns[2] = "成立条件";
  c.rows = Array.from({length: 8}, (_, i) => [
    "対象" + (i + 1), "判断の理由と対象の仕組みを同じ行で説明する。".repeat(2),
    "具体的な操作と結果を対応づけて示す。".repeat(2), "前提と例外を保持して誤解を防ぐ。".repeat(2),
  ].filter((_, j) => count !== 3 || j !== 2).slice(0, count));
  if (profile) c.widthProfile = profile;
  return p;
}
module.exports = { deck };
test("fixed profiles reject incompatible column counts and arbitrary widths", () => {
  for (const [profile, count] of [["label-detail",2],["label-detail-condition",3],["label-detail-example-condition",4]]) {
    assert.doesNotThrow(() => validatePresentation(deck(profile,count)));
    assert.throws(() => validatePresentation(deck(profile,count === 2 ? 3 : 2)), /column count/);
  }
  const p=deck("label-detail",2); p.slides[0].content.widthProfile=[1,3];
  assert.throws(() => validatePresentation(p), /schema/);
  p.slides[0].content.widthProfile="unknown";
  assert.throws(() => validatePresentation(p), /schema/);
});
test("fixed table widths preserve all cells across pagination; omitted width stays balanced", async () => {
  const root=path.resolve(__dirname,"..");
  const outputs=[];
  for (const [profile,count] of [[undefined,2],["balanced",2],["label-detail",2],["label-detail-condition",3],["label-detail-example-condition",4]]) {
    const p=deck(profile,count);
    const r=await generatePresentation(p,{
      root,output:path.join(root,"outputs/layout-profile-tests"),exportFormats:[],
      browserPath:process.env.DIAGRAM_BROWSER,
      sourceFiles:{input:path.join(root,"examples/linux-operations/input.md")},
    });
    const v=JSON.parse(await fs.readFile(path.join(r.directory,"validation.json")));
    assert.ok(v.slides.length>1);
    const blocks=v.slides.flatMap(s=>s.report.blocks.filter(b=>/^value-/.test(b.id)));
    assert.deepEqual(blocks.map(b=>b.original),p.slides[0].content.rows.flat());
    const columns=v.slides[0].report.blocks.filter(b=>/^column-/.test(b.id));
    const widths=columns.map(b=>b.w+32);
    if (!profile || profile === "balanced") assert.equal(widths[0],widths[1]);
    else assert.ok(widths[1]>widths[0]);
    outputs.push({profile:profile||"omitted",directory:r.directory,columns});
  }
  await fs.writeFile(path.join(root,"outputs/layout-profile-tests/evidence.json"),JSON.stringify(outputs,null,2));
});
