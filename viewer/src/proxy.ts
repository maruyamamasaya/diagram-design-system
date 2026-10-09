import { NextRequest, NextResponse } from "next/server";
export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' https://diagram-design-system-676643701781-apne1.s3.ap-northeast-1.amazonaws.com https://s3.ap-northeast-1.amazonaws.com; font-src 'self' data:; connect-src 'self'${dev ? " ws:" : ""}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/artifact).*)"],
};
