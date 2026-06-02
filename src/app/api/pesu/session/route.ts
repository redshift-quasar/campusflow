import { NextResponse } from "next/server";
import {
    getPesuSession,
    toPesuSessionResponse,
} from "@/lib/server/pesu-session";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getPesuSession();

    return NextResponse.json(toPesuSessionResponse(session));
}
