'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['AGENTS.md', 'README.md', 'CURRENT.md', 'ARCHITECTURE.md', 'CODEMAP.md', 'TESTING.md', 'OPERATIONS.md', 'viewer/AGENTS.md', 'src/upload/AGENTS.md', 'src/presentation/AGENTS.md'];
for (const dir of ['decisions', 'sessions']) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (name.endsWith('.md')) files.push(`${dir}/${name}`);
  }
}
let failures = 0;
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(root, path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      console.error(`${file}: missing link ${target}`);
      failures++;
    }
  }
}
console.log(`Navigation links: ${files.length} documents, ${failures} missing targets (anchors not checked).`);
process.exitCode = failures ? 1 : 0;
