import "server-only";
import { spawn } from "node:child_process";
import type { SafePesuSyncResponse } from "@/lib/pesu/campusflow-pesu";

type PesuSyncInput = {
    username: string;
    password: string;
    semester?: number;
    semid?: string | number;
};

function getPythonPath() {
    return process.env.CAMPUSFLOW_PYTHON_PATH || "python3";
}

function isSafePesuSyncResponse(value: unknown): value is SafePesuSyncResponse {
    if (!value || typeof value !== "object") return false;

    const data = value as Partial<SafePesuSyncResponse>;

    return (
        data.ok === true &&
        data.source === "pesu" &&
        typeof data.syncedAt === "string" &&
        Boolean(data.profile) &&
        Array.isArray(data.attendance) &&
        Array.isArray(data.courses) &&
        (data.timetable === undefined || Array.isArray(data.timetable.slots)) &&
        (data.results === undefined || Array.isArray(data.results.courses)) &&
        (data.seating === undefined || Array.isArray(data.seating.items))
    );
}

function toSafePesuSyncResponse(data: SafePesuSyncResponse): SafePesuSyncResponse {
    return {
        ok: true,
        source: "pesu",
        syncedAt: data.syncedAt,
        profile: data.profile,
        attendance: data.attendance,
        courses: data.courses,
        timetable: data.timetable,
        results: data.results,
        seating: data.seating ?? { items: [] },
        errors: {
            ...data.errors,
            seating: data.errors?.seating ?? null,
        },
    };
}

export function runCampusFlowPesuSync({
    username,
    password,
    semester,
    semid,
}: PesuSyncInput) {
    return new Promise<SafePesuSyncResponse>((resolve, reject) => {
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
                const parsed = JSON.parse(stdout || "{}") as
                    | SafePesuSyncResponse
                    | { ok?: false; error?: string };

                if (code !== 0 || !isSafePesuSyncResponse(parsed)) {
                    reject(
                        new Error(
                            ("error" in parsed && parsed.error) ||
                            stderr ||
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
