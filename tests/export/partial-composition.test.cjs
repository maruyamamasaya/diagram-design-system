'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), os = require('node:os');
test('partial composition preserves native slide XML, notes, cyclic masters, order and source bytes', () => {
  const python = process.env.DIAGRAM_PYTHON || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
  const output = require('node:child_process').execFileSync(python, [path.join(__dirname, 'compose-fixture.py')], {encoding:'utf8'});
  assert.equal(JSON.parse(output).pptxPages,4);
});
