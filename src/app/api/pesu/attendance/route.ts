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
            source: session.data.source,
            syncedAt: session.data.syncedAt,
            subjects: session.data.attendance.map((subject) => ({
                name: subject.name,
                code: subject.code,
                attended: subject.attended,
                total: subject.total,
                faculty: undefined,
            })),
            errors: session.data.errors,
        });
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
