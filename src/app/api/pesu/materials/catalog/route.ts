import { NextResponse } from "next/server";
import { runMaterialsCatalogFetcher } from "@/lib/server/pesu-materials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuMaterialsCatalogRequest = {
    username?: unknown;
    password?: unknown;
    semester?: unknown;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as PesuMaterialsCatalogRequest;

        const username = typeof body.username === "string" ? body.username.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const semester =
            typeof body.semester === "string" || typeof body.semester === "number"
                ? body.semester
                : undefined;

        if (!username || !password) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Username and password are required.",
                },
                {
                    status: 400,
                }
            );
        }

        const result = await runMaterialsCatalogFetcher({
            username,
            password,
            semester,
        });

        return NextResponse.json(result);
    } catch {
        return NextResponse.json(
            {
                ok: false,
                error: "Could not load study material catalog.",
            },
            {
                status: 500,
            }
        );
    }
}
