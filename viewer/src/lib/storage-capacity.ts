import { ListObjectVersionsCommand, type ListObjectVersionsCommandOutput } from '@aws-sdk/client-s3';
import { s3 } from './store';
import { target } from './manifest';
import { error } from './config';

type Listing = (command: ListObjectVersionsCommand) => Promise<ListObjectVersionsCommandOutput>;
// No object keys or version identifiers leave this owner-only API.
export async function measureStorageCapacity(list: Listing) {
  let sizeBytes = 0, objectCount = 0, deleteMarkerCount = 0, standardOnly = true;
  let keyMarker: string | undefined, versionMarker: string | undefined;
  const seen = new Set<string>();
  const started = Date.now();
  function add(bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(sizeBytes + bytes)) error(502, 'INVALID_STORAGE_CAPACITY');
    sizeBytes += bytes;
  }
  for (let page = 0; ; page++) {
    // Fail as a whole rather than returning a partial capacity or timing out Lambda.
    if (page >= 100 || Date.now() - started > 8000) error(503, 'STORAGE_CAPACITY_LIMIT');
    const result = await list(new ListObjectVersionsCommand({
      Bucket: target.bucket, ExpectedBucketOwner: target.expectedBucketOwner,
      MaxKeys: 1000, KeyMarker: keyMarker, VersionIdMarker: versionMarker,
    }));
    for (const item of result.Versions ?? []) {
      if (typeof item.Key !== 'string' || !item.Key) error(502, 'INVALID_STORAGE_CAPACITY');
      add(item.Size!); objectCount++;
      if (item.StorageClass !== 'STANDARD') standardOnly = false;
    }
    for (const marker of result.DeleteMarkers ?? []) {
      if (typeof marker.Key !== 'string' || !marker.Key) error(502, 'INVALID_STORAGE_CAPACITY');
      // S3 charges delete markers as Standard storage for the UTF-8 key length.
      add(Buffer.byteLength(marker.Key, 'utf8')); deleteMarkerCount++;
    }
    if (!result.IsTruncated) break;
    if (!result.NextKeyMarker || !result.NextVersionIdMarker) error(502, 'INVALID_STORAGE_PAGINATION');
    const cursor = JSON.stringify([result.NextKeyMarker, result.NextVersionIdMarker]);
    if (seen.has(cursor)) error(502, 'INVALID_STORAGE_PAGINATION');
    seen.add(cursor); keyMarker = result.NextKeyMarker; versionMarker = result.NextVersionIdMarker;
  }
  return {scope: 'dedicated-bucket-all-versions', sizeBytes, objectCount, deleteMarkerCount, standardOnly, updatedAt: new Date().toISOString()};
}
let cached: { until: number; value: Awaited<ReturnType<typeof measureStorageCapacity>> } | undefined;
let pending: Promise<Awaited<ReturnType<typeof measureStorageCapacity>>> | undefined;
export async function storageCapacity() {
  if (cached && cached.until > Date.now()) return cached.value;
  if (!pending) {
    const signal = AbortSignal.timeout(9000);
    pending = measureStorageCapacity(command => s3().send(command, {abortSignal: signal})).then(value => {
      cached = {until: Date.now() + 60000, value}; return value;
    }).finally(() => { pending = undefined; });
  }
  return pending;
}
