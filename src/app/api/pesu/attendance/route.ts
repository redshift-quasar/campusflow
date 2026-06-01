import { NextResponse } from "next/server";
import { fetchPesuAttendance } from "@/lib/server/pesu-client";
import { getPesuSession } from "@/lib/server/pesu-session";

export async function GET() {
    const session = await getPesuSession();

    const attendance = await fetchPesuAttendance(session.sessionToken);

    return NextResponse.json(attendance);
}