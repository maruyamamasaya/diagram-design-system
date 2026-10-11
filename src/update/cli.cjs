'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createUpdatePlan, toMarkdown } = require('./plan.cjs');
async function main() {
  const options = {}, args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--before', '--after', '--output'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw Error('Use --input presentation.json --before sources.json --after sources.json --output NEW_DIRECTORY');
    options[args[i]] = args[i + 1];
  }
  if (Object.keys(options).length !== 4) throw Error('All four arguments required');
  const input = JSON.parse(await fs.readFile(options['--input'], 'utf8'));
  async function readSources(file) {
    const mapping = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object') throw Error('Source mapping must be an object');
    const result = Object.create(null);
    for (const [id, source] of Object.entries(mapping)) {
      if (typeof source !== 'string') throw Error('Source path must be a string');
      result[id] = await fs.readFile(path.resolve(path.dirname(file), source), 'utf8');
    }
    return result;
  }
  const plan = createUpdatePlan(input, await readSources(options['--before']), await readSources(options['--after']));
  await fs.mkdir(options['--output'], { recursive: false });
  await fs.writeFile(path.join(options['--output'], 'update-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  await fs.writeFile(path.join(options['--output'], 'update-plan.md'), toMarkdown(plan), { flag: 'wx' });
  console.log(JSON.stringify({ update: plan.regenerateSlideIds.length, keep: plan.keepSlideIds.length, review: plan.reviewSlideIds.length, reviewChanges: plan.reviewChanges.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
