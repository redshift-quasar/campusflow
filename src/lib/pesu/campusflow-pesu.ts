import type { AttendanceSubject } from "@/lib/academic-utils";

export const PESU_SYNC_CACHE_KEY = "campusflow_safe_pesu_sync";
const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";

export type SafePesuProfile = {
    name?: string;
    srn?: string;
    pesuId?: string;
    program?: string;
    branch?: string;
    semester?: string;
    semesterNumber?: number;
    section?: string;
    photoDataUrl?: string | null;
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

export type SafePesuTimetableSlot = {
    id: string;
    day: string;
    dayIndex: number;
    slotOrder: number;
    time: string;
    startTime: string;
    endTime: string;
    code: string;
    subject: string;
    faculty: string;
    faculties: string[];
    type: "Lecture" | "Lab" | "Tutorial";
    room: string;
    roomId?: string | null;
    templateDetailsId?: string | null;
};

export type SafePesuTimetable = {
    slots: SafePesuTimetableSlot[];
    days?: string[];
    roomId?: string | null;
    lastFinalizedAt?: string | null;
};

export type SafePesuResultAssessment = {
    name: string;
    marks?: number | null;
    maxMarks?: number | null;
};

export type SafePesuResultCourse = {
    code: string;
    name: string;
    credits?: number | null;
    maxCredits?: number | null;
    grade?: string | null;
    assessments: SafePesuResultAssessment[];
};

export type SafePesuResults = {
    semester?: number | null;
    description?: string;
    earnedCredits?: number | null;
    totalCredits?: number | null;
    sgpa?: number | null;
    cgpa?: number | null;
    courses: SafePesuResultCourse[];
};

export type SafePesuSeatingItem = {
    assessment: string;
    code: string;
    date: string;
    time: string;
    terminal: string;
    block: string;
    subject?: string | null;
};

export type SafePesuSeating = {
    items: SafePesuSeatingItem[];
};

export type SafePesuSyncResponse = {
    ok: boolean;
    source: "pesu";
    syncedAt: string;
    profile: SafePesuProfile;
    attendance: SafePesuAttendanceSubject[];
    courses: SafePesuCourse[];
    timetable?: SafePesuTimetable;
    results?: SafePesuResults;
    seating?: SafePesuSeating;
    errors?: {
        attendance?: string | null;
        courses?: string | null;
        timetable?: string | null;
        results?: string | null;
        seating?: string | null;
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
    const timetableIsValid =
        data.timetable === undefined ||
        (Boolean(data.timetable) && Array.isArray(data.timetable.slots));
    const resultsIsValid =
        data.results === undefined ||
        (Boolean(data.results) && Array.isArray(data.results.courses));
    const hasValidSeating =
        data.seating === undefined ||
        (Boolean(data.seating) && Array.isArray(data.seating.items));

    return (
        data.ok === true &&
        data.source === "pesu" &&
        typeof data.syncedAt === "string" &&
        Array.isArray(data.attendance) &&
        Array.isArray(data.courses) &&
        timetableIsValid &&
        resultsIsValid &&
        hasValidSeating
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

    const safeData: SafePesuSyncResponse = {
        ok: data.ok,
        source: data.source,
        syncedAt: data.syncedAt,
        profile: data.profile,
        attendance: data.attendance,
        courses: data.courses,
        timetable: data.timetable,
        results: data.results,
        seating: data.seating,
        errors: data.errors,
    };

    localStorage.setItem(PESU_SYNC_CACHE_KEY, JSON.stringify(safeData));
    window.dispatchEvent(new Event(PESU_SYNC_EVENT));
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
    window.dispatchEvent(new Event(PESU_SYNC_EVENT));
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
