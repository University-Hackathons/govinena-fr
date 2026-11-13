import { type NextRequest, NextResponse } from "next/server";
import { backendRequest } from "@/lib/auth/profile";

const headers = { "Cache-Control": "no-store" };
function error(status: number) {
  const messages: Record<number, string> = {
    400: "Invalid JSON request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    422: "Request validation failed", 503: "Service Unavailable",
  };
  return NextResponse.json({ error: { code: "http_error", message: messages[status] ?? "Request failed", details: [] } }, { status, headers });
}

async function forward(method: "GET" | "PUT", body?: string) {
  try {
    const response = await backendRequest("/farmer/profile", method, body);
    if (!response) return error(401);
    if (response.status === 200 || response.status === 422) {
      return NextResponse.json(await response.json(), { status: response.status, headers });
    }
    return error([401, 403, 404].includes(response.status) ? response.status : 503);
  } catch { return error(503); }
}

export async function GET() { return forward("GET"); }
export async function PUT(request: NextRequest) {
  // Cookie-authenticated mutations must originate from this application.
  if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 16384) return error(400);
    JSON.parse(body);
    // FastAPI validates the canonical typed payload, including unknown fields.
    return forward("PUT", body);
  } catch { return error(400); }
}
