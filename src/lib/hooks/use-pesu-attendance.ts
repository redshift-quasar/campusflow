"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { attendanceSubjects } from "@/lib/demo-data";
import type { AttendanceSubject } from "@/lib/academic-utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
    clearPesuSyncCache,
    getPesuSyncCache,
    mapPesuAttendanceToSubjects,
    PESU_SYNC_CACHE_KEY,
} from "@/lib/pesu/campusflow-pesu";

export type PesuLoadState = "loading" | "ready" | "error";
export type PesuDataSource = "demo" | "pesu";

type PesuAttendanceSnapshot = {
    subjects: AttendanceSubject[];
    loadState: PesuLoadState;
    syncedAt: string;
    source: PesuDataSource;
    error: string;
};

type PesuAttendanceApiResponse = {
    source?: string;
    syncedAt?: string;
    subjects?: AttendanceSubject[];
    error?: string;
    message?: string;
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
    const localState = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
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
                throw new Error(
                    data.error || data.message || "Could not refresh PESU attendance."
                );
            }

            if (!Array.isArray(data.subjects)) {
                throw new Error("PESU attendance response was not valid.");
            }

            setServerState({
                subjects: data.subjects,
                loadState: "ready",
                syncedAt: data.syncedAt ?? new Date().toISOString(),
                source: "pesu",
                error: "",
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Could not refresh PESU attendance.";

            setServerState((current) => ({
                ...(current ?? getSnapshot()),
                loadState: "error",
                error: message,
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

    const state = serverState ?? localState;

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
