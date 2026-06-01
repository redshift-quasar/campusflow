import { NextResponse } from "next/server";
import { loginToPesuAcademy } from "@/lib/server/pesu-client";
import {
    PESU_SESSION_COOKIE,
    PESU_SRN_COOKIE,
} from "@/lib/server/pesu-session";

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            srn?: string;
            password?: string;
        };

        const srn = body.srn ?? "";
        const password = body.password ?? "";

        const session = await loginToPesuAcademy({
            srn,
            password,
        });

        const response = NextResponse.json({
            connected: true,
            srn: session.srn,
            connectorMode: process.env.PESU_CONNECTOR_MODE ?? "mock",
        });

        response.cookies.set({
            name: PESU_SESSION_COOKIE,
            value: session.sessionToken,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 8,
        });

        response.cookies.set({
            name: PESU_SRN_COOKIE,
            value: session.srn,
            httpOnly: false,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 8,
        });

        return response;
    } catch {
        return NextResponse.json(
            {
                connected: false,
                message: "Could not connect PESUAcademy account.",
            },
            {
                status: 401,
            }
        );
    }
}