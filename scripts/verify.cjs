'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'full';
if (!['docs', 'fast', 'full'].includes(mode) || process.argv.length > 3) {
  console.error('Use npm run verify -- [docs|fast|full]');
  process.exit(2);
}
function run(command, args) {
  console.log(`Verify: ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ['scripts/check-docs.cjs']);
run('git', ['diff', '--check']);
if (mode !== 'docs') {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error('Start through npm run verify so the existing npm CLI can be reused.');
    process.exit(2);
  }
  run(process.execPath, [npmCli, 'test']);
  run(process.execPath, [npmCli, '--prefix', 'viewer', 'test']);
  run(process.execPath, [npmCli, '--prefix', 'viewer', 'run', 'typecheck']);
  if (mode === 'full') run(process.execPath, [npmCli, '--prefix', 'viewer', 'run', 'build']);
}
console.log(`Verify ${mode}: passed. Visual review, browser E2E and live AWS are separate.`);
