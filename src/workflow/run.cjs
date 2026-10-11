'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {generatePresentation, canonical} = require('../presentation/engine.cjs');
const {uploadDirectory} = require('../upload/workflow.cjs');
const {loadPresentation, safeRead} = require('../upload/presentation.cjs');
const {validateConfig} = require('../upload/metadata.cjs');
const hash = b => createHash('sha256').update(b).digest('hex');
async function json(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function save(file, value) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}
async function verifyApi(base, token, manifest, request = fetch) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('HTTPS API base required');
  if (!token) throw Error('API access token required');
  const get = async suffix => {
    const r = await request(url.href.replace(/\/$/, '') + suffix, {
      headers: {Authorization: 'Bearer ' + token}, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error('API verification failed');
    return r.json();
  };
  const detail = await get(`/diagrams/${manifest.diagramId}?version=${manifest.version}`);
  if (!manifest.files.every(f => detail.files?.some(d => d.name === f.name && d.sha256 === f.sha256 && d.sizeBytes === f.sizeBytes))) throw Error('API artifact mismatch');
  if (detail.id !== manifest.diagramId || detail.version !== manifest.version || !['png','pdf','pptx'].every(f => detail.formats?.includes(f))) throw Error('API detail mismatch');
  let cursor, found = false;
  const seen = new Set();
  for (let n = 0; n < 100; n++) {
    const page = await get('/diagrams?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    found ||= page.items?.some(x => x.id === manifest.diagramId && x.version >= manifest.version);
    if (found) return {list: 'passed', detail: 'passed'};
    cursor = page.nextCursor;
    if (!cursor || seen.has(cursor)) break;
    seen.add(cursor);
  }
  throw Error('API listing missing presentation');
}
async function run({input, sources, output, config, policy, review, apiBase, token, fontPath, browserPath}, dependencies = {}) {
  require('../presentation/validate.cjs').validatePresentation(require('../presentation/defaults.cjs').applyTemplateDefaults(input));
  const inputHash = hash(canonical(input));
  const sourceHashes = {};
  for (const [id, file] of Object.entries(sources || {})) sourceHashes[id] = hash(await fs.readFile(file));
  if (!Object.keys(sourceHashes).length) throw Error('Original source required');
  const fingerprint = hash(canonical({inputHash, sourceHashes}));
  const job = path.resolve(output, input.presentationId, 'workflow', String(input.version).padStart(6,'0'));
  await fs.mkdir(job, {recursive:true});
  const lock = await fs.open(path.join(job,'.lock'),'wx');
  let state;
  try {
    try {state = await json(path.join(job,'state.json'));} catch(e) {if(e.code !== 'ENOENT') throw e;}
    if (state && state.fingerprint !== fingerprint) throw Error('Input changed; use a new version');
    state ||= {fingerprint, inputHash, sourceHashes, attempt:0, stage:'pending'};
    if (!state.directory) {
      state.attempt++;
      state.stage = 'generating';
      await save(path.join(job,'state.json'),state);
      const result = await (dependencies.generate || generatePresentation)(input, {
        output:path.join(job,'attempts',String(state.attempt)), sourceFiles:sources, fontPath, browserPath,
      });
      state.directory = result.directory;
      state.stage = 'local';
      await save(path.join(job,'state.json'),state);
    }
    const storedInput = await json(path.join(state.directory,'source/presentation.json'));
    if (canonical(storedInput) !== canonical(require('../presentation/defaults.cjs').applyTemplateDefaults(input))) throw Error('Stored input mismatch');
    const meta = await json(path.join(state.directory,'metadata.json'));
    const packageHash = hash(await fs.readFile(path.join(state.directory,'metadata.json')));
    if (state.packageHash && state.packageHash !== packageHash) throw Error('Completed metadata changed; use a new version');
    if (!Object.entries(sourceHashes).every(([id,digest]) => meta.sources.some(s => s.sourceId === id && s.sha256 === digest))) throw Error('Source snapshot changed');
    // Check every local artifact, including SVG and thumbnails, before reuse or transmission.
    for (const descriptor of [...meta.slides.flatMap(s => s.artifacts), ...(meta.deckArtifacts || []), ...meta.sources]) {
      let bytes;
      try {bytes = await safeRead(state.directory, descriptor.path);}
      catch(e) {if (e.code === 'ENOENT' && descriptor.path.endsWith('.svg')) continue; throw e;}
      if (hash(bytes) !== descriptor.sha256 || (descriptor.sizeBytes !== undefined && bytes.length !== descriptor.sizeBytes)) throw Error('Local artifact integrity mismatch');
    }
    if (!['png','pdf','pptx'].every(f => meta.formats[f] === 'generated')) throw Error('All supported formats required');
    for (const descriptor of meta.slides.flatMap(s => s.artifacts).filter(a => a.path.endsWith('.svg'))) {
      await fs.unlink(path.join(state.directory,descriptor.path)).catch(e => {if(e.code !== 'ENOENT') throw e;});
    }
    state.svg = 'removed-after-export';
    const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    await fs.writeFile(path.join(state.directory,'preview.html'),`<!doctype html><meta charset="utf-8"><title>${escape(input.title)}</title><style>body{background:white;color:black;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}img{width:100%}</style><h1>${escape(input.title)}</h1><main>${meta.slides.map((_,i)=>`<figure><img src="thumbnails/${String(i+1).padStart(3,'0')}.png"><figcaption>${i+1}</figcaption></figure>`).join('')}</main>`);
    state.packageHash = packageHash;
    state.review = review?.packageHash === packageHash && review.contentAccuracy === 'passed' && review.visualReview === 'passed' ? 'passed' : 'pending';
    state.stage = 'local';
    if (policy) {
      const allowed = policy.classification === 'public' && policy.explicitlyApproved === true && policy.fingerprint === fingerprint && config?.approved === true && policy.destinationHash === hash(canonical(config));
      if (!allowed) {state.upload = 'blocked-policy';}
      else if(state.review !== 'passed') {state.upload = 'blocked-review';}
      else {
        validateConfig(config);
        // Existing uploader validates the package, size limits and immutable catalog.
        let storage = dependencies.storage;
        try {
          storage ||= new (require('../upload/s3-storage.cjs').S3Storage)(config);
          await uploadDirectory(state.directory,config,{storage,approveContent:true});
        } finally {if(!dependencies.storage) storage?.close();}
        state.upload = 'complete'; state.stage = 'uploaded'; state.api = {list:'pending',detail:'pending'};
        await save(path.join(job,'state.json'),state);
        const {manifest} = await loadPresentation(state.directory,config);
        state.api = await verifyApi(apiBase,token,manifest,dependencies.fetch);
        state.stage = 'complete';
      }
    }
    delete state.error; delete state.failedStage;
    await save(path.join(job,'state.json'),state);
    return state;
  } catch(e) {
    if(state) {state.failedStage = state.stage; state.error = 'WorkflowError'; await save(path.join(job,'state.json'),state);}
    throw Error('Workflow failed; local state preserved. Check inputs, runtime, approval or authentication and retry.');
  } finally {await lock.close(); await fs.unlink(path.join(job,'.lock'));}
}
module.exports = {run, verifyApi, hash};
