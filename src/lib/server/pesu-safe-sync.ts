import "server-only";

import { spawn } from "node:child_process";
import type { SafePesuSyncResponse } from "@/lib/pesu/campusflow-pesu";

type PesuSyncInput = {
    username: string;
    password: string;
    semester?: number;
    semid?: string | number;
};

type SafePesuSyncResponseWithProbe = SafePesuSyncResponse & {
    calendarProbe?: unknown;
};

function getPythonPath() {
    return process.env.CAMPUSFLOW_PYTHON_PATH || "python3";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object";
}

function isSafePesuSyncResponse(value: unknown): value is SafePesuSyncResponseWithProbe {
    if (!isRecord(value)) return false;

    const data = value as Partial<SafePesuSyncResponseWithProbe>;

    return (
        data.ok === true &&
        data.source === "pesu" &&
        typeof data.syncedAt === "string" &&
        Boolean(data.profile) &&
        Array.isArray(data.attendance) &&
        Array.isArray(data.courses) &&
        (data.timetable === undefined || Array.isArray(data.timetable.slots)) &&
        (data.results === undefined || Array.isArray(data.results.courses)) &&
        (data.seating === undefined || Array.isArray(data.seating.items)) &&
        (data.calendar === undefined || Array.isArray(data.calendar.events))
    );
}

function toSafePesuSyncResponse(
    data: SafePesuSyncResponseWithProbe
): SafePesuSyncResponseWithProbe {
    const result: SafePesuSyncResponseWithProbe = {
        ok: true,
        source: "pesu",
        syncedAt: data.syncedAt,
        profile: data.profile,
        attendance: data.attendance,
        courses: data.courses,
        timetable: data.timetable,
        results: data.results,
        seating: data.seating ?? { items: [] },
        calendar: data.calendar,
        errors: {
            ...data.errors,
            seating: data.errors?.seating ?? null,
        },
    };

    if ("calendarProbe" in data) {
        result.calendarProbe = data.calendarProbe;
    }

    return result;
}

export function runCampusFlowPesuSync({
    username,
    password,
    semester,
    semid,
}: PesuSyncInput) {
    return new Promise<SafePesuSyncResponseWithProbe>((resolve, reject) => {
        const child = spawn(getPythonPath(), ["scripts/campusflow_pesu.py"], {
            stdio: ["pipe", "pipe", "pipe"],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: "1",
            },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            try {
                const parsed = JSON.parse(stdout || "{}") as unknown;

                if (code !== 0 || !isSafePesuSyncResponse(parsed)) {
                    const parsedError =
                        isRecord(parsed) && typeof parsed.error === "string"
                            ? parsed.error
                            : null;

                    reject(
                        new Error(
                            parsedError ||
                            stderr ||
                            stdout ||
                            `CampusFlow PESU sync failed with code ${code}`
                        )
                    );
                    return;
                }

                resolve(toSafePesuSyncResponse(parsed));
            } catch {
                reject(
                    new Error(
                        stderr ||
                        stdout ||
                        "CampusFlow PESU sync failed because response was not valid JSON."
                    )
                );
            }
        });

        child.stdin.write(
            JSON.stringify({
                username,
                password,
                semester,
                semid,
                syncedAt: new Date().toISOString(),
            })
        );

        child.stdin.end();
    });
}