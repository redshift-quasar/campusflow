import { NextResponse } from "next/server";
import { getTopLevelKeys } from "@/lib/server/redact";

type InspectMode = "login" | "attendance" | "calendar";

function assertDevOnly() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Inspector is disabled in production");
    }
}

function getEndpoint(mode: InspectMode) {
    if (mode === "login") return process.env.PESU_LOGIN_ENDPOINT;
    if (mode === "attendance") return process.env.PESU_ATTENDANCE_ENDPOINT;
    return process.env.PESU_CALENDAR_ENDPOINT;
}

function getBodyType(contentType: string, rawData: unknown) {
    if (contentType.includes("application/json")) {
        return Array.isArray(rawData) ? "json array" : "json object";
    }

    return "non-json";
}

function getBodySize(rawData: unknown) {
    if (typeof rawData === "string") return rawData.length;

    return JSON.stringify(rawData ?? "").length;
}

export async function POST(request: Request) {
    try {
        assertDevOnly();

        const body = (await request.json()) as {
            mode?: InspectMode;
            srn?: string;
            password?: string;
            token?: string;
        };

        const mode = body.mode;

        if (!mode || !["login", "attendance", "calendar"].includes(mode)) {
            return NextResponse.json(
                {
                    ok: false,
                    message: "Invalid mode. Use login, attendance, or calendar.",
                },
                {
                    status: 400,
                }
            );
        }

        const endpoint = getEndpoint(mode);

        if (!endpoint) {
            return NextResponse.json(
                {
                    ok: false,
                    message: `Missing endpoint env for ${mode}.`,
                },
                {
                    status: 400,
                }
            );
        }

        const isLogin = mode === "login";

        const response = await fetch(endpoint, {
            method: isLogin ? "POST" : "GET",
            headers: {
                "Content-Type": "application/json",
                ...(body.token
                    ? {
                        Authorization: `Bearer ${body.token}`,
                    }
                    : {}),
                "User-Agent": "CampusFlow-DevInspector/1.0",
            },
            body: isLogin
                ? JSON.stringify({
                    username: body.srn,
                    password: body.password,
                })
                : undefined,
            cache: "no-store",
        });

        const contentType = response.headers.get("content-type") ?? "";

        let rawData: unknown;

        if (contentType.includes("application/json")) {
            rawData = await response.json();
        } else {
            rawData = await response.text();
        }

        return NextResponse.json({
            ok: response.ok,
            mode,
            endpointConfigured: true,
            bodyType: getBodyType(contentType, rawData),
            bodySize: getBodySize(rawData),
            topLevelKeys: getTopLevelKeys(rawData),
            message: response.ok
                ? undefined
                : "Inspector request failed. Check the configured endpoint or credentials.",
        });
    } catch {
        return NextResponse.json(
            {
                ok: false,
                message: "Could not run inspector.",
            },
            {
                status: 500,
            }
        );
    }
}
