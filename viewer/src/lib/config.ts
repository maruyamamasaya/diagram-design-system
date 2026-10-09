export function config() {
  const origin = process.env.VIEWER_ORIGIN || "http://127.0.0.1:3000";
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname) ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  )
    throw Error(
      "Local password auth cannot be hosted. Configure a reviewed OIDC deployment first.",
    );
  const secret = process.env.VIEWER_SECRET || "";
  if (secret.length < 64)
    throw Error("Run npm run init before starting the viewer.");
  const storage = process.env.VIEWER_STORAGE || "mock";
  if (!["mock", "s3"].includes(storage)) throw Error("Invalid storage mode");
  return {
    origin,
    secret: new TextEncoder().encode(secret),
    hash: process.env.VIEWER_PASSWORD_HASH || "",
    owner: process.env.VIEWER_OWNER || "local-owner",
    storage,
  };
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function error(status: number, code: string): never {
  throw new ApiError(status, code);
}
