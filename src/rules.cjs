'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// Markdown remains the source of truth. Missing/changed token syntax fails closed.
async function loadRules(root) {
  const paths = ['AGENTS.md', 'rules/design.md', 'rules/layout.md', 'rules/content.md', 'rules/export.md', 'rules/quality.md', 'templates/roadmap.md'];
  const documents = {};
  const hashes = {};
  for (const p of paths) {
    documents[p] = await fs.readFile(path.join(root, p), 'utf8');
    hashes[p] = crypto.createHash('sha256').update(documents[p]).digest('hex');
  }
  const design = documents['rules/design.md'];
  const layout = documents['rules/layout.md'];
  function capture(text, regex, label) { const m = text.match(regex); if (!m) throw new Error(`Rule token not found: ${label}; update the engine adapter after rule changes.`); return Number(m[1]); }
  function table(label) { return capture(design, new RegExp(`\\|${label}\\|([0-9.]+)`), label); }
  const t = {
    width: capture(layout, /標準は(\d+) × \d+/, 'width'),
    height: capture(layout, /標準は\d+ × (\d+)/, 'height'),
    margin: capture(layout, /外周余白(\d+)/, 'margin'),
    grid: capture(layout, /配置グリッド(\d+)/, 'grid'),
    titleHeight: capture(layout, /タイトル領域の高さ(\d+)/, 'titleHeight'),
    titleGap: capture(layout, /その下に(\d+)の間隔/, 'titleGap'),
    padding: capture(layout, /カード内余白(\d+)/, 'padding'),
    gap: capture(layout, /カード間隔(\d+)/, 'gap'),
    clearance: capture(layout, /間隔(\d+)以上/, 'clearance'),
    footerReserve: capture(layout, /下端に(\d+)を予約/, 'footer'),
    titleSize: table('図のタイトル'), headingSize: table('セクション・カード見出し'),
    bodySize: table('本文・接続ラベル'), noteSize: table('注記・出典'),
    lineHeight: capture(design, /文字サイズの([0-9.]+)倍/, 'lineHeight'),
    stroke: table('通常の枠・接続線'), radius: table('角丸（採用時）')
  };
  const colors = {};
  for (const [key, label] of Object.entries({ink:'本文', muted:'補足', line:'罫線', panel:'薄い面'})) {
    const m = design.match(new RegExp(`${label} \x60(#[A-Fa-f0-9]{6})\x60`));
    if (!m) throw new Error(`Missing color: ${label}`);
    colors[key] = m[1];
  }
  return {tokens: t, colors, hashes};
}
module.exports = {loadRules};
