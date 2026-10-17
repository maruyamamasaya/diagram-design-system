// Local build + common fixtures + disposable loopback. No deploy/credentials/AWS calls.
const path=require('node:path'), {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
if(Number(process.versions.node.split('.')[0])<22)throw Error('Use Node.js 22 or later');
const env={...process.env,CLANG_MODULE_CACHE_PATH:path.join(root,'mac-app/.build/clang-cache'),ORGANIZATION_SWIFT_BINARY:path.join(root,'packages/LibraryOrganization/.build/debug/OrganizationSyncMock')};
function run(command,args,cwd){const r=spawnSync(command,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run('swift',['build','--disable-sandbox','--package-path','packages/LibraryOrganization','--cache-path',path.join(root,'mac-app/.build/cache')],root);
run(process.execPath,['--import','tsx','--test','tests/organization.test.ts'],path.join(root,'viewer'));
run(process.execPath,['--import','tsx','scripts/check-organization-sync.ts'],path.join(root,'viewer'));
