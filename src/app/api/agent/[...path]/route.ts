import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { backendRequest } from "@/lib/auth/profile";
import { runSchema } from "@/features/recommendations/schema";
const headers = { "Cache-Control": "private, no-store" };
function error(status: number) { return NextResponse.json({ error: { message: ({ 400: "Invalid request", 401: "Unauthorized", 403: "Forbidden", 404: "Run not found", 409: "Run changed or is no longer eligible. Reload or generate a new recommendation.", 422: "Check the supplied constraints", 503: "Recommendation service unavailable" } as Record<number, string>)[status] } }, { status, headers }); }
async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  const path = (await params).path;
  const list = request.method === "GET" && path.length === 1 && path[0] === "runs";
  const create = request.method === "POST" && path.length === 1 && path[0] === "recommendations";
  const validID = path[0] === "runs" && z.uuid().safeParse(path[1]).success;
  const detail = request.method === "GET" && path.length === 2 && validID;
  const action = request.method === "POST" && path.length === 3 && validID && ["resume", "decision"].includes(path[2]);
  if (!list && !create && !detail && !action) return error(404);
  let body: string | undefined;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
    try { body = await request.text(); if (new TextEncoder().encode(body).length > 65536) return error(400); JSON.parse(body); } catch { return error(400); }
  }
  const query = new URLSearchParams();
  if (list && request.nextUrl.searchParams.has("page")) query.set("page", request.nextUrl.searchParams.get("page")!);
  try {
    const response = await backendRequest(`/agent/${path.join("/")}${list ? `?${query}` : ""}`, request.method, body);
    if (!response) return error(401);
    if (!response.ok) return error([401, 403, 404, 409, 422].includes(response.status) ? response.status : 503);
    const data = await response.json();
    return NextResponse.json(list ? z.array(runSchema).parse(data) : runSchema.parse(data), { status: response.status, headers });
  } catch { return error(503); }
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return forward(request, params); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return forward(request, params); }
