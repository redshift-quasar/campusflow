import { NextResponse } from "next/server";
import {
    PESU_SESSION_COOKIE,
    PESU_SRN_COOKIE,
} from "@/lib/server/pesu-session";

export async function POST() {
    const response = NextResponse.json({
        connected: false,
    });

    response.cookies.delete(PESU_SESSION_COOKIE);
    response.cookies.delete(PESU_SRN_COOKIE);

    return response;
}