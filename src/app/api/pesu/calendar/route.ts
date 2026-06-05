import { NextRequest, NextResponse } from "next/server";
import { fetchPESPublicAcademicCalendar } from "@/lib/pesu/calendar-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const documentId = request.nextUrl.searchParams.get("documentId") ?? undefined;
    const result = await fetchPESPublicAcademicCalendar(documentId);

    return NextResponse.json(result, {
        status: result.ok ? 200 : 502,
    });
}