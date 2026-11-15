import { type NextRequest } from "next/server";
import { forwardLogistics } from "@/features/logistics/bridge";
type Context = { params: Promise<{ action: string }> };
export async function POST(request: NextRequest, { params }: Context) { return forwardLogistics(request, (await params).action); }
export async function GET(request: NextRequest, { params }: Context) { return forwardLogistics(request, (await params).action); }
