'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createUpdatePlan, diffSource, toMarkdown } = require('../src/update/plan.cjs');
const input = require('../examples/linux-operations/presentation-phase7.json');
const before = fs.readFileSync('examples/linux-operations/input.md', 'utf8');
const after = fs.readFileSync('examples/linux-operations/input-systemd.md', 'utf8');
test('Linux systemd insertion targets only slide 5 and preserves seven slides despite shifted lines', () => {
  const plan = createUpdatePlan(input, { input: before }, { input: after });
  assert.deepEqual(plan.regenerateSlideIds, [input.slides[4].slideId]);
  assert.equal(plan.keepSlideIds.length, 7);
  assert.equal(plan.reviewChanges.length, 0);
  assert.equal(plan.changes[0].type, 'added');
  assert.deepEqual(plan.changes[0].affectedSlideIds, [input.slides[4].slideId]);
  assert.match(toMarkdown(plan), /systemctl status/);
  assert.equal(createUpdatePlan(input, { input: before }, { input: before }).keepSlideIds.length, 8);
});
test('modification, deletion and missing/new sources remain traceable', () => {
  for (const [updated, type] of [[before.replace('pwd は現在位置', 'pwd は作業位置'), 'modified'], [before.split('\n').filter((_, i) => i !== 3).join('\n'), 'deleted']]) {
    const plan = createUpdatePlan(input, { input: before }, { input: updated });
    assert.equal(plan.changes[0].type, type);
    assert.deepEqual(plan.regenerateSlideIds, [input.slides[1].slideId]);
  }
  assert.equal(createUpdatePlan(input, { input: before }, {}).regenerateSlideIds.length, 8);
  const plan = createUpdatePlan(input, { input: before }, { input: before, extra: 'new' });
  assert.equal(plan.reviewChanges.length, 1);
  assert.equal(plan.keepSlideIds.length, 8);
});
test('uncertain locators, new sections, bounds and stale source hashes do not silently authorize regeneration', () => {
  const copy = structuredClone(input); copy.slides[4].sourceReferences[0].locator = 'section:障害';
  assert.equal(createUpdatePlan(copy, { input: before }, { input: after }).slides[4].regenerationRequired, null);
  const newSection = createUpdatePlan(input, { input: before }, { input: before + '## 新節\n追加情報\n' });
  assert.equal(newSection.reviewChanges.length, 1);
  assert.throws(() => createUpdatePlan(input, { input: after }, { input: after }), /hash mismatch/);
  assert.equal(diffSource('input', 'a\n'.repeat(1100), 'b\n'.repeat(1100))[0].type, 'unknown');
  assert.equal(diffSource('input', before, before.replace(/\n/g, '\r\n'))[0].type, 'unknown');
});
test('CLI writes JSON and Markdown without rendering and refuses overwriting', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'update-plan-'));
  try {
    const out = path.join(temp, 'plan');
    const args = ['src/update/cli.cjs', '--input', 'examples/linux-operations/presentation-phase7.json', '--before', 'examples/linux-operations/sources-before.json', '--after', 'examples/linux-operations/sources-systemd.json', '--output', out];
    assert.equal(spawnSync(process.execPath, args).status, 0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'update-plan.json'))).keepSlideIds.length, 7);
    assert.deepEqual(fs.readdirSync(out).sort(), ['update-plan.json', 'update-plan.md']);
    assert.notEqual(spawnSync(process.execPath, args).status, 0);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
