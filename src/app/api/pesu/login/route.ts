import { NextResponse } from "next/server";
import { runCampusFlowPesuSync } from "@/lib/server/pesu-safe-sync";
import {
    createPesuSession,
    setPesuSessionCookies,
    toPesuSessionResponse,
} from "@/lib/server/pesu-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuLoginRequest = {
    srn?: string;
    username?: string;
    password?: string;
    semester?: number;
    semid?: string | number;
    semesterId?: string | number;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as PesuLoginRequest;

        const username = body.username ?? body.srn ?? "";
        const password = body.password ?? "";

        if (!username || !password) {
            return NextResponse.json(
                {
                    connected: false,
                    message: "SRN/username and password are required.",
                },
                {
                    status: 400,
                }
            );
        }

        const safeSync = await runCampusFlowPesuSync({
            username,
            password,
            semester: body.semester,
            semid: body.semid ?? body.semesterId,
        });

        const record = createPesuSession(safeSync);
        const response = NextResponse.json(
            toPesuSessionResponse({
                connected: true,
                sessionId: record.sessionId,
                srn: record.srn,
                connectorMode: "pesu",
                source: safeSync.source,
                syncedAt: safeSync.syncedAt,
                profile: safeSync.profile,
                attendance: safeSync.attendance,
                courses: safeSync.courses,
                timetable: safeSync.timetable,
                results: safeSync.results,
                errors: safeSync.errors,
                data: safeSync,
            })
        );

        setPesuSessionCookies(response, record);

        return response;
    } catch (error) {
        return NextResponse.json(
            {
                connected: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not connect PESUAcademy account.",
            },
            {
                status: 401,
            }
        );
    }
}
