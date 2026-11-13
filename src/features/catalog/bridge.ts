import "server-only";
import { NextResponse } from "next/server";
import { backendRequest, type BackendPath } from "@/lib/auth/profile";
import { catalogID, cropPageSchema, cropSchema, marketPageSchema, marketSchema, type CatalogKind } from "./schema";

const headers = { "Cache-Control": "no-store" };
function error(status: number) {
  const messages: Record<number, string> = { 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 422: "Invalid catalog query", 503: "Catalog service unavailable" };
  return NextResponse.json({ error: { code: "http_error", message: messages[status], details: [] } }, { status, headers });
}
export async function forwardCatalog(kind: string, search: URLSearchParams, id?: string) {
  if (kind !== "crops" && kind !== "markets") return error(404);
  if (id !== undefined && !catalogID.safeParse(id).success) return error(404);
  const query = new URLSearchParams();
  for (const name of ["q", "category", "district", "market_type", "active", "page", "page_size"]) {
    const value = search.get(name);
    if (value !== null) query.set(name, value);
  }
  if ((query.get("q")?.length ?? 0) > 100) return error(422);
  const path = `/${kind}${id !== undefined ? `/${id}` : `?${query}`}` as BackendPath;
  try {
    const response = await backendRequest(path);
    if (!response) return error(401);
    if (!response.ok) return error([401, 403, 404, 422].includes(response.status) ? response.status : 503);
    const schemas = { crops: { list: cropPageSchema, detail: cropSchema }, markets: { list: marketPageSchema, detail: marketSchema } };
    const schema = schemas[kind as CatalogKind][id !== undefined ? "detail" : "list"];
    return NextResponse.json(schema.parse(await response.json()), { headers });
  } catch { return error(503); }
}
