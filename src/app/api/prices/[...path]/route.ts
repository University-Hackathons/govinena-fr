import { type NextRequest } from "next/server";
import { forwardPrices } from "@/features/market-prices/bridge";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, { params }: Context) { return forwardPrices(request, (await params).path); }
export async function POST(request: NextRequest, { params }: Context) {
  const path = (await params).path;
  if (path.length !== 1 || path[0] !== "imports") return new Response(null, { status: 405 });
  return forwardPrices(request, path);
}
