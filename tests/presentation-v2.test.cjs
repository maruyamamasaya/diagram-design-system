"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { generatePresentation } = require("../src/presentation/engine.cjs");
const { validatePresentation } = require("../src/presentation/validate.cjs");
const dense = require("../examples/linux-operations/presentation-dense.json"),
  old = require("../examples/linux-operations/presentation.json");
const root = path.resolve(__dirname, "..");
const opts = {
  exportFormats: [],
  output: path.join(root, "outputs/phase65-tests"),
  browserPath:
    process.env.DIAGRAM_BROWSER ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  sourceFiles: { input: path.join(root, "examples/linux-operations/input.md") },
};
test("v2 preserves all source content and accepts bounded extra rows without changing v1", () => {
  assert.deepEqual(
    dense.slides.map((s) => s.content),
    old.slides.map((s) => s.content),
  );
  assert.deepEqual(
    dense.slides.map((s) => s.sourceReferences),
    old.slides.map((s) => s.sourceReferences),
  );
  const p = structuredClone(dense);
  p.slides = [p.slides[1]];
  p.slides[0].content.items = Array(6).fill("要点");
  assert.ok(validatePresentation(p));
  p.slides[0].templateId = "slide.bullet.v1";
  assert.throws(() => validatePresentation(p));
  p.slides[0].templateId = "slide.bullet.v2";
  p.slides[0].content.items.push("超過");
  assert.throws(() => validatePresentation(p));
});
test("v2 renders six variants in eight pages, removes repeated enclosures and preserves terms", async () => {
  const p = structuredClone(dense);
  p.presentationId = crypto.randomUUID();
  const r = await generatePresentation(p, opts);
  assert.equal(r.metadata.slides.length, 8);
  const v = JSON.parse(
    await fs.readFile(path.join(r.directory, "validation.json")),
  );
  assert.equal(
    v.slides.reduce((n, s) => n + s.report.shapes.length, 0),
    6,
  );
  for (const s of v.slides) {
    assert.ok(s.report.designQuality.minimumFontSize >= 20);
    assert.equal(s.report.checks.overlaps, "passed");
    assert.equal(s.report.checks.visualReview, "not_reviewed");
  }
  const values = v.slides[1].report.blocks.map((b) => b.original);
  for (const term of ["pwd", "ls", "cd", "cat"])
    assert.ok(values.includes(term));
});
test("v2 overlong table rows split without lost values or smaller text", async () => {
  const p = structuredClone(dense);
  p.presentationId = crypto.randomUUID();
  p.slides = [p.slides[2]];
  p.slides[0].content.columns = ["A", "B", "C", "D"];
  p.slides[0].content.rows = Array.from({ length: 8 }, (_, i) =>
    Array.from(
      { length: 4 },
      (_, j) => String(i) + String(j) + "説明".repeat(29),
    ),
  );
  const r = await generatePresentation(p, opts),
    v = JSON.parse(
      await fs.readFile(path.join(r.directory, "validation.json")),
    );
  assert.ok(r.metadata.slides.length > 1);
  assert.deepEqual(
    v.slides.flatMap((s) =>
      s.report.blocks
        .filter((b) => b.id.startsWith("value-"))
        .map((b) => b.original),
    ),
    p.slides[0].content.rows.flat(),
  );
});
