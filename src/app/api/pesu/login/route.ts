import { NextResponse } from "next/server";
import { runCampusFlowPesuSync } from "@/lib/server/pesu-safe-sync";
import {
    createPesuSession,
    setPesuSessionCookies,
    toPesuSessionResponse,
} from "@/lib/server/pesu-session";
import {
    PESU_LOGIN_FAILURE_MESSAGE,
    PESU_MISSING_CREDENTIALS_MESSAGE,
} from "@/lib/pesu/safe-errors";

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
                    message: PESU_MISSING_CREDENTIALS_MESSAGE,
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
    } catch {
        return NextResponse.json(
            {
                connected: false,
                message: PESU_LOGIN_FAILURE_MESSAGE,
            },
            {
                status: 401,
            }
        );
    }
}
