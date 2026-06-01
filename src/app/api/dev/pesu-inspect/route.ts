import { NextResponse } from "next/server";
import { redactSensitiveData, getTopLevelKeys } from "@/lib/server/redact";

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
            status: response.status,
            statusText: response.statusText,
            mode,
            endpointConfigured: true,
            topLevelKeys: getTopLevelKeys(rawData),
            redactedPreview: redactSensitiveData(rawData),
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown inspector error",
            },
            {
                status: 500,
            }
        );
    }
}