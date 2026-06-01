import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuSyncRequest = {
    srn?: string;
    username?: string;
    password?: string;
    semester?: number;
};

type PesuSyncResult = {
    ok?: boolean;
    error?: string;
    trace?: string;
    source?: string;
    syncedAt?: string;
    profile?: {
        name?: string;
        srn?: string;
        pesuId?: string;
        program?: string;
        branch?: string;
        semester?: string;
        semesterNumber?: number;
        section?: string;
    };
    attendance?: {
        code: string;
        name: string;
        attended: number;
        total: number;
        percentage: number;
        id?: string | null;
    }[];
    courses?: {
        code: string;
        name: string;
        type?: string | null;
        status?: string | null;
        id?: string | null;
    }[];
    errors?: {
        attendance?: string | null;
        courses?: string | null;
    };
};

function getPythonPath() {
    return process.env.CAMPUSFLOW_PYTHON_PATH || "python3";
}

function runCampusFlowPesuSync({
    username,
    password,
    semester,
}: {
    username: string;
    password: string;
    semester?: number;
}) {
    return new Promise<PesuSyncResult>((resolve, reject) => {
        const scriptPath = path.join(
            process.cwd(),
            "scripts",
            "campusflow_pesu.py"
        );

        const child = spawn(getPythonPath(), [scriptPath], {
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
                const parsed = JSON.parse(stdout || "{}") as PesuSyncResult;

                if (code !== 0 || !parsed.ok) {
                    reject(
                        new Error(
                            parsed.error ||
                            stderr ||
                            `CampusFlow PESU sync failed with code ${code}`
                        )
                    );
                    return;
                }

                resolve(parsed);
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
                syncedAt: new Date().toISOString(),
            })
        );

        child.stdin.end();
    });
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as PesuSyncRequest;

        const username = body.username ?? body.srn;
        const password = body.password;

        if (!username || !password) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "SRN/username and password are required.",
                },
                {
                    status: 400,
                }
            );
        }

        const result = await runCampusFlowPesuSync({
            username,
            password,
            semester: body.semester,
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error ? error.message : "Unable to sync PESU data.",
            },
            {
                status: 500,
            }
        );
    }
}