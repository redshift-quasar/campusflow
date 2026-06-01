import type { AttendanceSubject } from "@/lib/academic-utils";

export const PESU_SYNC_CACHE_KEY = "campusflow_safe_pesu_sync";

export type SafePesuProfile = {
    name?: string;
    srn?: string;
    pesuId?: string;
    program?: string;
    branch?: string;
    semester?: string;
    semesterNumber?: number;
    section?: string;
    photoDataUrl?: string;
};

export type SafePesuAttendanceSubject = {
    code: string;
    name: string;
    attended: number;
    total: number;
    percentage: number;
    id?: string | null;
};

export type SafePesuCourse = {
    code: string;
    name: string;
    type?: string | null;
    status?: string | null;
    id?: string | null;
};

export type SafePesuSyncResponse = {
    ok: boolean;
    source: "pesu";
    syncedAt: string;
    profile: SafePesuProfile;
    attendance: SafePesuAttendanceSubject[];
    courses: SafePesuCourse[];
    errors?: {
        attendance?: string | null;
        courses?: string | null;
    };
};

export type SafePesuSyncInput = {
    srn: string;
    password: string;
    semester?: number;
};

function isSafeSyncResponse(value: unknown): value is SafePesuSyncResponse {
    if (!value || typeof value !== "object") return false;

    const data = value as Partial<SafePesuSyncResponse>;

    return (
        data.ok === true &&
        data.source === "pesu" &&
        typeof data.syncedAt === "string" &&
        Array.isArray(data.attendance) &&
        Array.isArray(data.courses)
    );
}

export async function syncPesuData({
    srn,
    password,
    semester,
}: SafePesuSyncInput) {
    const response = await fetch("/api/pesu/sync", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
            srn,
            password,
            semester,
        }),
    });

    const data = (await response.json()) as SafePesuSyncResponse | {
        ok: false;
        error?: string;
    };

    if (!response.ok || !data.ok) {
        throw new Error(
            "error" in data && data.error ? data.error : "PESU sync failed."
        );
    }

    return data;
}

export function savePesuSyncCache(data: SafePesuSyncResponse) {
    if (typeof window === "undefined") return;

    localStorage.setItem(PESU_SYNC_CACHE_KEY, JSON.stringify(data));
}

export function getPesuSyncCache() {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);

        if (!isSafeSyncResponse(parsed)) {
            localStorage.removeItem(PESU_SYNC_CACHE_KEY);
            return null;
        }

        return parsed;
    } catch {
        localStorage.removeItem(PESU_SYNC_CACHE_KEY);
        return null;
    }
}

export function clearPesuSyncCache() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(PESU_SYNC_CACHE_KEY);
}

export function mapPesuAttendanceToSubjects(
    attendance: SafePesuAttendanceSubject[]
): AttendanceSubject[] {
    return attendance.map((subject) => ({
        code: subject.code,
        name: subject.name,
        attended: subject.attended,
        total: subject.total,
        faculty: undefined,
    }));
}