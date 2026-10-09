"use strict";
function applyTemplateDefaults(input) {
  const result = structuredClone(input);
  if (Array.isArray(result.slides))
    for (const slide of result.slides)
      if (slide.templateId === undefined)
        slide.templateId = `slide.${slide.slideType}.v2`;
  return result;
}
module.exports = { applyTemplateDefaults };
