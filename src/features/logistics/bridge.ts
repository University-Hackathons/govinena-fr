import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { backendRequest } from "@/lib/auth/profile";
import { estimateHistorySchema, logisticsSchema } from "./schema";

const headers = { "Cache-Control": "private, no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 400: "Invalid request", 401: "Unauthorized", 403: "Forbidden", 404: "Batch or market not found", 409: "Archived batches cannot be estimated", 422: "Check capacity, distances, charges and return-trip assumptions", 503: "Transport estimate could not be completed. Please try again." };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function forwardLogistics(request: NextRequest, action: string) {
  const estimating = request.method === "POST" && action === "estimate";
  if (!estimating && !(request.method === "GET" && action === "estimates")) return error(404);
  let body: string | undefined;
  if (estimating) {
    if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
    try { body = await request.text(); if (new TextEncoder().encode(body).length > 16384) return error(400); JSON.parse(body); } catch { return error(400); }
  }
  const query = new URLSearchParams();
  if (!estimating && request.nextUrl.searchParams.has("batch_id")) query.set("batch_id", request.nextUrl.searchParams.get("batch_id")!);
  try {
    const response = await backendRequest(`/logistics/${action}?${query}`, estimating ? "POST" : "GET", body, "application/json", 30000);
    if (!response) return error(401);
    if (!response.ok) {
      if (response.status === 422) return NextResponse.json(await response.json(), { status: 422, headers });
      return error([401, 403, 404, 409].includes(response.status) ? response.status : 503);
    }
    const payload = await response.json();
    return NextResponse.json(estimating ? logisticsSchema.parse(payload) : estimateHistorySchema.parse(payload), { headers });
  } catch { return error(503); }
}
