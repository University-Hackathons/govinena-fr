import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { backendRequest } from "@/lib/auth/profile";
import { producePageSchema, produceSchema } from "./schema";

const headers = { "Cache-Control": "private, no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 400: "Invalid JSON request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Profile setup is required or this batch is archived", 422: "Check crop, quantity, dates and location", 503: "Produce service unavailable" };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function forwardProduce(request: NextRequest, method: "GET" | "POST" | "PATCH" | "DELETE", id?: string) {
  if (id !== undefined && !z.uuid().safeParse(id).success) return error(404);
  let body: string | undefined;
  if (method !== "GET") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
    if (method !== "DELETE") {
      try {
        body = await request.text();
        if (new TextEncoder().encode(body).length > 16384) return error(400);
        JSON.parse(body);
      } catch { return error(400); }
    }
  }
  const query = new URLSearchParams();
  for (const name of ["q", "status", "page", "page_size"]) {
    const value = request.nextUrl.searchParams.get(name); if (value !== null) query.set(name, value);
  }
  if ((query.get("q")?.length ?? 0) > 100) return error(422);
  try {
    const response = await backendRequest(`/produce${id ? `/${id}` : `?${query}`}`, method, body);
    if (!response) return error(401);
    if (!response.ok) {
      if (response.status === 422) return NextResponse.json(await response.json(), { status: 422, headers });
      return error([401, 403, 404, 409].includes(response.status) ? response.status : 503);
    }
    if (method === "DELETE") return new NextResponse(null, { status: 204, headers });
    const payload = await response.json();
    return NextResponse.json(method === "GET" && !id ? producePageSchema.parse(payload) : produceSchema.parse(payload), { status: response.status, headers });
  } catch { return error(503); }
}
