import "server-only";
import type { PesuConnector } from "@/lib/server/pesu-types";
import {
    mapPesuAttendanceResponse,
    mapPesuCalendarResponse,
    mapPesuLoginResponse,
} from "@/lib/server/pesu-mappers";

function requireEnv(name: string) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is missing`);
    }

    return value;
}

async function readJsonResponse(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Expected JSON response. Got: ${text.slice(0, 160)}`);
    }

    return response.json() as Promise<unknown>;
}

export const realPesuConnector: PesuConnector = {
    async login({ srn, password }) {
        const loginEndpoint = requireEnv("PESU_LOGIN_ENDPOINT");

        const response = await fetch(loginEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "CampusFlow/1.0",
            },
            body: JSON.stringify({
                username: srn,
                password,
            }),
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("PESUAcademy login failed");
        }

        const data = await readJsonResponse(response);

        return mapPesuLoginResponse(data, srn);
    },

    async attendance(sessionToken) {
        if (!sessionToken) {
            throw new Error("No PESU session token");
        }

        const attendanceEndpoint = requireEnv("PESU_ATTENDANCE_ENDPOINT");

        const response = await fetch(attendanceEndpoint, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${sessionToken}`,
                "User-Agent": "CampusFlow/1.0",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("Could not fetch PESUAcademy attendance");
        }

        const data = await readJsonResponse(response);

        return {
            source: "real-pesuacademy",
            syncedAt: new Date().toISOString(),
            subjects: mapPesuAttendanceResponse(data),
        };
    },

    async calendar(sessionToken) {
        if (!sessionToken) {
            throw new Error("No PESU session token");
        }

        const calendarEndpoint = requireEnv("PESU_CALENDAR_ENDPOINT");

        const response = await fetch(calendarEndpoint, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${sessionToken}`,
                "User-Agent": "CampusFlow/1.0",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("Could not fetch PESUAcademy calendar");
        }

        const data = await readJsonResponse(response);

        return mapPesuCalendarResponse(data);
    },
};