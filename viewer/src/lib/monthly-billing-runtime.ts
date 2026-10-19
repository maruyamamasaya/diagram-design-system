import { createHash, createHmac } from 'node:crypto';
import { SignatureV4 } from '@smithy/signature-v4';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from './store';
import { target } from './manifest';
import { MonthlyBillingService, billingPeriod, validateBillingState, type BillingPort, type BillingState, type CostPage, type CostQuery } from './monthly-billing';

const key = 'library/billing/monthly.json';
const owner = {Bucket: target.bucket, ExpectedBucketOwner: target.expectedBucketOwner, Key: key};
const cacheMaxBytes = 256 * 1024;
const responseMaxBytes = 2 * 1024 * 1024;
function bytes(value: string | ArrayBuffer | ArrayBufferView) {
  return typeof value === 'string' ? Buffer.from(value) : ArrayBuffer.isView(value) ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
}
class Sha256 {
  private hash;
  constructor(secret?: string | ArrayBuffer | ArrayBufferView) { this.hash = secret ? createHmac('sha256', bytes(secret)) : createHash('sha256'); }
  update(data: string | ArrayBuffer | ArrayBufferView) { this.hash.update(bytes(data)); }
  async digest() { return this.hash.digest(); }
}
// The billing endpoint is always us-east-1, independently of the application region.
const hostname = 'ce.us-east-1.amazonaws.com';
export class S3BillingPort implements BillingPort {
  async read() {
    try {
      const result = await s3().send(new GetObjectCommand(owner), {abortSignal: AbortSignal.timeout(2500)});
      if (!result.ETag || result.ServerSideEncryption !== 'AES256' || !result.ContentLength || result.ContentLength > cacheMaxBytes || !result.Body) throw Error('INVALID_BILLING_CACHE');
      const data = await result.Body.transformToByteArray();
      if (data.length > cacheMaxBytes) throw Error('INVALID_BILLING_CACHE');
      return {state: validateBillingState(JSON.parse(Buffer.from(data).toString('utf8'))), etag: result.ETag};
    } catch (e) {
      if ((e as {name?: string}).name === 'NoSuchKey') return null;
      throw e;
    }
  }
  async write(state: BillingState, etag: string | null) {
    validateBillingState(state);
    const body = JSON.stringify(state);
    if (Buffer.byteLength(body) > cacheMaxBytes) throw Error('BILLING_CACHE_TOO_LARGE');
    try {
      const result = await s3().send(new PutObjectCommand({...owner, Body: body, ContentType: 'application/json', ServerSideEncryption: 'AES256',
        ...(etag === null ? {IfNoneMatch: '*'} : {IfMatch: etag})}), {abortSignal: AbortSignal.timeout(2500)});
      if (!result.ETag) throw Error('BILLING_CACHE_ETAG_MISSING');
      return result.ETag;
    } catch (e) {
      if ([409, 412].includes((e as {$metadata?: {httpStatusCode?: number}}).$metadata?.httpStatusCode ?? 0)) return false;
      throw e;
    }
  }
  async query(input: CostQuery, signal: AbortSignal): Promise<CostPage> {
    // fetch has no automatic retries. Each attempted page counts against the weekly reservation.
    const signed = await new SignatureV4({credentials: fromNodeProviderChain(), region: 'us-east-1', service: 'ce', sha256: Sha256}).sign({
      method: 'POST', protocol: 'https:', hostname, path: '/', headers: {host: hostname, 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSInsightsIndexService.GetCostAndUsage'}, body: JSON.stringify(input),
    });
    const response = await fetch(`https://${hostname}/`, {method: 'POST', headers: signed.headers, body: signed.body, redirect: 'error', signal});
    if (!response.ok) throw Error('BILLING_UPSTREAM_UNAVAILABLE');
    const reader = response.body?.getReader();
    if (!reader) throw Error('BILLING_EMPTY_RESPONSE');
    const chunks: Buffer[] = []; let size = 0;
    try {
      for (;;) {
        const {done, value} = await reader.read(); if (done) break;
        size += value.length;
        if (size > responseMaxBytes) throw Error('BILLING_RESPONSE_TOO_LARGE');
        chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel(); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
}
let service: MonthlyBillingService | undefined;
export function monthlyBillingRuntime() {
  if (process.env.VIEWER_BILLING_ENABLED !== 'true') return undefined;
  // Allocation is an operator-verified prerequisite; never present missing activation as diagram cost zero.
  if (process.env.VIEWER_BILLING_ALLOCATION_READY !== 'true') return {get: async () => ({status: 'allocationPending' as const, month: billingPeriod(new Date()).month})};
  return service ??= new MonthlyBillingService(new S3BillingPort());
}
