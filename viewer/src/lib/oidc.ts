import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { error } from './config';
export function oidcSettings() {
  const issuer = process.env.VIEWER_OIDC_ISSUER || '';
  if (!/^https:\/\/cognito-idp\.ap-northeast-1\.amazonaws\.com\/ap-northeast-1_[A-Za-z0-9]+$/.test(issuer)) throw Error('Invalid Cognito issuer');
  const clientId = process.env.VIEWER_OIDC_CLIENT_ID || '';
  const owner = process.env.VIEWER_OIDC_OWNER_SUB || '';
  if (!clientId || !owner) throw Error('OIDC client and owner required');
  const clientIds = [clientId, ...(process.env.VIEWER_OIDC_ADDITIONAL_CLIENT_IDS || '').split(',').map(v=>v.trim()).filter(Boolean)];
  return { issuer, clientId, clientIds, owner, scope: 'diagram-library/read' };
}
let cached: {issuer: string; keys: JWTVerifyGetKey} | undefined;
export async function oidcPrincipal(req: Request, keys?: JWTVerifyGetKey, requiredScope = 'diagram-library/read') {
  const c = oidcSettings();
  const value = req.headers.get('authorization');
  if (!value?.startsWith('Bearer ') || value.length > 16384) error(401, 'UNAUTHENTICATED');
  if (!keys) {
    if (cached?.issuer !== c.issuer) cached = {issuer: c.issuer, keys: createRemoteJWKSet(new URL(c.issuer + '/.well-known/jwks.json'))};
    keys = cached!.keys;
  }
  let payload;
  try {
    ({payload} = await jwtVerify(value.slice(7), keys, {issuer: c.issuer, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub']}));
    if (payload.token_use !== 'access' || typeof payload.client_id !== 'string' || !c.clientIds.includes(payload.client_id) ||
        typeof payload.scope !== 'string' || (requiredScope === 'diagram-library/read' && !payload.scope.split(' ').includes(requiredScope)) ||
        typeof payload.sub !== 'string' || Number(payload.iat) > Date.now()/1000 + 30) error(401, 'UNAUTHENTICATED');
  } catch { error(401, 'UNAUTHENTICATED'); }
  // Every route authorizes the single owner's entire library. Authentication alone grants nothing.
  if (payload.sub !== c.owner) error(404, 'NOT_FOUND');
  if (!String(payload.scope).split(' ').includes(requiredScope)) error(403, 'INSUFFICIENT_SCOPE');
  return {sub: payload.sub, sid: '', issuer: c.issuer};
}
