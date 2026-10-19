import { randomUUID } from 'node:crypto';
import { target } from './manifest';

export const BILLING_INTERVAL_MS = 7 * 86400000;
export const BILLING_MAX_PAGES = 2; // Per allocation. Never retry a paid CE request automatically.
export type BillingScope = 'diagram' | 'common';
export type BillingRow = {service: string; usageType: string; amountUSD: string};
export type BillingReport = {
  month: string; periodStart: string; periodEndExclusive: string; fetchedAt: string;
  estimated: boolean; currency: 'USD'; metric: 'UnblendedCost';
  diagram: BillingRow[]; common: BillingRow[]; diagramUSD: string; commonUSD: string;
};
export type BillingState = {schemaVersion: 1; nextRefreshAt: string; reservation: string; report?: BillingReport};
export type BillingReply = {status: 'ready' | 'pending' | 'allocationPending'; month: string; nextRefreshAt?: string; report?: BillingReport};
export type CostPage = {
  ResultsByTime?: {TimePeriod?: {Start?: string; End?: string}; Estimated?: boolean;
    Groups?: {Keys?: string[]; Metrics?: {UnblendedCost?: {Amount?: string; Unit?: string}}}[]}[];
  NextPageToken?: string;
};
export type CostQuery = {
  TimePeriod: {Start: string; End: string}; Granularity: 'MONTHLY'; Metrics: ['UnblendedCost'];
  GroupBy: {Type: 'DIMENSION'; Key: string}[];
  Filter: {And: [{Dimensions: {Key: 'LINKED_ACCOUNT'; Values: string[]}}, {Tags: {Key: string; Values?: string[]; MatchOptions: string[]}}]};
  NextPageToken?: string;
};
export interface BillingPort {
  read(): Promise<{state: BillingState; etag: string} | null>;
  // false means another process reserved the refresh first.
  write(state: BillingState, etag: string | null): Promise<string | false>;
  query(input: CostQuery, signal: AbortSignal): Promise<CostPage>;
}
const scale = 1000000000000n;
export function usdUnits(value: string): bigint {
  if (typeof value !== 'string' || !/^-?\d{1,12}(\.\d{1,12})?$/.test(value)) throw Error('INVALID_BILLING_AMOUNT');
  const negative = value.startsWith('-'), [whole, fraction = ''] = value.replace('-', '').split('.');
  return (BigInt(whole) * scale + BigInt(fraction.padEnd(12, '0'))) * (negative ? -1n : 1n);
}
export function usdString(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / scale}.${String(absolute % scale).padStart(12, '0')}`;
}
export function billingPeriod(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return {month: start.toISOString().slice(0, 7), start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10)};
}
export function validateBillingState(value: unknown): BillingState {
  const state = value as BillingState;
  if (!state || state.schemaVersion !== 1 || !Number.isFinite(Date.parse(state.nextRefreshAt)) ||
      typeof state.reservation !== 'string' || !/^[a-f0-9-]{36}$/.test(state.reservation)) throw Error('INVALID_BILLING_STATE');
  if (state.report) {
    const r = state.report;
    if (!/^\d{4}-\d{2}$/.test(r.month) || r.periodStart !== `${r.month}-01` ||
        !/^\d{4}-\d{2}-\d{2}$/.test(r.periodEndExclusive) || !(r.periodEndExclusive > r.periodStart) ||
        !Number.isFinite(Date.parse(r.fetchedAt)) || r.currency !== 'USD' || r.metric !== 'UnblendedCost' || typeof r.estimated !== 'boolean') throw Error('INVALID_BILLING_REPORT');
    for (const scope of ['diagram', 'common'] as const) {
      const rows = r[scope];
      if (!Array.isArray(rows) || rows.length > 5000) throw Error('INVALID_BILLING_REPORT');
      const seen = new Set<string>(); let sum = 0n;
      for (const row of rows) {
        if (!row || typeof row.service !== 'string' || !row.service || row.service.length > 256 ||
            typeof row.usageType !== 'string' || row.usageType.length > 256) throw Error('INVALID_BILLING_ROW');
        const key = JSON.stringify([row.service, row.usageType]);
        if (seen.has(key)) throw Error('DUPLICATE_BILLING_ROW');
        seen.add(key); sum += usdUnits(row.amountUSD);
      }
      if (sum !== usdUnits(r[`${scope}USD`])) throw Error('INVALID_BILLING_TOTAL');
    }
  }
  return state;
}
export async function fetchMonthlyBilling(port: BillingPort, now: Date): Promise<BillingReport> {
  const period = billingPeriod(now), signal = AbortSignal.timeout(9000);
  const report: BillingReport = {month: period.month, periodStart: period.start, periodEndExclusive: period.end,
    fetchedAt: now.toISOString(), estimated: false, currency: 'USD', metric: 'UnblendedCost', diagram: [], common: [], diagramUSD: '0', commonUSD: '0'};
  for (const scope of ['diagram', 'common'] as const) {
    let next: string | undefined; const cursors = new Set<string>(); const seen = new Set<string>(); let sum = 0n;
    for (let page = 0; ; page++) {
      if (page >= BILLING_MAX_PAGES) throw Error('BILLING_PAGE_LIMIT');
      const result = await port.query({TimePeriod: {Start: period.start, End: period.end}, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'],
        GroupBy: [{Type: 'DIMENSION', Key: 'SERVICE'}, {Type: 'DIMENSION', Key: 'USAGE_TYPE'}],
        Filter: {And: [{Dimensions: {Key: 'LINKED_ACCOUNT', Values: [target.expectedBucketOwner]}}, {Tags: {Key: 'Project', ...(scope === 'diagram' ? {Values: ['diagram-design-system'], MatchOptions: ['EQUALS']} : {MatchOptions: ['ABSENT']})}}]},
        ...(next ? {NextPageToken: next} : {})}, signal);
      if (!Array.isArray(result.ResultsByTime) || result.ResultsByTime.length !== 1) throw Error('INCOMPLETE_BILLING_PERIOD');
      const bucket = result.ResultsByTime[0];
      if (bucket.TimePeriod?.Start !== period.start || bucket.TimePeriod?.End !== period.end ||
          typeof bucket.Estimated !== 'boolean' || !Array.isArray(bucket.Groups)) throw Error('INVALID_BILLING_PERIOD');
      report.estimated ||= bucket.Estimated;
      for (const group of bucket.Groups) {
        if (!Array.isArray(group.Keys) || group.Keys.length !== 2 || group.Keys.some(x => typeof x !== 'string' || x.length > 256) || !group.Keys[0] || group.Metrics?.UnblendedCost?.Unit !== 'USD') throw Error('INVALID_BILLING_GROUP');
        const key = JSON.stringify(group.Keys);
        if (seen.has(key) || seen.size >= 5000) throw Error('INVALID_BILLING_GROUP');
        seen.add(key); const amount = usdUnits(group.Metrics.UnblendedCost.Amount!); sum += amount;
        report[scope].push({service: group.Keys[0], usageType: group.Keys[1], amountUSD: usdString(amount)});
      }
      next = result.NextPageToken;
      if (!next) break;
      if (typeof next !== 'string' || cursors.has(next)) throw Error('INVALID_BILLING_PAGINATION');
      cursors.add(next);
    }
    report[scope].sort((a, b) => a.service.localeCompare(b.service) || a.usageType.localeCompare(b.usageType));
    report[`${scope}USD`] = usdString(sum);
  }
  return report;
}
export class MonthlyBillingService {
  private pending?: Promise<BillingReply>;
  constructor(private port: BillingPort, private now: () => Date = () => new Date()) {}
  get(): Promise<BillingReply> {
    return this.pending ??= this.load().finally(() => { this.pending = undefined; });
  }
  private reply(state: BillingState, month: string): BillingReply {
    return {status: state.report?.month === month ? 'ready' : 'pending', month, nextRefreshAt: state.nextRefreshAt,
      ...(state.report?.month === month ? {report: state.report} : {})};
  }
  private async load(): Promise<BillingReply> {
    const now = this.now(), month = billingPeriod(now).month;
    const stored = await this.port.read();
    if (stored) validateBillingState(stored.state);
    if (stored && Date.parse(stored.state.nextRefreshAt) > now.getTime()) return this.reply(stored.state, month);
    // Reserve a full week before any paid request. Crashes and failed writes never reset this budget.
    const reservation: BillingState = {schemaVersion: 1, reservation: randomUUID(), nextRefreshAt: new Date(now.getTime() + BILLING_INTERVAL_MS).toISOString(), ...(stored?.state.report ? {report: stored.state.report} : {})};
    const etag = await this.port.write(reservation, stored?.etag ?? null);
    if (!etag) {
      const current = await this.port.read();
      if (!current) throw Error('BILLING_RESERVATION_UNAVAILABLE');
      validateBillingState(current.state); return this.reply(current.state, month);
    }
    try {
      const report = await fetchMonthlyBilling(this.port, now);
      report.fetchedAt = this.now().toISOString();
      // Advance to completion+7d as well, preserving a minimum interval even for long acquisitions.
      const final = {...reservation, nextRefreshAt: new Date(Math.max(now.getTime(), this.now().getTime()) + BILLING_INTERVAL_MS).toISOString(), report};
      if (!(await this.port.write(final, etag))) throw Error('BILLING_COMMIT_CONFLICT');
      return this.reply(final, month);
    } catch {
      // The durable reservation remains. Keep the old current-month result, never publish partial data.
      return this.reply(reservation, month);
    }
  }
}
