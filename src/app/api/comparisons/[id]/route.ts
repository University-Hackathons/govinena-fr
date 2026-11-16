import type { NextRequest } from "next/server";
import { forwardComparison } from "@/features/comparisons/bridge";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return forwardComparison(request, (await params).id); }
