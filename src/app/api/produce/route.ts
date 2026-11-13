import { type NextRequest } from "next/server";
import { forwardProduce } from "@/features/produce/bridge";
export async function GET(request: NextRequest) { return forwardProduce(request, "GET"); }
export async function POST(request: NextRequest) { return forwardProduce(request, "POST"); }
