import { NextResponse } from "next/server";
import { fetchPesuCalendar } from "@/lib/server/pesu-client";
import { getPesuSession } from "@/lib/server/pesu-session";

export async function GET() {
    const session = await getPesuSession();

    const calendar = await fetchPesuCalendar(session.sessionToken);

    return NextResponse.json(calendar);
}