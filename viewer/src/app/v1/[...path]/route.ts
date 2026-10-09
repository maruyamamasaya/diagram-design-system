import { handle } from "@/lib/api";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, c: Context) {
  return handle(req, "api", (await c.params).path);
}
export async function POST(req: Request, c: Context) {
  return handle(req, "api", (await c.params).path);
}
