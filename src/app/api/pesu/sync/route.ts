import { NextResponse } from "next/server";
import { runCampusFlowPesuSync } from "@/lib/server/pesu-safe-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuSyncRequest = {
    srn?: string;
    username?: string;
    password?: string;
    semester?: number;
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
                    error: "SRN/username and password are required.",
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
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error ? error.message : "Unable to sync PESU data.",
            },
            {
                status: 500,
            }
        );
    }
}
