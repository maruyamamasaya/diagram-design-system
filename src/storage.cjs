'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');

// Future S3 adapters implement the same write(name, bytes) contract.
class LocalStorage {
  constructor(directory) {this.directory=path.resolve(directory);}
  async write(name,bytes) {
    if(path.basename(name)!==name) throw new Error('Artifact name must be a filename.');
    await fs.mkdir(this.directory,{recursive:true});
    // Preserve existing results. A new run should use a new output subdirectory.
    await fs.writeFile(path.join(this.directory,name),bytes,{flag:'wx'});
  }
}
async function saveArtifacts(artifacts,storage) {
  await storage.write('diagram.svg',artifacts.svg);
  await storage.write('diagram.png',artifacts.png);
  await storage.write('input.json',Buffer.from(JSON.stringify(artifacts.input,null,2)+'\n'));
  await storage.write('validation.json',Buffer.from(JSON.stringify(artifacts.report,null,2)+'\n'));
}
module.exports={LocalStorage,saveArtifacts};
