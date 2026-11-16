import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { backendRequest } from "@/lib/auth/profile";
import { comparisonSchema } from "./schema";
const headers = { "Cache-Control": "private, no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 400: "Invalid request", 401: "Unauthorized", 403: "Forbidden", 404: "Batch or comparison not found", 422: "Check markets, capacity, rates, quotes and arrival times. At most 20 markets are supported.", 503: "Market comparison is temporarily unavailable. Please retry." };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function forwardComparison(request: NextRequest, id?: string) {
  if (id !== undefined && !z.uuid().safeParse(id).success) return error(404);
  let body: string | undefined;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
    try { body = await request.text(); if (new TextEncoder().encode(body).length > 65536) return error(400); JSON.parse(body); } catch { return error(400); }
  }
  try {
    const response = await backendRequest(`/comparisons${id ? `/${id}` : ""}`, request.method, body, "application/json", 90000);
    if (!response) return error(401);
    if (!response.ok) return error([401, 403, 404, 422].includes(response.status) ? response.status : 503);
    return NextResponse.json(comparisonSchema.parse(await response.json()), { headers });
  } catch { return error(503); }
}
