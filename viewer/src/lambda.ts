import { handle } from './lib/api';
import { organizationRuntime } from './lib/organization/runtime';
// API Gateway HTTP API payload v2. No local password/cookie routes are dispatched.
export function createHandler(dependencies: Parameters<typeof handle>[3] = {}) {
 return async function handler(event: {rawPath: string; rawQueryString?: string; headers?: Record<string,string>; body?: string; isBase64Encoded?: boolean; requestContext: {http: {method: string}}}) {
  if (process.env.VIEWER_AUTH_MODE !== 'oidc') throw Error('Lambda requires OIDC');
  const origin = process.env.VIEWER_ORIGIN!;
  const headers = {...event.headers, host: new URL(origin).host};
  const request = new Request(origin + event.rawPath + (event.rawQueryString ? '?' + event.rawQueryString : ''), {
    method: event.requestContext.http.method, headers,
    ...(event.body ? {body: event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body} : {})
  });
  const segments = event.rawPath.startsWith('/v1/') ? event.rawPath.slice(4).split('/') : [];
  const result = await handle(request, 'api', segments, dependencies);
  return {statusCode: result.status, headers: Object.fromEntries(result.headers), body: await result.text()};
}
}
// Disabled unless an explicitly reviewed deployment sets the feature flag.
export const handler = createHandler({organization: organizationRuntime()});
