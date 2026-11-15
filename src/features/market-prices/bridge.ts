import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { backendRequest, type BackendPath } from "@/lib/auth/profile";
import { accessSchema, auditSchema, comparisonSchema, freshnessSchema, historySchema, importReportSchema, latestSchema } from "./schema";

const schemas = { access: accessSchema, latest: latestSchema, history: historySchema, comparison: comparisonSchema, freshness: freshnessSchema };
const headers = { "Cache-Control": "private, no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 400: "Invalid upload", 401: "Unauthorized", 403: "Admin access required", 404: "Not Found", 413: "CSV must be at most 1 MiB", 415: "Upload a CSV file", 422: "Check price filters and import verification", 503: "Price service unavailable" };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function forwardPrices(request: NextRequest, path: string[]) {
  const importing = request.method === "POST" && path.length === 1 && path[0] === "imports";
  const audit = path.length === 2 && path[0] === "imports" && z.uuid().safeParse(path[1]).success;
  const originalFile = path.length === 3 && path[0] === "imports" && z.uuid().safeParse(path[1]).success && path[2] === "file";
  const read = path.length === 1 && Object.hasOwn(schemas, path[0]);
  if (!importing && !audit && !read && !originalFile) return error(404);
  const query = new URLSearchParams();
  for (const name of ["crop_id", "market_id", "price_type", "quality", "source_name", "page", "page_size", "start_date", "end_date", "limit", "filename", "verified", "verification_note"]) {
    const value = request.nextUrl.searchParams.get(name); if (value !== null) query.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (importing) {
    if (request.headers.get("origin") !== request.nextUrl.origin) return error(403);
    if (!request.headers.get("content-type")?.startsWith("text/csv")) return error(415);
    const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    if (!reader) return error(400);
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 1048576) { await reader.cancel(); return error(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let position = 0;
    for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
    body = bytes.buffer;
  }
  try {
    const response = await backendRequest(`/prices/${path.join("/")}?${query}` as BackendPath, importing ? "POST" : "GET", body, importing ? "text/csv" : "application/json", importing ? 120000 : 15000);
    if (!response) return error(401);
    if (!response.ok) return error([401, 403, 404, 413, 415, 422].includes(response.status) ? response.status : 503);
    if (originalFile) return new NextResponse(await response.arrayBuffer(), { headers: { ...headers, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="price-import-${path[1]}.csv"`, "X-Content-Type-Options": "nosniff" } });
    const schema = importing ? importReportSchema : audit ? auditSchema : schemas[path[0] as keyof typeof schemas];
    return NextResponse.json(schema.parse(await response.json()), { headers });
  } catch { return error(503); }
}
