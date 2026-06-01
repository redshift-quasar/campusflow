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
  ok: true;
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

type FailedPesuSyncResponse = {
  ok: false;
  error?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafePesuProfile(value: unknown): value is SafePesuProfile {
  return isObject(value);
}

function isSafeAttendanceSubject(
  value: unknown
): value is SafePesuAttendanceSubject {
  if (!isObject(value)) return false;

  return (
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    typeof value.attended === "number" &&
    typeof value.total === "number" &&
    typeof value.percentage === "number"
  );
}

function isSafeCourse(value: unknown): value is SafePesuCourse {
  if (!isObject(value)) return false;

  return typeof value.code === "string" && typeof value.name === "string";
}

function isSafeSyncResponse(value: unknown): value is SafePesuSyncResponse {
  if (!isObject(value)) return false;

  return (
    value.ok === true &&
    value.source === "pesu" &&
    typeof value.syncedAt === "string" &&
    isSafePesuProfile(value.profile) &&
    Array.isArray(value.attendance) &&
    value.attendance.every(isSafeAttendanceSubject) &&
    Array.isArray(value.courses) &&
    value.courses.every(isSafeCourse)
  );
}

export async function syncPesuData({
  srn,
  password,
  semester,
}: SafePesuSyncInput): Promise<SafePesuSyncResponse> {
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

  const data = (await response.json()) as
    | SafePesuSyncResponse
    | FailedPesuSyncResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "PESU sync failed.");
  }

  return data;
}

export function savePesuSyncCache(data: SafePesuSyncResponse) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PESU_SYNC_CACHE_KEY, JSON.stringify(data));
}

export function getPesuSyncCache(): SafePesuSyncResponse | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

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

export function getSafePesuProfileFromCache() {
  return getPesuSyncCache()?.profile ?? null;
}

export function getSafePesuCoursesFromCache() {
  return getPesuSyncCache()?.courses ?? [];
}