import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json({
        merged: false,
        available: false,
        message: "Study materials merge is not configured yet.",
    });
}
