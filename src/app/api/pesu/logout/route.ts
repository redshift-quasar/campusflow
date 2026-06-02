import { NextResponse } from "next/server";
import {
    clearPesuSessionRecord,
    getPesuSession,
    PESU_SESSION_COOKIE,
    PESU_SRN_COOKIE,
} from "@/lib/server/pesu-session";

export async function POST() {
    const session = await getPesuSession();

    clearPesuSessionRecord(session.sessionId);

    const response = NextResponse.json({
        connected: false,
        srn: null,
        connectorMode: "none",
    });

    response.cookies.delete(PESU_SESSION_COOKIE);
    response.cookies.delete(PESU_SRN_COOKIE);

    return response;
}
