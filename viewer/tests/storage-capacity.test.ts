import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureStorageCapacity } from '../src/lib/storage-capacity';
import { handle } from '../src/lib/api';
import { createSession, token } from '../src/lib/auth';
import { randomBytes, scryptSync } from 'node:crypto';
import { s3 } from '../src/lib/store';

test('all bucket versions, trash and management objects plus UTF-8 delete marker bytes; fixed owner and paired cursors', async () => {
  let calls = 0;
  const value = await measureStorageCapacity(async command => {
    assert.ok(command.input.ExpectedBucketOwner); assert.equal(command.input.Prefix, undefined);
    if (++calls === 1) return {$metadata: {}, Versions: [
      {Key:'library/diagrams/old', Size:100, StorageClass:'STANDARD'},
      {Key:'library/state/management', Size:20, StorageClass:'STANDARD'},
    ], DeleteMarkers:[{Key:'日本語'}], IsTruncated:true, NextKeyMarker:'next', NextVersionIdMarker:'version'};
    assert.equal(command.input.KeyMarker,'next'); assert.equal(command.input.VersionIdMarker,'version');
    return {$metadata:{}, Versions:[{Key:'library/diagrams/trashed', Size:80, StorageClass:'STANDARD'}]};
  });
  assert.equal(value.sizeBytes,209); assert.equal(value.objectCount,3); assert.equal(value.deleteMarkerCount,1);
  assert.equal(value.standardOnly,true); assert.equal(calls,2);
});
test('invalid sizes, broken pagination and partial failure never produce totals; non-Standard is explicit', async () => {
  for (const Size of [-1, NaN, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(measureStorageCapacity(async () => ({$metadata:{},Versions:[{Key:'x',Size}]})));
  }
  await assert.rejects(measureStorageCapacity(async () => ({$metadata:{},IsTruncated:true})));
  await assert.rejects(measureStorageCapacity(async () => ({$metadata:{},IsTruncated:true,NextKeyMarker:'x',NextVersionIdMarker:'v'})));
  let count=0;
  await assert.rejects(measureStorageCapacity(async () => {
    if (count++) throw Error('S3 unavailable');
    return {$metadata:{},Versions:[{Key:'x',Size:5}],IsTruncated:true,NextKeyMarker:'x',NextVersionIdMarker:'v'};
  }));
  assert.equal((await measureStorageCapacity(async () => ({$metadata:{},Versions:[{Key:'x',Size:0,StorageClass:'GLACIER' as 'STANDARD'}]}))).standardOnly,false);
  assert.equal((await measureStorageCapacity(async () => ({$metadata:{}}))).sizeBytes,0);
});
test('capacity endpoint authenticates before disabled feature and never falls back to catalog', async () => {
  process.env.VIEWER_SECRET=randomBytes(32).toString('hex');
  process.env.VIEWER_PASSWORD_HASH='test:'+scryptSync('password','test',64).toString('hex');
  process.env.VIEWER_OWNER='local-owner'; process.env.VIEWER_ORIGIN='http://127.0.0.1:3000'; process.env.VIEWER_STORAGE='mock';
  const url='http://127.0.0.1:3000/v1/storage-capacity';
  assert.equal((await handle(new Request(url),'api',['storage-capacity'])).status,401);
  const session=createSession(); const headers={Authorization:`Bearer ${await token(session.id,session.sub)}`};
  assert.equal((await handle(new Request(url,{headers}),'api',['storage-capacity'])).status,503);
  assert.equal((await handle(new Request(url+'?prefix=other',{headers}),'api',['storage-capacity'])).status,400);
});

test('enabled endpoint shares concurrent S3 scans and exposes no keys or versions', async () => {
  process.env.VIEWER_STORAGE='s3'; process.env.VIEWER_STORAGE_CAPACITY_ENABLED='true';
  const client=s3(), original=client.send;
  let calls=0;
  client.send=(async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 10));
    return {$metadata:{},Versions:[{Key:'private-key',VersionId:'private-version',Size:123,StorageClass:'STANDARD'}]};
  }) as typeof client.send;
  try {
    const session=createSession(); const headers={Authorization:`Bearer ${await token(session.id,session.sub)}`};
    const request=()=>handle(new Request('http://127.0.0.1:3000/v1/storage-capacity',{headers}),'api',['storage-capacity']);
    for(const result of await Promise.all([request(),request()])) {
      assert.equal(result.status,200); assert.equal(result.headers.get('Cache-Control'),'no-store');
      const body=await result.text(); assert.ok(!body.includes('private-')); assert.equal(JSON.parse(body).sizeBytes,123);
    }
    await request(); assert.equal(calls,1);
  } finally { client.send=original; process.env.VIEWER_STORAGE='mock'; delete process.env.VIEWER_STORAGE_CAPACITY_ENABLED; }
});
