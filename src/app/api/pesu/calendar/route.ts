import { NextResponse } from "next/server";
import { fetchPesuCalendar } from "@/lib/server/pesu-client";
import { getPesuSession } from "@/lib/server/pesu-session";

export async function GET() {
    try {
        const session = await getPesuSession();

        const calendar = await fetchPesuCalendar(session.sessionToken);

        return NextResponse.json(calendar);
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
