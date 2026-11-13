import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth/profile";
export async function GET() {
    try {
        const profile = await getProfile();
        if (!profile)
            return NextResponse.json({ error: { code: "http_error", message: "Unauthorized", details: [] } }, { status: 401, headers: { "Cache-Control": "no-store" } });
        return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return NextResponse.json({ error: { code: "http_error", message: "Service Unavailable", details: [] } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}
