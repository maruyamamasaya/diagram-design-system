"use strict";
const Ajv = require("ajv");
const schema = require("../../schemas/presentation.schema.json");
const registry = require("../../config/slide-templates.json");
const profile = require("../../config/presentation-profile.json");
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);
function validatePresentation(value) {
  if (!validate(value))
    throw new Error("Presentation schema: " + JSON.stringify(validate.errors));
  const refs = new Set();
  for (const r of value.references) {
    if (refs.has(r.referenceId)) throw Error("Duplicate referenceId");
    refs.add(r.referenceId);
  }
  const ids = new Set();
  for (const slide of value.slides) {
    if (ids.has(slide.slideId)) throw Error("Duplicate slideId");
    ids.add(slide.slideId);
    if ((slide.sourceReferences || []).some((x) => !refs.has(x.sourceId)))
      throw Error("Unresolved sourceId");
    if (
      !registry.templates.some(
        (t) =>
          t.templateId === slide.templateId && t.slideType === slide.slideType,
      )
    )
      throw Error("Unregistered template");
    if (
      new Set(slide.references).size !== slide.references.length ||
      slide.references.some((r) => !refs.has(r))
    )
      throw Error("Unresolved or duplicate reference");
    if (
      slide.slideType === "table" &&
      slide.content.rows.some((r) => r.length !== slide.content.columns.length)
    )
      throw Error("Nonrectangular table");
    if (
      slide.slideType === "table" &&
      slide.content.widthProfile &&
      slide.content.widthProfile !== "balanced"
    ) {
      const widths = profile.tableWidthProfiles[slide.content.widthProfile];
      if (!widths || widths.length !== slide.content.columns.length)
        throw Error("Table width profile column count mismatch");
    }
    if (slide.slideType === "diagram") {
      const p = slide.content.diagram.sourcePath;
      if (
        !/^[A-Za-z0-9_　-鿿.-]+(?:\/[A-Za-z0-9_　-鿿.-]+)*$/.test(p) ||
        p.split("/").some((x) => x === "." || x === "..")
      )
        throw Error("Unsafe diagram path");
    }
  }
  return value;
}
module.exports = { validatePresentation };
