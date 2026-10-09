"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { applyTemplateDefaults } = require("../src/presentation/defaults.cjs");
const { segments } = require("../src/presentation/export.cjs");
test("new slides default to v2 without mutating input or migrating explicit v1", () => {
  const p = {
    slides: [
      { slideType: "title" },
      { slideType: "bullet", templateId: "slide.bullet.v1" },
    ],
  };
  const resolved = applyTemplateDefaults(p);
  assert.equal(resolved.slides[0].templateId, "slide.title.v2");
  assert.equal(resolved.slides[1].templateId, "slide.bullet.v1");
  assert.equal(p.slides[0].templateId, undefined);
});
test("editable path decomposition preserves arrow segments and refuses unsupported curves", () => {
  assert.deepEqual(segments("M10 20h24m-8 -6l8 6 -8 6"), [
    { x: 10, y: 20, nx: 34, ny: 20 },
    { x: 26, y: 14, nx: 34, ny: 20 },
    { x: 34, y: 20, nx: 26, ny: 26 },
  ]);
  assert.throws(() => segments("M0 0C10 20 30 40 50 60"), /Unsupported/);
  assert.deepEqual(segments("M1e-7 2h3"), [
    { x: 1e-7, y: 2, nx: 3.0000001, ny: 2 },
  ]);
});
