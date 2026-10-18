/** Offline preparation only. No AWS imports, credentials or deployment commands. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { emptyState } from '../src/lib/organization/model';
import { organizationKey } from '../src/lib/organization/service';
async function main() {
const root = path.resolve(__dirname, '../..');
const output = process.argv[2];
if (!output) throw Error('Supply a new output directory; existing directories are never overwritten');
const deployment = JSON.parse(await fs.readFile(path.join(root,'infra/phase11b2-deployment.json'),'utf8'));
const template = JSON.parse(await fs.readFile(path.join(root,'infra/organization-sync.proposed.json'),'utf8'));
const params = Object.fromEntries(deployment.parameters.map((p:{ParameterKey:string;ParameterValue:string})=>[p.ParameterKey,p.ParameterValue]));
const issuer = deployment.outputs.Issuer;
const subject = params.OwnerSubject;
if (typeof issuer !== 'string' || typeof subject !== 'string' || subject === 'UNCONFIGURED' || !subject) throw Error('Recorded owner missing; read-only live verification is required');
const libraryID = randomUUID().toUpperCase();
const key = organizationKey(issuer,subject);
const initial = JSON.stringify(emptyState(libraryID));
await fs.mkdir(output); // must be a fresh directory
await fs.writeFile(path.join(output,'initial-state.json'), initial, {flag:'wx'});
await fs.writeFile(path.join(output,'template.proposed.json'),JSON.stringify(template,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(output,'review.json'),JSON.stringify({status:'NOT_DEPLOYED_LIVE_DIFF_REQUIRED',stack:deployment.stackName,libraryID,key,initialStateBytes:Buffer.byteLength(initial),initialStateSHA256:createHash('sha256').update(initial).digest('hex'),parameters:[...Object.keys(template.Parameters).filter(k=>!['OrganizationLibraryID','OrganizationKeyHash','OrganizationEnabled'].includes(k)).map(ParameterKey=>({ParameterKey,UsePreviousValue:true})),{ParameterKey:'OrganizationLibraryID',ParameterValue:libraryID},{ParameterKey:'OrganizationKeyHash',ParameterValue:key.split('/')[3]},{ParameterKey:'OrganizationEnabled',ParameterValue:'false'}],initialization:'Only after approval: fixed-key PutObject with If-None-Match: *, ExpectedBucketOwner and AES256; never overwrite or automatically recreate missing state',code:'Replace CodeKey with reviewed immutable bundle key in the approved change; retain CursorSecret',activation:'Keep server/client disabled until reviewed initialization succeeds; enable in a second reviewed update'},null,2)+'\n',{flag:'wx'});
console.log('Prepared offline review bundle; no AWS calls. Library ID and fixed key retained in review.json.');

}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
