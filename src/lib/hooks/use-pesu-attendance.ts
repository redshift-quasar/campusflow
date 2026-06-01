"use client";

import { useCallback, useSyncExternalStore } from "react";
import { attendanceSubjects } from "@/lib/demo-data";
import type { AttendanceSubject } from "@/lib/academic-utils";
import {
    clearPesuSyncCache,
    getPesuSyncCache,
    mapPesuAttendanceToSubjects,
    PESU_SYNC_CACHE_KEY,
} from "@/lib/pesu/campusflow-pesu";

export type PesuLoadState = "ready" | "error";
export type PesuDataSource = "demo" | "pesu";

type PesuAttendanceSnapshot = {
    subjects: AttendanceSubject[];
    loadState: PesuLoadState;
    syncedAt: string;
    source: PesuDataSource;
    error: string;
};

const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";

const SERVER_SNAPSHOT: PesuAttendanceSnapshot = {
    subjects: attendanceSubjects,
    loadState: "ready",
    syncedAt: "",
    source: "demo",
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

    cachedSnapshot = {
        subjects: mapPesuAttendanceToSubjects(safeCache.attendance),
        loadState: "ready",
        syncedAt: safeCache.syncedAt,
        source: "pesu",
        error: "",
    };

    return cachedSnapshot;
}

function getServerSnapshot(): PesuAttendanceSnapshot {
    return SERVER_SNAPSHOT;
}

export function usePesuAttendance() {
    const state = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const resetAttendanceCache = useCallback(() => {
        clearPesuSyncCache();
        cachedRawSync = null;
        cachedSnapshot = SERVER_SNAPSHOT;
        notifyPesuSyncChanged();
    }, []);

    const syncAttendance = useCallback(() => {
        notifyPesuSyncChanged();
    }, []);

    return {
        subjects: state.subjects,
        loadState: state.loadState,
        syncedAt: state.syncedAt,
        source: state.source,
        error: state.error,
        syncAttendance,
        resetAttendanceCache,
        usingDemoData: state.source === "demo",
    };
}