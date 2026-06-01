import { NextResponse } from "next/server";
import { getPesuSession } from "@/lib/server/pesu-session";

export async function GET() {
    const session = await getPesuSession();

    return NextResponse.json({
        connected: session.connected,
        srn: session.srn,
        connectorMode: process.env.PESU_CONNECTOR_MODE ?? "mock",
    });
}