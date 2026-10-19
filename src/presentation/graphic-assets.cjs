"use strict";
const fs = require("node:fs/promises"), path = require("node:path"), crypto = require("node:crypto");
const { PNG } = require("pngjs");
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
function validateGraphicAssets(input) {
  if ((input.assets?.length || input.slides.some(s => s.slideType === "graphic")) && input.schemaVersion !== "1.3") throw Error("Graphic content requires schemaVersion 1.3");
  const assets = new Map();
  for (const asset of input.assets || []) {
    if (assets.has(asset.assetId)) throw Error("Duplicate assetId");
    if (!/^[A-Za-z0-9_\-./]+$/.test(asset.path) || asset.path.split('/').some(p => !p || p === '.' || p === '..') || path.isAbsolute(asset.path))
      throw Error("Unsafe asset path");
    if (!/\.(png|jpg|jpeg)$/i.test(asset.path)) throw Error("Unsupported asset format");
    if (!input.references.some(r => r.referenceId === asset.referenceId)) throw Error("Unresolved asset reference");
    assets.set(asset.assetId, asset);
  }
  for (const slide of input.slides.filter(s => s.slideType === 'graphic')) {
    const c = slide.content;
    for (const image of c.images || (c.image ? [c.image] : [])) {
      const asset = assets.get(image.assetId);
      if (!asset) throw Error("Unresolved graphic asset");
      if (!slide.references.includes(asset.referenceId)) throw Error("Asset reference missing from slide");
    }
    if (c.nodes) {
      const ids = new Set(c.nodes.map(n => n.id));
      if (ids.size !== c.nodes.length) throw Error("Duplicate graphic node");
      // Fixed left-to-right connections. Other topology needs a distinct registered layout.
      if (c.connections.length !== c.nodes.length - 1) throw Error("Incomplete graphic connections");
      c.connections.forEach((edge, i) => {
        if (edge.from !== c.nodes[i].id || edge.to !== c.nodes[i + 1].id)
          throw Error("Unsupported graphic connection order");
      });
    }
  }
}
async function readAssets(input, assetRoot) {
  validateGraphicAssets(input);
  const root = await fs.realpath(assetRoot), map = new Map();
  for (const asset of input.assets || []) {
    let file = root;
    for (const part of asset.path.split('/')) {
      file = path.join(file, part);
      if ((await fs.lstat(file)).isSymbolicLink()) throw Error("Asset symlink rejected");
    }
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 20_000_000) throw Error("Asset size/type rejected");
    const bytes = await fs.readFile(file);
    if (hash(bytes) !== asset.sha256) throw Error("Asset hash mismatch");
    let width, height, mime;
    if (/\.png$/i.test(asset.path)) {
      // Reject oversized decoded allocations before decoding pixels.
      if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || bytes.length < 24) throw Error('Invalid PNG asset');
      width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); mime = 'image/png';
      if (width * height > 40_000_000) throw Error('Asset pixel limit');
      PNG.sync.read(bytes);
    } else {
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw Error('Invalid JPEG asset');
      let offset = 2;
      while (offset + 8 < bytes.length) {
        if (bytes[offset] !== 255) throw Error('Invalid JPEG marker');
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 0xda || marker === 0xd9) break;
        const length = bytes.readUInt16BE(offset);
        if (length < 2 || offset + length > bytes.length) throw Error('Invalid JPEG segment');
        if ([0xc0,0xc1,0xc2].includes(marker)) {
          height = bytes.readUInt16BE(offset+3); width = bytes.readUInt16BE(offset+5); break;
        }
        offset += length;
      }
      if (!width || !height || width * height > 40_000_000) throw Error('JPEG dimensions rejected');
      mime = 'image/jpeg';
    }
    map.set(asset.assetId, { ...asset, bytes, width, height, mime });
  }
  return map;
}
async function snapshotAssets(assets, directory) {
  if (!assets.size) return [];
  await fs.mkdir(path.join(directory, 'source/assets'), {recursive:true});
  const descriptors = [];
  for (const asset of assets.values()) {
    const name = `source/assets/${asset.assetId}${asset.mime === 'image/png' ? '.png' : '.jpg'}`;
    await fs.writeFile(path.join(directory,name),asset.bytes,{flag:'wx'});
    const {bytes,width,height,mime,...provenance} = asset;
    descriptors.push({...provenance,path:name,sizeBytes:bytes.length});
  }
  return descriptors;
}
module.exports = { validateGraphicAssets, readAssets, snapshotAssets };
