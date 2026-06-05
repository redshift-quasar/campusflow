import { NextResponse } from "next/server";
import { runCampusFlowPesuSync } from "@/lib/server/pesu-safe-sync";
import {
    PESU_MISSING_CREDENTIALS_MESSAGE,
    PESU_SYNC_FAILURE_MESSAGE,
} from "@/lib/pesu/safe-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuSyncRequest = {
    srn?: string;
    username?: string;
    password?: string;
    semester?: number;
    semesterId?: string | number;
    semid?: string | number;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as PesuSyncRequest;

        const username = body.username ?? body.srn;
        const password = body.password;

        if (!username || !password) {
            return NextResponse.json(
                {
                    ok: false,
                    error: PESU_MISSING_CREDENTIALS_MESSAGE,
                },
                {
                    status: 400,
                }
            );
        }

        const result = await runCampusFlowPesuSync({
            username,
            password,
            semester: body.semester,
            semid: body.semid ?? body.semesterId,
        });

        return NextResponse.json(result);
    } catch {
        return NextResponse.json(
            {
                ok: false,
                error: PESU_SYNC_FAILURE_MESSAGE,
            },
            {
                status: 500,
            }
        );
    }
}
