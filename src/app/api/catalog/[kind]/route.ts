import { type NextRequest } from "next/server";
import { forwardCatalog } from "@/features/catalog/bridge";

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return forwardCatalog(kind, request.nextUrl.searchParams);
}
