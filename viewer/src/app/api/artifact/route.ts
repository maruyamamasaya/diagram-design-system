import { handle } from "@/lib/api";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return handle(req, "artifact");
}
