"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { PNG } = require("pngjs");
const {
  generatePresentation,
  canonical,
  hash,
} = require("../src/presentation/engine.cjs");
const input = require("../examples/linux-operations/presentation.json");
const root = path.resolve(__dirname, "..");
const opts = {
  exportFormats: [],
  root,
  output: path.join(root, "outputs/phase6-tests"),
  browserPath:
    process.env.DIAGRAM_BROWSER ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  sourceFiles: { input: path.join(root, "examples/linux-operations/input.md") },
};
test("Linux Markdown references generate eight slides with all six types and immutable package", async () => {
  const v = structuredClone(input);
  v.presentationId = crypto.randomUUID();
  const result = await generatePresentation(v, opts);
  assert.equal(result.metadata.slides.length, 8);
  assert.equal(new Set(v.slides.map((x) => x.slideType)).size, 6);
  for (const slide of result.metadata.slides) {
    for (const a of slide.artifacts) {
      const b = await fs.readFile(path.join(result.directory, a.path));
      assert.equal(hash(b), a.sha256);
      if (a.path.endsWith("/slide.png")) {
        const p = PNG.sync.read(b);
        assert.deepEqual([p.width, p.height], [3200, 1800]);
      }
    }
    assert.ok(slide.sourceReferences[0].locator.startsWith("lines:"));
  }
  const validation = JSON.parse(
    await fs.readFile(path.join(result.directory, "validation.json")),
  );
  assert.equal(validation.contentAccuracy, "not_reviewed");
  assert.equal(result.metadata.formats.pptx, "not_requested");
  await assert.rejects(generatePresentation(v, opts), /EEXIST/);
});
test("table pagination preserves all rows, repeats headers and tracks source slide parts", async () => {
  const v = structuredClone(input);
  v.presentationId = crypto.randomUUID();
  v.slides = [structuredClone(v.slides[2])];
  v.slides[0].content.columns = ["A", "B", "C", "D"];
  v.slides[0].content.rows = Array.from({ length: 3 }, (_, i) =>
    Array.from(
      { length: 4 },
      (_, j) => String(i) + String(j) + "説明".repeat(29),
    ),
  );
  const result = await generatePresentation(v, opts);
  assert.ok(result.metadata.slides.length > 1);
  const validation = JSON.parse(
    await fs.readFile(path.join(result.directory, "validation.json")),
  );
  const values = validation.slides.flatMap((x) =>
    x.report.blocks
      .filter((b) => b.id.startsWith("value-"))
      .map((b) => b.original),
  );
  assert.deepEqual(values, v.slides[0].content.rows.flat());
  assert.equal(new Set(result.metadata.slides.map((s) => s.slideId)).size, 1);
});
test("canonical content hash ignores object insertion order", () => {
  assert.equal(
    hash(canonical({ b: 1, a: 2 })),
    hash(canonical({ a: 2, b: 1 })),
  );
});

test("source and diagram hash failures retain local inputs without publishing metadata", async () => {
  for (const kind of ["source", "diagram"]) {
    const v = structuredClone(input);
    v.presentationId = crypto.randomUUID();
    if (kind === "source")
      v.slides[0].sourceReferences[0].sourceVersion = "wrong";
    else {
      v.slides = [v.slides[4]];
      v.slides[0].content.diagram.sha256 = "0".repeat(64);
    }
    await assert.rejects(
      generatePresentation(v, opts),
      kind === "source"
        ? /Source reference version mismatch/
        : /Diagram hash mismatch/,
    );
    const dir = path.join(
      opts.output,
      v.presentationId,
      "versions",
      String(v.version).padStart(6, "0"),
    );
    const report = JSON.parse(
      await fs.readFile(path.join(dir, "validation.json")),
    );
    assert.equal(report.status, "failed");
    assert.ok(await fs.stat(path.join(dir, "source/presentation.json")));
    await assert.rejects(fs.stat(path.join(dir, "metadata.json")), /ENOENT/);
  }
});
