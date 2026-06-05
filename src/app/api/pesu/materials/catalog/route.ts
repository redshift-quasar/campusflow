import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        materials: [],
        available: false,
        message: "Study materials are not configured yet.",
    });
}
