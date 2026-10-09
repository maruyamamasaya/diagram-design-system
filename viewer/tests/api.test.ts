import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { SignJWT } from "jose";
import { handle } from "../src/lib/api";
import { config } from "../src/lib/config";
import { createSession, rate, token } from "../src/lib/auth";
const password = randomBytes(24).toString("hex"),
  salt = "test-salt";
process.env.VIEWER_SECRET = randomBytes(32).toString("hex");
process.env.VIEWER_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
process.env.VIEWER_STORAGE = "mock";
process.env.VIEWER_ORIGIN = "http://127.0.0.1:3000";
process.env.VIEWER_OWNER = "local-owner";
const id = "37386704-778e-41a5-a0f6-71e6e64cdf24";
function req(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`${config().origin}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test("no authentication cannot enumerate, sign, or read artifacts", async () => {
  for (const path of [
    ["diagrams"],
    ["diagrams", id],
    ["diagrams", id, "access-url"],
  ])
    assert.equal(
      (
        await handle(
          req(
            "v1/" + path.join("/"),
            path.length === 3
              ? { artifact: "png", purpose: "preview" }
              : undefined,
          ),
          "api",
          path,
        )
      ).status,
      401,
    );
  assert.equal(
    (await handle(req("api/artifact?ticket=forged"), "artifact")).status,
    401,
  );
});
test("web login requires same origin; mutating cookie routes require CSRF", async () => {
  assert.equal(
    (
      await handle(
        req(
          "api/web/login",
          { password },
          { Origin: "https://attacker.invalid" },
        ),
        "web",
        ["login"],
      )
    ).status,
    403,
  );
  const login = await handle(
    req("api/web/login", { password }, { Origin: config().origin }),
    "web",
    ["login"],
  );
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const data = await login.json();
  assert.equal(
    (
      await handle(
        req(
          "api/web/diagrams/" + id + "/access-url",
          { artifact: "png", purpose: "preview" },
          { Cookie: cookie, Origin: config().origin },
        ),
        "web",
        ["diagrams", id, "access-url"],
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handle(
        req(
          "api/web/logout",
          {},
          {
            Cookie: cookie,
            Origin: config().origin,
            "X-CSRF-Token": data.csrf,
          },
        ),
        "web",
        ["logout"],
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await handle(
        req("api/web/diagrams", undefined, { Cookie: cookie }),
        "web",
        ["diagrams"],
      )
    ).status,
    401,
  );
});
test("Bearer identity authorizes safe projections, tags, filters, version, downloads", async () => {
  const s = createSession(),
    auth = { Authorization: `Bearer ${await token(s.id, s.sub)}` };
  const list = await handle(
    req("v1/diagrams?q=Linux", undefined, auth),
    "api",
    ["diagrams"],
  );
  assert.equal(list.status, 200);
  const data = await list.json();
  assert.equal(data.items.length, 1);
  assert.ok(data.items[0].tags.includes("Linux"));
  const detail = await handle(
    req("v1/diagrams/" + id, undefined, auth),
    "api",
    ["diagrams", id],
  );
  const text = await detail.text();
  assert.ok(!text.includes("library/diagrams"));
  assert.ok(!text.includes("676643701781"));
  const filtered = await handle(
    req("v1/diagrams?type=architecture", undefined, auth),
    "api",
    ["diagrams"],
  );
  assert.equal((await filtered.json()).items.length, 0);
  const signed = await handle(
    req(
      "v1/access",
      { version: 1, artifact: "svg", purpose: "download" },
      auth,
    ),
    "api",
    ["diagrams", id, "access-url"],
  );
  assert.equal(signed.status, 200);
  const access = await signed.json();
  assert.equal(access.expiresIn, 300);
  const asset = await handle(new Request(access.url), "artifact");
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-disposition")!, /^attachment/);
  assert.equal((await asset.arrayBuffer()).byteLength, access.sizeBytes);
  assert.equal(
    (await handle(req("v1/revoke", {}, auth), "api", ["auth", "revoke"]))
      .status,
    200,
  );
  assert.equal((await handle(new Request(access.url), "artifact")).status, 401);
});
test("wrong subject, expired token, malformed ID, arbitrary keys, and cursors are rejected", async () => {
  const s = createSession();
  const good = { Authorization: `Bearer ${await token(s.id, s.sub)}` };
  const expired = await new SignJWT({ sid: s.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("diagram-viewer-local")
    .setAudience("diagram-api")
    .setSubject(s.sub)
    .setExpirationTime(1)
    .sign(config().secret);
  assert.equal(
    (
      await handle(
        req("v1/diagrams", undefined, { Authorization: `Bearer ${expired}` }),
        "api",
        ["diagrams"],
      )
    ).status,
    401,
  );
  const wrong = await token(s.id, "someone-else");
  assert.equal(
    (
      await handle(
        req("v1/diagrams", undefined, { Authorization: `Bearer ${wrong}` }),
        "api",
        ["diagrams"],
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handle(req("v1/diagrams", undefined, good), "api", [
        "diagrams",
        "../secret",
      ])
    ).status,
    400,
  );
  assert.equal(
    (
      await handle(
        req(
          "v1/access",
          { artifact: "png", purpose: "preview", key: "other-secret" },
          good,
        ),
        "api",
        ["diagrams", id, "access-url"],
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handle(req("v1/diagrams?cursor=forged", undefined, good), "api", [
        "diagrams",
      ])
    ).status,
    400,
  );
});
test("rate limits and hosted-local-auth guard fail closed", () => {
  for (let i = 0; i < 2; i++) rate("test-limit", 2);
  assert.throws(() => rate("test-limit", 2), /RATE_LIMITED/);
  process.env.VIEWER_ORIGIN = "https://public.invalid";
  assert.throws(config, /cannot be hosted/);
  process.env.VIEWER_ORIGIN = "http://127.0.0.1:3000";
});
