"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validatePresentation } = require("../src/presentation/validate.cjs");
const example = require("../examples/linux-presentation/source.json");
const registry = require("../config/slide-templates.json");
test("all six registered slide content contracts validate and have specs", () => {
  assert.equal(validatePresentation(example), example);
  assert.equal(registry.templates.length, 18);
  for (const t of registry.templates) {
    assert.ok(fs.existsSync(path.resolve(__dirname, "../config", t.spec)));
    assert.equal(t.rendererImplemented, true);
    assert.equal(t.visualValidation, "sample_reviewed");
  }
});
test("template/type mismatch, unknown layout and content overflow are rejected", () => {
  for (const change of [
    (p) => (p.slides[0].templateId = "slide.bullet.v1"),
    (p) => (p.slides[0].content.x = 42),
    (p) => (p.slides[0].content.heading = "あ".repeat(49)),
    (p) => (p.slides[1].content.items = Array(6).fill("要点")),
    (p) => (p.schemaVersion = "2.0"),
    (p) => (p.slides[2].content.rows[0].right = ""),
  ]) {
    const p = structuredClone(example);
    change(p);
    assert.throws(() => validatePresentation(p));
  }
});
test("cross-slide identities, references, table shape and path safety are enforced", () => {
  for (const change of [
    (p) => (p.slides[1].slideId = p.slides[0].slideId),
    (p) => p.references.push(p.references[0]),
    (p) => (p.slides[1].references = ["unknown"]),
    (p) => p.slides[4].content.rows[0].push("余分"),
    (p) => (p.slides[3].content.diagram.sourcePath = "../secrets.json"),
    (p) =>
      (p.slides[3].content.diagram.sourcePath = "https://example.com/a.svg"),
  ]) {
    const p = structuredClone(example);
    change(p);
    assert.throws(() => validatePresentation(p));
  }
});
test("unimplemented diagram types are representable without claiming rendering", () => {
  for (const type of ["roadmap", "flowchart", "architecture", "comparison"]) {
    const p = structuredClone(example);
    p.slides[3].content.diagramType = type;
    assert.ok(validatePresentation(p));
  }
});
