"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from "react";
import { attendanceSubjects } from "@/lib/demo-data";
import type { AttendanceSubject } from "@/lib/academic-utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";
import {
    clearPesuSyncCache,
    getPesuSyncCache,
    mapPesuAttendanceToSubjects,
    mapPesuCoursesToAttendanceFallback,
    PESU_SYNC_CACHE_KEY,
} from "@/lib/pesu/campusflow-pesu";
import { PESU_ATTENDANCE_FAILURE_MESSAGE } from "@/lib/pesu/safe-errors";

export type PesuLoadState = "loading" | "ready" | "error";
export type PesuDataSource = "demo" | "pesu";
export type PesuAttendanceMode = "live" | "manual-fallback" | "demo";

type PesuAttendanceSnapshot = {
    subjects: AttendanceSubject[];
    loadState: PesuLoadState;
    syncedAt: string;
    source: PesuDataSource;
    mode: PesuAttendanceMode;
    liveAvailable: boolean;
    message: string;
    error: string;
};

type PesuAttendanceApiResponse = {
    source?: string;
    syncedAt?: string;
    subjects?: AttendanceSubject[];
    liveAvailable?: boolean;
    mode?: PesuAttendanceMode;
    message?: string;
    errors?: {
        attendance?: string | null;
    };
    error?: string;
};

const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";

const SERVER_SNAPSHOT: PesuAttendanceSnapshot = {
    subjects: attendanceSubjects,
    loadState: "ready",
    syncedAt: "",
    source: "demo",
    mode: "demo",
    liveAvailable: false,
    message: "",
    error: "",
};

let cachedRawSync: string | null = null;

let cachedSnapshot: PesuAttendanceSnapshot = SERVER_SNAPSHOT;

export function notifyPesuSyncChanged() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new Event(PESU_SYNC_EVENT));
}

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(PESU_SYNC_EVENT, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(PESU_SYNC_EVENT, callback);
    };
}

function getSnapshot(): PesuAttendanceSnapshot {
    if (typeof window === "undefined") return SERVER_SNAPSHOT;

    const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

    if (raw === cachedRawSync) {
        return cachedSnapshot;
    }

    cachedRawSync = raw;

    const safeCache = getPesuSyncCache();

    if (!safeCache) {
        cachedSnapshot = SERVER_SNAPSHOT;
        return cachedSnapshot;
    }

    const liveSubjects = mapPesuAttendanceToSubjects(safeCache.attendance);
    const liveAvailable = liveSubjects.length > 0;

    cachedSnapshot = {
        subjects: liveAvailable
            ? liveSubjects
            : mapPesuCoursesToAttendanceFallback(safeCache.courses),
        loadState: "ready",
        syncedAt: safeCache.syncedAt,
        source: "pesu",
        mode: liveAvailable ? "live" : "manual-fallback",
        liveAvailable,
        message: liveAvailable
            ? ""
            : "Attendance is not available on PESU yet. Add your attendance manually.",
        error: safeCache.errors?.attendance ?? "",
    };

    return cachedSnapshot;
}

function getServerSnapshot(): PesuAttendanceSnapshot {
    return SERVER_SNAPSHOT;
}

export function usePesuAttendance() {
    const localState = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    const {
        attendance: sessionAttendance,
        syncedAt: sessionSyncedAt,
        connected: sessionConnected,
        source: sessionSource,
        courses: sessionCourses,
        errors: sessionErrors,
    } = usePesuSession();
    const autoSync = useSettingsStore((state) => state.autoSync);
    const [serverState, setServerState] = useState<PesuAttendanceSnapshot | null>(
        null
    );

    const refreshFromServer = useCallback(async () => {
        setServerState((current) => ({
            ...(current ?? getSnapshot()),
            loadState: "loading",
            error: "",
        }));

        try {
            const response = await fetch("/api/pesu/attendance", {
                cache: "no-store",
            });

            const data = (await response.json()) as PesuAttendanceApiResponse;

            if (!response.ok) {
                throw new Error(PESU_ATTENDANCE_FAILURE_MESSAGE);
            }

            if (!Array.isArray(data.subjects)) {
                throw new Error("PESU attendance response was not valid.");
            }

            setServerState({
                subjects: data.subjects,
                loadState: "ready",
                syncedAt: data.syncedAt ?? new Date().toISOString(),
                source: "pesu",
                mode: data.mode ?? (data.liveAvailable ? "live" : "manual-fallback"),
                liveAvailable: Boolean(data.liveAvailable),
                message: data.message ?? "",
                error: data.errors?.attendance ?? "",
            });
        } catch {
            setServerState((current) => ({
                ...(current ?? getSnapshot()),
                loadState: "error",
                error: PESU_ATTENDANCE_FAILURE_MESSAGE,
            }));
        }
    }, []);

    useEffect(() => {
        if (!autoSync) return;

        const timeout = window.setTimeout(() => {
            void refreshFromServer();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [autoSync, refreshFromServer]);

    const resetAttendanceCache = useCallback(() => {
        clearPesuSyncCache();
        cachedRawSync = null;
        cachedSnapshot = SERVER_SNAPSHOT;
        setServerState(null);
        notifyPesuSyncChanged();
    }, []);

    const syncAttendance = useCallback(() => {
        void refreshFromServer();
    }, [refreshFromServer]);

    const sessionState = useMemo<PesuAttendanceSnapshot | null>(() => {
        const liveSubjects = mapPesuAttendanceToSubjects(sessionAttendance);
        const liveAvailable = liveSubjects.length > 0;
        const fallbackSubjects = liveAvailable
            ? []
            : mapPesuCoursesToAttendanceFallback(sessionCourses);

        if (
            !sessionConnected &&
            !liveSubjects.length &&
            !fallbackSubjects.length
        ) {
            return null;
        }

        if (
            sessionSource !== "pesu" &&
            !liveSubjects.length &&
            !fallbackSubjects.length
        ) {
            return null;
        }

        return {
            subjects: liveAvailable ? liveSubjects : fallbackSubjects,
            loadState: "ready",
            syncedAt: sessionSyncedAt,
            source: "pesu",
            mode: liveAvailable ? "live" : "manual-fallback",
            liveAvailable,
            message: liveAvailable
                ? ""
                : "Attendance is not available on PESU yet. Add your attendance manually.",
            error: sessionErrors?.attendance ?? "",
        };
    }, [
        sessionAttendance,
        sessionConnected,
        sessionCourses,
        sessionErrors?.attendance,
        sessionSource,
        sessionSyncedAt,
    ]);

    const state = sessionState ?? serverState ?? localState;

    return {
        subjects: state.subjects,
        loadState: state.loadState,
        syncedAt: state.syncedAt,
        source: state.source,
        mode: state.mode,
        liveAvailable: state.liveAvailable,
        message: state.message,
        error: state.error,
        syncAttendance,
        resetAttendanceCache,
        usingDemoData: state.source === "demo",
    };
}
