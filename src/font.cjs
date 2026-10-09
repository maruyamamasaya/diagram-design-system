'use strict';
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const fontkit = require('fontkit');

async function loadFont(file, visibleStrings, family='DiagramJP') {
  const bytes = await fs.readFile(file);
  const font = fontkit.create(bytes);
  if (font.fonts) throw new Error('Font collections are unsupported; provide a standalone TTF/OTF.');
  const names = font.name?.records || {};
  const nameText = JSON.stringify(names);
  // Only embed fonts with explicit OFL metadata; preserve complete license records.
  if (!/Open Font License/i.test(nameText)) throw new Error('Font must contain Open Font License metadata to embed it.');
  const missing = [...new Set(visibleStrings.join(''))].filter(c => !/\s/u.test(c) && !font.hasGlyphForCodePoint(c.codePointAt(0)));
  if (missing.length) throw new Error(`Font missing glyphs: ${missing.join('')}`);
  return {
    ensureGlyphs(text) { const missing=[...new Set(text)].filter(c=>!/\s/u.test(c)&&!font.hasGlyphForCodePoint(c.codePointAt(0)));if(missing.length) throw new Error(`Font missing glyphs: ${missing.join('')}`); },
    css: `@font-face{font-family:${family};src:url(data:font/${file.toLowerCase().endsWith('.otf')?'otf':'ttf'};base64,${bytes.toString('base64')});font-weight:100 900;font-style:normal;}`,
    info: {family: font.familyName, fullName: font.fullName, version: names.version || 'see name records', source: file,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'), license: 'SIL Open Font License (font metadata checked)', nameRecords: names}
  };
}
module.exports = {loadFont};
