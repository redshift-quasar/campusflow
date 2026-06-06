import { NextResponse } from "next/server";
import { prepareMockMaterialMerge } from "@/lib/server/pesu-materials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PesuMaterialsMergeRequest = {
    username?: unknown;
    password?: unknown;
    materialIds?: unknown;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as PesuMaterialsMergeRequest;

        const username = typeof body.username === "string" ? body.username.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const materialIds = Array.isArray(body.materialIds)
            ? body.materialIds.filter(
                  (materialId): materialId is string =>
                      typeof materialId === "string" && materialId.length > 0
              )
            : [];

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

        if (materialIds.length === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Select at least one material to merge.",
                },
                {
                    status: 400,
                }
            );
        }

        const merge = await prepareMockMaterialMerge(materialIds);

        return NextResponse.json({
            ok: true,
            source: "mock",
            message: merge.message,
            materialIds: merge.materialIds,
            selectedCount: merge.selectedCount,
        });
    } catch {
        return NextResponse.json(
            {
                ok: false,
                error: "Could not prepare material merge.",
            },
            {
                status: 500,
            }
        );
    }
}
