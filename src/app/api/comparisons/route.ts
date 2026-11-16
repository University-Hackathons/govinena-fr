import type { NextRequest } from "next/server";
import { forwardComparison } from "@/features/comparisons/bridge";
export async function POST(request: NextRequest) { return forwardComparison(request); }
