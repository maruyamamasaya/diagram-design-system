'use strict';
const fs = require('node:fs/promises'), path = require('node:path');
const { regenerate } = require('./regenerate.cjs');
async function main() {
  const args = process.argv.slice(2), opts = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--baseline','--plan','--input','--sources','--output','--font','--browser'].includes(args[i]) || !args[i + 1] || opts[args[i].slice(2)]) throw Error('Use --baseline PACKAGE --plan JSON --input UPDATED_JSON --sources SOURCE_MAP --output ROOT [--font TTF] [--browser CHROME]');
    opts[args[i].slice(2)] = args[i + 1];
  }
  for (const key of ['baseline','plan','input','sources','output']) if (!opts[key]) throw Error('Missing --' + key);
  const mapping = JSON.parse(await fs.readFile(opts.sources, 'utf8'));
  if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object' || Object.values(mapping).some(s => typeof s !== 'string')) throw Error('Invalid source file mapping');
  const result = await regenerate({ baseline: opts.baseline, plan: JSON.parse(await fs.readFile(opts.plan, 'utf8')), input: JSON.parse(await fs.readFile(opts.input, 'utf8')), sourceFiles: Object.fromEntries(Object.entries(mapping).map(([id, file]) => [id, path.resolve(path.dirname(opts.sources), file)])), output: opts.output, fontPath: opts.font, browserPath: opts.browser });
  console.log(JSON.stringify({ ...result, metadata: undefined }));
  if (result.status === 'held') process.exitCode = 2;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
