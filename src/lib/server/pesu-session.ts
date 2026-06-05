import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type {
    SafePesuAttendanceSubject,
    SafePesuCourse,
    SafePesuProfile,
    SafePesuResults,
    SafePesuSeating,
    SafePesuSyncResponse,
    SafePesuTimetable,
} from "@/lib/pesu/campusflow-pesu";
import { sanitizePesuSyncErrors } from "@/lib/pesu/safe-errors";

export const PESU_SESSION_COOKIE = "campusflow_pesu_session";
export const PESU_SRN_COOKIE = "campusflow_pesu_srn";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type PesuSessionResponse = {
    connected: boolean;
    srn: string | null;
    connectorMode: "pesu" | "none";
    source?: "pesu";
    syncedAt?: string;
    profile?: SafePesuProfile;
    attendance: SafePesuAttendanceSubject[];
    courses: SafePesuCourse[];
    timetable?: SafePesuTimetable;
    results?: SafePesuResults;
    seating?: SafePesuSeating;
    errors?: SafePesuSyncResponse["errors"];
    data?: SafePesuSyncResponse;
};

type PesuSessionRecord = {
    sessionId: string;
    srn: string;
    data: SafePesuSyncResponse;
    expiresAt: number;
};

type PesuSessionSnapshot = PesuSessionResponse & {
    sessionId: string | null;
};

const globalForPesuSession = globalThis as typeof globalThis & {
    __campusflowPesuSessions?: Map<string, PesuSessionRecord>;
};

function getSessionStore() {
    globalForPesuSession.__campusflowPesuSessions ??= new Map();

    return globalForPesuSession.__campusflowPesuSessions;
}

function getSrnFromData(data: SafePesuSyncResponse) {
    return data.profile.srn ?? data.profile.pesuId ?? "PESU";
}

function sanitizePesuSessionData(data: SafePesuSyncResponse): SafePesuSyncResponse {
    return {
        ...data,
        errors: sanitizePesuSyncErrors(data.errors),
    };
}

export function createPesuSession(data: SafePesuSyncResponse) {
    const sessionId = crypto.randomUUID();
    const safeData = sanitizePesuSessionData(data);
    const srn = getSrnFromData(safeData);

    const record: PesuSessionRecord = {
        sessionId,
        srn,
        data: safeData,
        expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };

    getSessionStore().set(sessionId, record);

    return record;
}

export function setPesuSessionCookies(
    response: NextResponse,
    record: PesuSessionRecord
) {
    const cookieOptions = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    };

    response.cookies.set({
        ...cookieOptions,
        name: PESU_SESSION_COOKIE,
        value: record.sessionId,
    });

    response.cookies.set({
        ...cookieOptions,
        name: PESU_SRN_COOKIE,
        value: record.srn,
    });
}

export function clearPesuSessionRecord(sessionId?: string | null) {
    if (!sessionId) return;

    getSessionStore().delete(sessionId);
}

export function toPesuSessionResponse(
    session: PesuSessionSnapshot
): PesuSessionResponse {
    if (!session.connected || !session.data) {
        return {
            connected: false,
            srn: null,
            connectorMode: "none",
            attendance: [],
            courses: [],
            seating: { items: [] },
        };
    }

    const safeData = sanitizePesuSessionData(session.data);

    return {
        connected: true,
        srn: session.srn,
        connectorMode: "pesu",
        source: safeData.source,
        syncedAt: safeData.syncedAt,
        profile: safeData.profile,
        attendance: safeData.attendance,
        courses: safeData.courses,
        timetable: safeData.timetable,
        results: safeData.results,
        seating: safeData.seating ?? { items: [] },
        errors: safeData.errors,
        data: safeData,
    };
}

export async function getPesuSession(): Promise<PesuSessionSnapshot> {
    const cookieStore = await cookies();

    const sessionId = cookieStore.get(PESU_SESSION_COOKIE)?.value ?? null;
    const srnCookie = cookieStore.get(PESU_SRN_COOKIE)?.value ?? null;

    if (!sessionId) {
        return {
            connected: false,
            sessionId: null,
            srn: srnCookie,
            connectorMode: "none",
            attendance: [],
            courses: [],
            seating: { items: [] },
        };
    }

    const record = getSessionStore().get(sessionId);

    if (!record || record.expiresAt <= Date.now()) {
        clearPesuSessionRecord(sessionId);

        return {
            connected: false,
            sessionId,
            srn: srnCookie,
            connectorMode: "none",
            attendance: [],
            courses: [],
            seating: { items: [] },
        };
    }

    const safeData = sanitizePesuSessionData(record.data);

    return {
        connected: true,
        sessionId,
        srn: record.srn,
        connectorMode: "pesu",
        source: safeData.source,
        syncedAt: safeData.syncedAt,
        profile: safeData.profile,
        attendance: safeData.attendance,
        courses: safeData.courses,
        timetable: safeData.timetable,
        results: safeData.results,
        seating: safeData.seating ?? { items: [] },
        errors: safeData.errors,
        data: safeData,
    };
}
