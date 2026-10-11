'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const { generatePresentation, canonical, hash } = require('../presentation/engine.cjs');
const { validatePresentation } = require('../presentation/validate.cjs');
const { createUpdatePlan } = require('./plan.cjs');
const validateMetadata = new (require('ajv'))({ strict: true, allErrors: true }).compile(require('../../schemas/presentation-metadata.schema.json'));
const json = bytes => JSON.parse(bytes.toString('utf8'));
async function readSafe(directory, name, descriptor) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name) || name.split('/').some(p => !p || p === '.' || p === '..')) throw Error('Unsafe package path');
  let file = directory;
  for (const part of name.split('/')) {
    file = path.join(file, part);
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink()) throw Error('Symlink package path');
  }
  if (!(await fs.stat(file)).isFile()) throw Error('Package path must be a file');
  const bytes = await fs.readFile(file);
  if (descriptor && (hash(bytes) !== descriptor.sha256 || (descriptor.sizeBytes !== undefined && bytes.length !== descriptor.sizeBytes))) throw Error('Package integrity mismatch: ' + name);
  return bytes;
}
const excerpt = (text, locator) => { const m = /^lines:(\d+)-(\d+)$/.exec(locator); if (!m) throw Error('Unsupported source locator'); return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').slice(+m[1] - 1, +m[2]).join('\n'); };
const comparable = slide => { const value = structuredClone(slide); delete value.sourceReferences; return canonical(value); };
async function prepare({ baseline, plan, input, sourceFiles }) {
  baseline = await fs.realpath(baseline);
  const baselineBytes = await readSafe(baseline, 'metadata.json');
  const metadata = json(baselineBytes);
  if (!validateMetadata(metadata)) throw Error('Invalid baseline metadata');
  const original = validatePresentation(json(await readSafe(baseline, 'source/presentation.json')));
  input = validatePresentation(require('../presentation/defaults.cjs').applyTemplateDefaults(input));
  if (original.presentationId !== metadata.presentationId || original.version !== metadata.presentationVersion || input.presentationId !== original.presentationId || input.version <= original.version || input.version > 999999) throw Error('New version must retain presentationId and increase version');
  const before = Object.create(null), after = Object.create(null), snapshots = [];
  for (const src of metadata.sources) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(src.sourceId)) throw Error('Unsafe baseline sourceId');
    const bytes = await readSafe(baseline, src.path, src);
    if (hash(bytes) !== src.sourceVersion) throw Error('Invalid baseline source version');
    snapshots.push({ descriptor: src, bytes });
  }
  for (const ref of original.slides.flatMap(s => s.sourceReferences || [])) {
    const src = snapshots.find(s => s.descriptor.sourceId === ref.sourceId && s.descriptor.sourceVersion === ref.sourceVersion);
    if (!src) throw Error('Missing baseline source snapshot');
    before[ref.sourceId] = src.bytes.toString('utf8');
  }
  for (const [id, file] of Object.entries(sourceFiles || {})) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) throw Error('Unsafe sourceId');
    after[id] = (await fs.readFile(file)).toString('utf8');
  }
  const expected = createUpdatePlan(original, before, after);
  if (canonical(plan) !== canonical(expected)) throw Error('Update plan does not match baseline and updated sources');
  if (expected.reviewSlideIds.length || expected.reviewChanges.length) return { held: { status: 'held', reviewSlideIds: expected.reviewSlideIds, reviewChanges: expected.reviewChanges } };
  if (canonical(input.references) !== canonical(original.references)) throw Error('Reference declarations changed outside update plan');
  const oldIds = new Set(original.slides.map(s => s.slideId));
  if (input.slides.some(s => !oldIds.has(s.slideId))) throw Error('New logical slide IDs require a separately reviewed plan');
  for (const slide of input.slides) {
    const old = original.slides.find(s => s.slideId === slide.slideId);
    if (expected.keepSlideIds.includes(slide.slideId) && comparable(slide) !== comparable(old)) throw Error('Keep slide content/layout/version changed');
    if (expected.regenerateSlideIds.includes(slide.slideId) && (slide.slideVersion || 1) <= (old.slideVersion || 1)) throw Error('Updated slideVersion must increase');
    if (expected.keepSlideIds.includes(slide.slideId) && ((slide.sourceReferences || []).length !== old.sourceReferences.length || slide.sourceReferences.some((ref, i) => ref.sourceId !== old.sourceReferences[i].sourceId || !(ref.sourceId in after) || excerpt(after[ref.sourceId], ref.locator) !== excerpt(before[ref.sourceId], old.sourceReferences[i].locator)))) throw Error('Keep slide source mapping changed');
    if (!slide.sourceReferences?.length) throw Error('Explicit current sourceReferences required');
    for (const ref of slide.sourceReferences) {
      if (!(ref.sourceId in after) || hash(after[ref.sourceId]) !== ref.sourceVersion) throw Error('Updated source hash mismatch');
      const m = /^lines:(\d+)-(\d+)$/.exec(ref.locator), rows = after[ref.sourceId].replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
      if (!m || +m[1] < 1 || +m[2] < +m[1] || +m[2] > rows.length) throw Error('Updated source locator invalid');
    }
  }
  if (expected.keepSlideIds.some(id => !input.slides.some(s => s.slideId === id))) throw Error('Keep slide cannot be removed');
  const validation = json(await readSafe(baseline, 'validation.json'));
  if (validation.slides?.length !== metadata.slides.length) throw Error('Baseline validation count mismatch');
  const pageIds = new Set(), groups = new Map();
  for (let i = 0; i < metadata.slides.length; i++) {
    const page = metadata.slides[i], slide = original.slides.find(s => s.slideId === page.slideId), v = validation.slides[i];
    const group = groups.get(page.slideId) || [];
    if (!slide || pageIds.has(page.pageId) || page.pageId !== `${page.slideId}-part-${page.part}` || page.part !== group.length + 1 || page.templateId !== slide.templateId || page.slideVersion !== (slide.slideVersion || 1) || v.slideId !== page.slideId || v.part !== page.part || !['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].every(k => v.report?.checks?.[k] === 'passed')) throw Error('Baseline page identity/checks mismatch');
    pageIds.add(page.pageId); group.push(i); groups.set(page.slideId, group);
    const n = String(i + 1).padStart(3, '0');
    if (canonical(page.artifacts.map(a => a.path).sort()) !== canonical([`slides/${n}/slide.svg`, `slides/${n}/slide.png`, `thumbnails/${n}.png`].sort())) throw Error('Invalid baseline artifact paths');
    for (const a of page.artifacts) {
      try { await readSafe(baseline, a.path, a); }
      catch (e) { if (!(a.path.endsWith('.svg') && e.code === 'ENOENT')) throw e; }
    }
  }
  if (canonical([...groups.keys()]) !== canonical(original.slides.map(s => s.slideId))) throw Error('Baseline logical slide order mismatch');
  for (const name of ['document.pdf', 'presentation.pptx']) {
    const matches = metadata.deckArtifacts?.filter(a => a.path === name);
    if (matches?.length !== 1) throw Error('Baseline PDF/PPTX required');
    await readSafe(baseline, name, matches[0]);
  }
  return { baseline, metadata, original, input, expected, snapshots, validation, groups, baselineHash: hash(baselineBytes), after };
}
async function composeDecks(manifest, directory) {
  const file = path.join(directory, 'export-validation/composition.json');
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));
  const python = process.env.DIAGRAM_PYTHON || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
  const report = JSON.parse((await execFile(python, [path.join(__dirname, 'compose.py'), file])).stdout);
  const skill = process.env.DIAGRAM_PRESENTATIONS_SKILL || path.join(os.homedir(), '.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations');
  process.env.RUNTIME_NODE_MODULES ||= path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
  await fs.mkdir(path.join(directory, 'export-validation/final'));
  await finalizePresentation({ workspaceDir: directory, candidatePath: path.join(directory, 'export-validation/composed.pptx'), finalPath: path.join(directory, 'export-validation/final/presentation.pptx'), pythonExecutable: python, integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'), layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'), layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit', ...manifest.tableOwners.flatMap(n => ['--require-native-table-slide', String(n)])], explicitTotalSlideCount: manifest.pages.length, requiredNativeTableOwnerSlides: manifest.tableOwners, fontPolicy: { basis: 'design', families: ['Noto Sans JP', 'Noto Sans Mono'] }, verifyArtifactToolImport: true, receiptPath: path.join(directory, 'export-validation/pptx-validation.json') });
  await fs.copyFile(path.join(directory, 'export-validation/final/presentation.pptx'), path.join(directory, 'presentation.pptx'), require('node:fs').constants.COPYFILE_EXCL);
  return report;
}
async function regenerate(options, dependencies = {}) {
  const p = await prepare(options);
  if (p.held) return p.held;
  const { input, baseline, metadata: oldMeta } = p;
  const proposed = path.resolve(options.output, input.presentationId, 'versions', String(input.version).padStart(6, '0'));
  let ancestor = proposed; const suffix = [];
  while (true) {
    try { ancestor = await fs.realpath(ancestor); break; }
    catch(e) { if (e.code !== 'ENOENT') throw e; suffix.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  }
  const directory = path.join(ancestor, ...suffix);
  if (directory === baseline || directory.startsWith(baseline + path.sep)) throw Error('Output must not modify baseline');
  await fs.mkdir(path.dirname(directory), { recursive: true });
  await fs.mkdir(directory); // EEXIST: immutable versions, no overwrite/retry into incomplete packages.
  const reports = [], manifest = { directories: [baseline], pageCounts: [oldMeta.slides.length], pages: [], output: directory, tableOwners: [] };
  const meta = { ...structuredClone(oldMeta), presentationVersion: input.version, generatedAt: new Date().toISOString(), slides: [], sources: [], formats: { ...oldMeta.formats, pdf: 'not_requested', pptx: 'not_requested' } };
  delete meta.deckArtifacts;
  meta.update = { schemaVersion: 'partial-update-1.0', baselineVersion: oldMeta.presentationVersion, baselineMetadataHash: p.baselineHash, planHash: hash(canonical(options.plan)), inputHash: hash(canonical(input)), regeneratedSlideIds: p.expected.regenerateSlideIds.filter(id => input.slides.some(s => s.slideId === id)), reusedSlideIds: p.expected.keepSlideIds, removedSlideIds: p.expected.regenerateSlideIds.filter(id => !input.slides.some(s => s.slideId === id)), svgPolicy: 'removed-after-export', pages: [] };
  try {
    await fs.mkdir(path.join(directory, 'source'), { recursive: true });
    await fs.mkdir(path.join(directory, 'export-validation'));
    await fs.writeFile(path.join(directory, 'source/presentation.json'), JSON.stringify(input, null, 2));
    await fs.writeFile(path.join(directory, 'source/update-plan.json'), JSON.stringify(options.plan, null, 2));
    for (const { descriptor, bytes } of p.snapshots) {
      const name = `source/${descriptor.sourceId}-${descriptor.sourceVersion}.md`;
      if (!meta.sources.some(s => s.path === name)) { await fs.writeFile(path.join(directory, name), bytes, { flag: 'wx' }); meta.sources.push({ ...descriptor, path: name }); }
    }
    const currentSources = {};
    for (const [id, text] of Object.entries(p.after)) {
      const version = hash(text), name = `source/${id}-${version}.md`;
      if (!meta.sources.some(s => s.path === name)) { await fs.writeFile(path.join(directory, name), text, { flag: 'wx' }); meta.sources.push({ sourceId: id, sourceVersion: version, path: name, sha256: version }); }
      currentSources[id] = path.join(directory, name);
    }
    for (const slide of input.slides) {
      const reuse = p.expected.keepSlideIds.includes(slide.slideId);
      let from = baseline, pages = p.groups.get(slide.slideId), sourceMeta = oldMeta, validations = p.validation.slides, packageIndex = 0;
      if (!reuse) {
        const subset = { ...input, slides: [slide] };
        const result = await (dependencies.generate || generatePresentation)(subset, { root: options.root, output: path.join(directory, '.partial-work', slide.slideId), sourceFiles: currentSources, fontPath: options.fontPath, browserPath: options.browserPath, pageNumberStart: meta.slides.length + 1 });
        from = result.directory; sourceMeta = result.metadata;
        if (!validateMetadata(sourceMeta) || sourceMeta.font.sha256 !== oldMeta.font.sha256 || sourceMeta.codeFont.sha256 !== oldMeta.codeFont.sha256) throw Error('Updated rendering font/metadata mismatch');
        validations = json(await readSafe(from, 'validation.json')).slides;
        pages = sourceMeta.slides.map((_, i) => i);
        packageIndex = manifest.directories.length;
        manifest.directories.push(from); manifest.pageCounts.push(pages.length);
      }
      if (slide.slideType === 'diagram') {
        const name = `source/diagrams/${slide.content.diagram.diagramId}.json`, bytes = await readSafe(from, name, { sha256: slide.content.diagram.sha256 });
        await fs.mkdir(path.join(directory, 'source/diagrams'), { recursive: true });
        const dest = path.join(directory, name);
        try { await fs.writeFile(dest, bytes, { flag: 'wx' }); } catch(e) { if (e.code !== 'EEXIST' || hash(await fs.readFile(dest)) !== hash(bytes)) throw e; }
      }
      for (const pageIndex of pages) {
        const page = structuredClone(sourceMeta.slides[pageIndex]), n = String(meta.slides.length + 1).padStart(3, '0');
        if (page.slideId !== slide.slideId || page.part !== meta.slides.filter(s => s.slideId === slide.slideId).length + 1 || page.templateId !== slide.templateId || page.slideVersion !== (slide.slideVersion || 1)) throw Error('Generated page mapping mismatch');
        await fs.mkdir(path.join(directory, 'slides', n), { recursive: true });
        await fs.mkdir(path.join(directory, 'thumbnails'), { recursive: true });
        const copied = [];
        for (const descriptor of page.artifacts) {
          const name = descriptor.path.endsWith('/slide.svg') ? `slides/${n}/slide.svg` : descriptor.path.endsWith('/slide.png') ? `slides/${n}/slide.png` : `thumbnails/${n}.png`;
          // SVG is internal only. Existing missing SVG needs no reconstruction.
          if (!descriptor.path.endsWith('.svg')) {
            const bytes = await readSafe(from, descriptor.path, descriptor);
            await fs.writeFile(path.join(directory, name), bytes, { flag: 'wx' });
            if (hash(await fs.readFile(path.join(directory, name))) !== descriptor.sha256) throw Error('Copied artifact mismatch');
            copied.push({ from: descriptor.path, path: name, sha256: descriptor.sha256 });
          }
          descriptor.path = name;
        }
        const checked = validations[pageIndex];
        if (!checked || checked.slideId !== page.slideId || checked.part !== page.part || !['schema','glyphs','textBounds','overlaps','monochrome','pngDimensions'].every(k => checked.report?.checks?.[k] === 'passed')) throw Error('Updated page checks failed');
        meta.slides.push(page); reports.push(structuredClone(checked));
        manifest.pages.push({ package: packageIndex, page: pageIndex + 1 });
        if (slide.slideType === 'table') manifest.tableOwners.push(meta.slides.length);
        meta.update.pages.push({ pageId: page.pageId, slideId: page.slideId, part: page.part, pageNumber: meta.slides.length, action: reuse ? 'reused' : 'regenerated', fromVersion: reuse ? oldMeta.presentationVersion : input.version, fromPageNumber: pageIndex + 1, fromPageId: page.pageId, dependencyHash: sourceMeta.dependencyHash, artifacts: copied });
      }
    }
    const report = await (dependencies.compose || composeDecks)(manifest, directory);
    for (const name of ['document.pdf', 'presentation.pptx']) {
      const bytes = await fs.readFile(path.join(directory, name));
      (meta.deckArtifacts ||= []).push({ path: name, sizeBytes: bytes.length, sha256: hash(bytes) });
    }
    meta.formats.pdf = meta.formats.pptx = 'generated';
    meta.dependencyHash = hash(canonical(meta.update.pages.map(s => ({ pageId: s.pageId, dependencyHash: s.dependencyHash }))));
    meta.status = 'generated';
    if (!validateMetadata(meta)) throw Error('Updated metadata contract: ' + JSON.stringify(validateMetadata.errors));
    await fs.writeFile(path.join(directory, 'validation.json'), JSON.stringify({ slides: reports, contentAccuracy: 'not_reviewed', visualReview: 'not_reviewed', partialUpdate: { reuseHashes: 'passed', pageMapping: 'passed', composition: report } }, null, 2));
    await fs.writeFile(path.join(directory, 'metadata.json'), JSON.stringify(meta, null, 2));
    await fs.writeFile(path.join(directory, 'export-validation.json'), JSON.stringify({ composition: report, svg: 'removed-after-export', visualReview: 'not_reviewed' }, null, 2));
    await fs.rm(path.join(directory, '.partial-work'), { recursive: true, force: true });
    return { status: 'generated', directory, metadata: meta, regenerated: meta.update.regeneratedSlideIds.length, reused: meta.update.reusedSlideIds.length, pages: meta.slides.length };
  } catch(e) {
    await fs.writeFile(path.join(directory, 'validation.json'), JSON.stringify({ status: 'failed', message: e.message, localArtifactsPreserved: true }));
    throw e;
  }
}
module.exports = { regenerate, prepare, composeDecks, readSafe };
