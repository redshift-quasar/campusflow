import { NextResponse } from "next/server";
import { getPesuSession } from "@/lib/server/pesu-session";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getPesuSession();

        if (!session.connected || !session.data) {
            return NextResponse.json(
                {
                    error: "No active PESU server session.",
                },
                {
                    status: 401,
                }
            );
        }

        return NextResponse.json({
            semesterId: "pesu-server-session",
            startDate: "",
            endDate: "",
            events: [],
            source: session.data.source,
            syncedAt: session.data.syncedAt,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not fetch PESU calendar.",
            },
            {
                status: 500,
            }
        );
    }
}
