"use client";

import { useSyncExternalStore } from "react";
import {
    getPesuSyncCache,
    PESU_SYNC_CACHE_KEY,
    type SafePesuCourse,
    type SafePesuProfile,
} from "@/lib/pesu/campusflow-pesu";

type PesuProfileSnapshot = {
    profile: SafePesuProfile | null;
    courses: SafePesuCourse[];
    syncedAt: string;
    source: "pesu" | "none";
};

const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";

const SERVER_SNAPSHOT: PesuProfileSnapshot = {
    profile: null,
    courses: [],
    syncedAt: "",
    source: "none",
};

let cachedRawSync: string | null = null;
let cachedSnapshot: PesuProfileSnapshot = SERVER_SNAPSHOT;

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(PESU_SYNC_EVENT, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(PESU_SYNC_EVENT, callback);
    };
}

function getSnapshot(): PesuProfileSnapshot {
    if (typeof window === "undefined") return SERVER_SNAPSHOT;

    const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

    if (raw === cachedRawSync) {
        return cachedSnapshot;
    }

    cachedRawSync = raw;

    const cache = getPesuSyncCache();

    if (!cache) {
        cachedSnapshot = SERVER_SNAPSHOT;
        return cachedSnapshot;
    }

    cachedSnapshot = {
        profile: cache.profile,
        courses: cache.courses,
        syncedAt: cache.syncedAt,
        source: "pesu",
    };

    return cachedSnapshot;
}

function getServerSnapshot(): PesuProfileSnapshot {
    return SERVER_SNAPSHOT;
}

export function usePesuProfile() {
    const state = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    return {
        profile: state.profile,
        courses: state.courses,
        syncedAt: state.syncedAt,
        source: state.source,
        hasPesuProfile: state.source === "pesu" && Boolean(state.profile),
    };
}