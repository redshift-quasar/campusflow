"use client";

import { useCallback, useEffect, useState } from "react";
import {
    clearPesuSyncCache,
    type SafePesuAttendanceSubject,
    type SafePesuCourse,
    type SafePesuProfile,
    type SafePesuResults,
    type SafePesuSyncResponse,
    type SafePesuTimetable,
} from "@/lib/pesu/campusflow-pesu";

const PESU_SESSION_EVENT = "campusflow_pesu_session_changed";

export type PesuSession = {
    connected: boolean;
    srn: string | null;
    connectorMode: "pesu" | "none" | string;
    source?: "pesu";
    syncedAt: string;
    profile: SafePesuProfile | null;
    attendance: SafePesuAttendanceSubject[];
    courses: SafePesuCourse[];
    timetable?: SafePesuTimetable;
    results?: SafePesuResults;
    errors?: SafePesuSyncResponse["errors"];
    data?: SafePesuSyncResponse;
};

type PesuSessionApiResponse = Partial<PesuSession> & {
    message?: string;
    data?: SafePesuSyncResponse;
};

const EMPTY_SESSION: PesuSession = {
    connected: false,
    srn: null,
    connectorMode: "none",
    syncedAt: "",
    profile: null,
    attendance: [],
    courses: [],
};

function notifyPesuSessionChanged() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new Event(PESU_SESSION_EVENT));
}

function normalizeSessionResponse(data: PesuSessionApiResponse): PesuSession {
    const safeData = data.data;

    return {
        connected: Boolean(data.connected),
        srn: data.srn ?? safeData?.profile.srn ?? null,
        connectorMode: data.connected ? data.connectorMode ?? "pesu" : "none",
        source: data.source ?? safeData?.source,
        syncedAt: data.syncedAt ?? safeData?.syncedAt ?? "",
        profile: data.profile ?? safeData?.profile ?? null,
        attendance: data.attendance ?? safeData?.attendance ?? [],
        courses: data.courses ?? safeData?.courses ?? [],
        timetable: data.timetable ?? safeData?.timetable,
        results: data.results ?? safeData?.results,
        errors: data.errors ?? safeData?.errors,
        data: safeData,
    };
}

export function usePesuSession() {
    const [session, setSession] = useState<PesuSession>(EMPTY_SESSION);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const refreshSession = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await fetch("/api/pesu/session", {
                cache: "no-store",
            });

            const data = (await response.json()) as PesuSessionApiResponse;

            if (!response.ok) {
                throw new Error(data.message || "Could not load PESU session");
            }

            setSession(normalizeSessionResponse(data));
            setError("");
        } catch {
            setSession(EMPTY_SESSION);
            setError("Could not check PESUAcademy connection.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    async function connect(srn: string, password: string) {
        try {
            setIsSubmitting(true);
            setError("");

            const response = await fetch("/api/pesu/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    srn,
                    password,
                }),
            });

            const data = (await response.json()) as PesuSessionApiResponse;

            if (!response.ok || !data.connected) {
                throw new Error(data.message || "Login failed");
            }

            setSession(normalizeSessionResponse(data));
            clearPesuSyncCache();
            notifyPesuSessionChanged();
        } catch (connectError) {
            setError(
                connectError instanceof Error
                    ? connectError.message
                    : "Could not connect PESUAcademy. Check SRN/password."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function disconnect() {
        try {
            setIsSubmitting(true);
            setError("");

            const response = await fetch("/api/pesu/logout", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            setSession(EMPTY_SESSION);
            clearPesuSyncCache();
            notifyPesuSessionChanged();
        } catch {
            setError("Could not disconnect PESUAcademy.");
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            void refreshSession();
        }, 0);

        function handleSessionChanged() {
            void refreshSession();
        }

        window.addEventListener(PESU_SESSION_EVENT, handleSessionChanged);

        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener(PESU_SESSION_EVENT, handleSessionChanged);
        };
    }, [refreshSession]);

    return {
        session,
        connected: session.connected,
        srn: session.srn,
        connectorMode: session.connectorMode,
        source: session.source,
        syncedAt: session.syncedAt,
        profile: session.profile,
        attendance: session.attendance,
        courses: session.courses,
        timetable: session.timetable,
        results: session.results,
        errors: session.errors,
        isLoading,
        isSubmitting,
        error,
        connect,
        disconnect,
        refreshSession,
    };
}
