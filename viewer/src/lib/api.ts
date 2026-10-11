import { oidcPrincipal } from "./oidc";
import { ApiError, config, error } from "./config";
import {
  bearer,
  createSession,
  json,
  origin,
  password,
  revoke,
  token,
  verify,
  web,
} from "./auth";
import { access, Artifact, catalog, find, mockBytes, summary, libraryState, setLibraryState } from "./store";
import { SignJWT, jwtVerify, type JWTVerifyGetKey } from "jose";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
export function response(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(body, { status, headers: { ...headers, ...extra } });
}
export async function handle(
  req: Request,
  mode: "web" | "api" | "artifact",
  segments: string[] = [],
  dependencies: {oidcKeys?: JWTVerifyGetKey; catalog?: typeof catalog} = {},
): Promise<Response> {
  try {
    const c = config();
    const url = new URL(req.url);
    if ((req.headers.get("host") || url.host) !== new URL(c.origin).host)
      error(403, "ORIGIN_REJECTED");
    if (c.publicAPI && (mode !== "api" || segments[0] === "auth")) error(404, "NOT_FOUND");
    if (mode === "artifact") {
      if (c.storage !== "mock") error(404, "NOT_FOUND");
      const p = await verify(
        url.searchParams.get("ticket") || "",
        "diagram-artifact",
      );
      const m = await find(String(p.id), Number(p.version));
      const { bytes, f } = await mockBytes(m, p.artifact as Artifact, Number(p.page || 1));
      return new Response(new Uint8Array(bytes), {
        headers: {
          ...headers,
          "Content-Type": f.contentType,
          "Content-Disposition": `${p.purpose === "download" ? "attachment" : "inline"}; filename="${f.name}"`,
          "Content-Security-Policy":
            "sandbox; default-src 'none'; style-src 'unsafe-inline'; font-src data:",
        },
      });
    }
    const route = segments.join("/");
    if (mode === "web" && route === "login" && req.method === "POST") {
      origin(req);
      password((await json(req)).password);
      const s = createSession();
      return response({ authenticated: true, csrf: s.csrf }, 200, {
        "Set-Cookie": `viewer_session=${s.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${c.origin.startsWith("https:") ? "; Secure" : ""}`,
      });
    }
    if (mode === "api" && route === "auth/token" && req.method === "POST") {
      password((await json(req)).password);
      const s = createSession();
      return response({
        accessToken: await token(s.id, s.sub),
        tokenType: "Bearer",
        expiresIn: 900,
      });
    }
    const principal =
      c.publicAPI ? await oidcPrincipal(req, dependencies.oidcKeys) : mode === "web" ? web(req, req.method !== "GET") : await bearer(req);
    const sid = String("id" in principal ? principal.id : principal.sid);
    const sub = String(principal.sub);
    if (mode === "web" && route === "session" && req.method === "GET")
      return response({ authenticated: true, csrf: principal.csrf });
    if (mode === "web" && route === "logout" && req.method === "POST") {
      revoke(sid);
      return response({ authenticated: false }, 200, {
        "Set-Cookie":
          "viewer_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      });
    }
    if (mode === "api" && route === "auth/revoke" && req.method === "POST") {
      revoke(sid);
      return response({ revoked: true });
    }
    if (c.publicAPI && route === "me" && req.method === "GET") return response({issuer: (principal as {issuer: string}).issuer, subject: sub});
    if (segments[0] !== "diagrams") error(404, "NOT_FOUND");
    if (segments.length === 1 && req.method === "GET") {
      const q = url.searchParams.get("q") || "";
      const type = url.searchParams.get("type") || "";
      const scope = url.searchParams.get("scope") || "all";
      const state = url.searchParams.get("state") || "active";
      if (!["active", "trashed"].includes(state)) error(400, "INVALID_FILTER");
      if (!["all", "title", "tags"].includes(scope)) error(400, "INVALID_FILTER");
      if (
        q.length > 100 ||
        (type &&
          !["roadmap", "flowchart", "architecture", "comparison", "presentation", "illustration"].includes(
            type,
          ))
      )
        error(400, "INVALID_FILTER");
      const limit = Number(url.searchParams.get("limit") || 20);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        error(400, "INVALID_LIMIT");
      let offset = 0;
      const cursor = url.searchParams.get("cursor");
      if (cursor) {
        try {
          const { payload } = await jwtVerify(cursor, c.secret, {
            audience: "diagram-cursor",
            algorithms: ["HS256"],
          });
          if ((payload.state || "active") !== state || payload.sub !== sub || payload.q !== q || payload.type !== type || (payload.scope || "all") !== scope)
            error(400, "INVALID_CURSOR");
          offset = Number(payload.offset);
          if (!Number.isInteger(offset) || offset < 0)
            error(400, "INVALID_CURSOR");
        } catch {
          error(400, "INVALID_CURSOR");
        }
      }
      const latest = new Map<string, Awaited<ReturnType<typeof find>>>();
      for (const m of await (dependencies.catalog || catalog)())
        if (
          !latest.has(m.diagramId) ||
          latest.get(m.diagramId)!.version < m.version
        )
          latest.set(m.diagramId, m);
      const states = new Map(await Promise.all([...latest.keys()].map(async id => [id, await libraryState(id)] as const)));
      const all = [...latest.values()]
        .filter(m => Boolean(states.get(m.diagramId)?.trashed) === (state === "trashed"))
        .map(summary)
        .filter(
          (m) =>
            (!type || m.type === type) &&
            (!q ||
              (scope === "title" ? m.title : scope === "tags" ? m.tags.join(" ") : `${m.title} ${m.tags.join(" ")}`)
                .toLocaleLowerCase()
                .includes(q.toLocaleLowerCase())),
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const nextCursor =
        offset + limit < all.length
          ? await new SignJWT({ q, type, scope, state, offset: offset + limit })
              .setProtectedHeader({ alg: "HS256" })
              .setAudience("diagram-cursor")
              .setSubject(sub)
              .setExpirationTime("5m")
              .sign(c.secret)
          : null;
      return response({ items: all.slice(offset, offset + limit), nextCursor });
    }
    if (segments.length === 3 && ["trash", "restore"].includes(segments[2]) && req.method === "POST") {
      const body = await json(req);
      if (Object.keys(body).length || url.search) error(400, "INVALID_REQUEST");
      return response(await setLibraryState(segments[1], segments[2] === "trash"));
    }
    const v = url.searchParams.get("version");
    const version = v ? Number(v) : undefined;
    if (
      version !== undefined &&
      (!Number.isInteger(version) || version < 1 || version > 999999)
    )
      error(400, "INVALID_VERSION");
    if (
      segments.length === 3 &&
      segments[2] === "versions" &&
      req.method === "GET"
    ) {
      await find(segments[1]);
      return response({
        items: (await catalog())
          .filter((m) => m.diagramId === segments[1])
          .sort((a, b) => b.version - a.version)
          .map((m) => ({
            version: m.version,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          })),
      });
    }
    if (segments.length === 2 && req.method === "GET") {
      const m = await find(segments[1], version);
      return response({
        ...summary(m),
        files: m.files.map((f) => ({
          name: f.name,
          role: f.role,
          format: f.format,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256,
        })),
        unverified: Object.entries(m.validation.checks)
          .filter(([, v]) => v === "未検証")
          .map(([k]) => k),
      });
    }
    if (
      segments.length === 3 &&
      segments[2] === "access-url" &&
      req.method === "POST"
    ) {
      const body = await json(req);
      if (
        Object.keys(body).some(
          (k) => !["version", "artifact", "purpose", "page"].includes(k),
        ) ||
        !["png", "svg", "pdf", "pptx", "input", "validation"].includes(body.artifact) ||
        !["preview", "download"].includes(body.purpose) ||
        (body.purpose === "preview" &&
          !["png", "svg", "pdf"].includes(body.artifact)) ||
        (body.page !== undefined && (!Number.isInteger(body.page) || body.page < 1 || body.page > 999)) ||
        (body.version !== undefined &&
          (!Number.isInteger(body.version) ||
            body.version < 1 ||
            body.version > 999999))
      )
        error(400, "INVALID_ARTIFACT");
      return response(
        await access(
          await find(segments[1], body.version),
          body.artifact,
          body.purpose,
          sid,
          sub,
          body.page || 1,
        ),
      );
    }
    error(404, "NOT_FOUND");
  } catch (e) {
    if (e instanceof ApiError)
      return response(
        {
          error: { code: e.code, message: e.code },
          requestId: crypto.randomUUID(),
        },
        e.status,
      );
    console.error("Viewer request failed (details withheld)");
    return response(
      {
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "資料を取得できません。接続設定を確認してください。",
        },
        requestId: crypto.randomUUID(),
      },
      503,
    );
  }
}
