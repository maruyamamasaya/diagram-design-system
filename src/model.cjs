'use strict';
const Ajv = require('ajv');
const schema = require('../schemas/diagram.schema.json');
const validateSchema = new Ajv({allErrors: true, strict: true}).compile(schema);

function validateInput(input, template = 'roadmap') {
  if (template !== 'roadmap') throw new Error(`Unsupported template: ${template}. Phase 2 supports roadmap only.`);
  if (!validateSchema(input)) throw new Error(`Invalid input: ${JSON.stringify(validateSchema.errors)}. Split dense roadmaps into separate inputs; no information will be dropped.`);
  const ids = input.steps.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error('Step IDs must be unique.');
  if (input.relations.length !== ids.length - 1) throw new Error('Explicit relations between every adjacent step are required; relations are never inferred.');
  const edges = new Set();
  for (const r of input.relations) {
    const index = ids.indexOf(r.from);
    if (index < 0 || ids[index + 1] !== r.to) throw new Error(`Unsupported relation ${r.from} -> ${r.to}: only forward adjacent steps are supported.`);
    const key = `${r.from}:${r.to}`;
    if (edges.has(key)) throw new Error('Duplicate relation.');
    edges.add(key);
    if (r.kind === 'prerequisite' && !r.label.includes('前提')) throw new Error('Prerequisite relation labels must include 前提.');
  }
  const strings = [];
  function visit(v) { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') Object.values(v).forEach(visit); }
  visit(input);
  if (strings.some(s => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(s))) throw new Error('Unsupported control character.');
  return input;
}
module.exports = {validateInput};
