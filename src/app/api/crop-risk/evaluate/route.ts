import { NextResponse, type NextRequest } from "next/server";
import { backendRequest } from "@/lib/auth/profile";
import { riskSchema } from "@/features/crop-risk/schema";

const headers = { "Cache-Control": "private, no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 400: "Invalid request", 401: "Unauthorized", 403: "Forbidden", 404: "Batch not found", 422: "Check assessment and arrival times", 503: "Freshness assessment unavailable. Please retry." };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
  let body: string;
  try {
    body = await request.text();
    if (new TextEncoder().encode(body).length > 4096) return error(400);
    JSON.parse(body);
  } catch { return error(400); }
  try {
    const response = await backendRequest("/crop-risk/evaluate", "POST", body);
    if (!response) return error(401);
    if (!response.ok) return error([401, 403, 404, 422].includes(response.status) ? response.status : 503);
    return NextResponse.json(riskSchema.parse(await response.json()), { headers });
  } catch { return error(503); }
}
