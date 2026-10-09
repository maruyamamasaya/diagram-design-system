import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config, error } from "./config";
type Session = { sub: string; csrf: string; exp: number };
const globalState = globalThis as typeof globalThis & {
  viewerSessions?: Map<string, Session>;
  viewerLimits?: Map<string, { count: number; until: number }>;
};
const sessions = (globalState.viewerSessions ??= new Map());
const limits = (globalState.viewerLimits ??= new Map());
export function rate(key: string, max = 120) {
  const now = Date.now();
  for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  const v = limits.get(key) || { count: 0, until: now + 60000 };
  if (++v.count > max) error(429, "RATE_LIMITED");
  limits.set(key, v);
}
export function origin(req: Request) {
  if (
    req.headers.get("origin") !== config().origin ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    error(403, "CSRF_REJECTED");
}
export async function json(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    error(400, "JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) error(400, "INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > 8192) {
      await reader.cancel();
      error(400, "BODY_TOO_LARGE");
    }
    chunks.push(part.value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      error(400, "INVALID_JSON");
    return value;
  } catch {
    error(400, "INVALID_JSON");
  }
}
export function password(value: unknown) {
  rate("login", 5);
  if (typeof value !== "string" || value.length > 256)
    error(401, "INVALID_CREDENTIALS");
  const [salt, expected] = config().hash.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected))
    throw Error("Invalid password configuration");
  const actual = scryptSync(value, salt, 64);
  if (!timingSafeEqual(actual, Buffer.from(expected, "hex")))
    error(401, "INVALID_CREDENTIALS");
}
export function createSession() {
  for (const [k, v] of sessions) if (v.exp < Date.now()) sessions.delete(k);
  if (sessions.size >= 20) error(429, "SESSION_LIMIT");
  const id = randomBytes(32).toString("base64url");
  const session = {
    sub: config().owner,
    csrf: randomBytes(32).toString("base64url"),
    exp: Date.now() + 8 * 3600000,
  };
  sessions.set(id, session);
  return { id, ...session };
}
export function web(req: Request, mutate = false) {
  const id = req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("viewer_session="))
    ?.split("=")[1];
  const s = id ? sessions.get(id) : null;
  if (!s || s.exp < Date.now()) error(401, "UNAUTHENTICATED");
  if (mutate) {
    origin(req);
    if (req.headers.get("x-csrf-token") !== s.csrf) error(403, "CSRF_REJECTED");
  }
  if (s.sub !== config().owner) error(401, "UNAUTHENTICATED");
  rate(s.sub);
  return { id: id!, ...s };
}
export function revoke(id: string) {
  sessions.delete(id);
}
export async function token(
  id: string,
  sub: string,
  audience = "diagram-api",
  claims: Record<string, unknown> = {},
  seconds = 900,
) {
  return new SignJWT({ sid: id, ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("diagram-viewer-local")
    .setAudience(audience)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(config().secret);
}
export async function bearer(req: Request) {
  const value = req.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) error(401, "UNAUTHENTICATED");
  return verify(value.slice(7), "diagram-api");
}
export async function verify(value: string, audience: string) {
  try {
    const { payload } = await jwtVerify(value, config().secret, {
      issuer: "diagram-viewer-local",
      audience,
      algorithms: ["HS256"],
    });
    const s = sessions.get(String(payload.sid));
    if (
      !s ||
      s.exp < Date.now() ||
      s.sub !== payload.sub ||
      payload.sub !== config().owner
    )
      error(401, "UNAUTHENTICATED");
    rate(s.sub);
    return payload;
  } catch {
    error(401, "UNAUTHENTICATED");
  }
}
