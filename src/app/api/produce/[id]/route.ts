import { type NextRequest } from "next/server";
import { forwardProduce } from "@/features/produce/bridge";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) { return forwardProduce(request, "GET", (await params).id); }
export async function PATCH(request: NextRequest, { params }: Context) { return forwardProduce(request, "PATCH", (await params).id); }
export async function DELETE(request: NextRequest, { params }: Context) { return forwardProduce(request, "DELETE", (await params).id); }
