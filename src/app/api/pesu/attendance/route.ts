import { NextResponse } from "next/server";
import { getPesuSession } from "@/lib/server/pesu-session";
import {
    mapPesuAttendanceToSubjects,
    mapPesuCoursesToAttendanceFallback,
} from "@/lib/pesu/campusflow-pesu";

export const dynamic = "force-dynamic";

const FALLBACK_MESSAGE =
    "Attendance is not available on PESU yet. Add your attendance manually.";

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

        const liveSubjects = mapPesuAttendanceToSubjects(session.data.attendance);
        const liveAvailable = liveSubjects.length > 0;
        const fallbackSubjects = liveAvailable
            ? []
            : mapPesuCoursesToAttendanceFallback(session.data.courses);
        const mode = liveAvailable ? "live" : "manual-fallback";
        const subjects = liveAvailable ? liveSubjects : fallbackSubjects;

        return NextResponse.json({
            source: session.data.source,
            syncedAt: session.data.syncedAt,
            liveAvailable,
            mode,
            message: liveAvailable ? "" : FALLBACK_MESSAGE,
            subjects: subjects.map((subject) => ({
                ...subject,
                percentage:
                    subject.total > 0
                        ? Number(((subject.attended / subject.total) * 100).toFixed(2))
                        : 0,
                mode,
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
