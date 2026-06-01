import { NextResponse } from "next/server";
import { fetchPesuAttendance } from "@/lib/server/pesu-client";
import { getPesuSession } from "@/lib/server/pesu-session";

export async function GET() {
    try {
        const session = await getPesuSession();

        const attendance = await fetchPesuAttendance(session.sessionToken);

        return NextResponse.json(attendance);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not fetch PESU attendance.",
            },
            {
                status: 500,
            }
        );
    }
}
