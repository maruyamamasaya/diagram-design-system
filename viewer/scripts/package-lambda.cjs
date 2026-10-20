// Local packaging only. No AWS deployment or credential access.
const fs=require('node:fs/promises'),path=require('node:path');
const {build}=require('esbuild');
(async()=>{
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/phase11b2/lambda');
 const {createHash}=require('node:crypto');
 const revision=JSON.parse(await fs.readFile(path.join(root,'config/library-reader-contract.json'),'utf8'));
 if(revision.validatorSHA256!==createHash('sha256').update(await fs.readFile(path.join(root,'src/library/presentation-contract.cjs'))).digest('hex'))throw Error('Reader validator fingerprint is stale; update and verify the shared contract before packaging');
 for(const [file,hash] of Object.entries(revision.sourceSHA256))if(hash!==createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex'))throw Error('Stale reader contract source: '+file);
 await fs.mkdir(path.join(out,'viewer/config'),{recursive:true});await fs.mkdir(path.join(out,'src/upload'),{recursive:true});
 await build({entryPoints:[path.join(root,'viewer/src/lambda.ts')],outfile:path.join(out,'viewer/handler.cjs'),bundle:true,platform:'node',target:'node22',format:'cjs'});
 for(const file of ['metadata','s3-storage']) await build({entryPoints:[path.join(root,`src/upload/${file}.cjs`)],outfile:path.join(out,`src/upload/${file}.cjs`),bundle:true,platform:'node',target:'node22',format:'cjs'});
 await fs.copyFile(path.join(root,'viewer/config/tags.json'),path.join(out,'viewer/config/tags.json'));
 await fs.writeFile(path.join(out,'package.json'),'{}');
 await fs.writeFile(path.join(out,'index.cjs'),"process.chdir(__dirname + '/viewer'); exports.handler = require('./viewer/handler.cjs').handler;\n");
 console.log('Local Lambda bundle prepared: outputs/phase11b2/lambda (not deployed)');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
