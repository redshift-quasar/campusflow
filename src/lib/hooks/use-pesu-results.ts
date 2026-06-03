"use client";

import { useMemo, useSyncExternalStore } from "react";
import { results as demoResults, semesters as demoSemesters } from "@/lib/demo-data";
import type { ResultItem } from "@/lib/academic-utils";
import {
    getPesuSyncCache,
    PESU_SYNC_CACHE_KEY,
    type SafePesuResultCourse,
    type SafePesuResults,
} from "@/lib/pesu/campusflow-pesu";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";

const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";

type SemesterDisplay = {
    semester: string;
    sgpa: number | null;
    cgpa: number | null;
    credits: number | null;
};

type PesuResultsSnapshot = {
    results: ResultItem[];
    semesters: SemesterDisplay[];
    rawResults?: SafePesuResults;
    courses: SafePesuResultCourse[];
    syncedAt: string;
    source: "pesu" | "demo";
    error: string;
};

const DEMO_SNAPSHOT: PesuResultsSnapshot = {
    results: demoResults,
    semesters: demoSemesters,
    courses: [],
    syncedAt: "",
    source: "demo",
    error: "",
};

let cachedRawSync: string | null = null;
let cachedSnapshot: PesuResultsSnapshot = DEMO_SNAPSHOT;

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(PESU_SYNC_EVENT, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(PESU_SYNC_EVENT, callback);
    };
}

function numberOrZero(value: number | null | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;

    return value;
}

function getCoursePercent(course: SafePesuResultCourse) {
    const scoredAssessments = course.assessments.filter(
        (assessment) =>
            typeof assessment.marks === "number" &&
            typeof assessment.maxMarks === "number" &&
            assessment.maxMarks > 0
    );

    if (!scoredAssessments.length) return null;

    const marks = scoredAssessments.reduce(
        (total, assessment) => total + numberOrZero(assessment.marks),
        0
    );
    const maxMarks = scoredAssessments.reduce(
        (total, assessment) => total + numberOrZero(assessment.maxMarks),
        0
    );

    if (!maxMarks) return null;

    return Math.round((marks / maxMarks) * 100);
}

function createResultsSnapshot(
    results: SafePesuResults | null | undefined,
    syncedAt: string,
    error = ""
): PesuResultsSnapshot | null {
    if (!results?.courses.length) return null;

    const mappedResults: ResultItem[] = results.courses.map((course, index) => ({
        code: course.code || `PESU-${index + 1}`,
        subject: course.name || course.code || "Untitled Course",
        total: getCoursePercent(course),
        grade: course.grade ?? "-",
        credits: course.credits ?? null,
    }));

    const semesterLabel = results.semester
        ? `Semester ${results.semester}`
        : "PESU Semester";
    const semesterRecord: SemesterDisplay = {
        semester: semesterLabel,
        sgpa: results.sgpa ?? null,
        cgpa: results.cgpa ?? null,
        credits: results.earnedCredits ?? null,
    };

    return {
        results: mappedResults,
        semesters: [semesterRecord],
        rawResults: results,
        courses: results.courses,
        syncedAt,
        source: "pesu",
        error,
    };
}

function getSnapshot(): PesuResultsSnapshot {
    if (typeof window === "undefined") return DEMO_SNAPSHOT;

    const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

    if (raw === cachedRawSync) {
        return cachedSnapshot;
    }

    cachedRawSync = raw;

    const cache = getPesuSyncCache();
    const pesuSnapshot = createResultsSnapshot(
        cache?.results,
        cache?.syncedAt ?? "",
        cache?.errors?.results ?? ""
    );

    cachedSnapshot = pesuSnapshot ?? DEMO_SNAPSHOT;

    return cachedSnapshot;
}

function getServerSnapshot(): PesuResultsSnapshot {
    return DEMO_SNAPSHOT;
}

export function usePesuResults() {
    const localState = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    const { results, syncedAt, errors } = usePesuSession();
    const state = useMemo(() => {
        const serverSnapshot = createResultsSnapshot(
            results,
            syncedAt,
            errors?.results ?? ""
        );

        if (serverSnapshot) return serverSnapshot;

        if (results || errors?.results) {
            return {
                ...localState,
                error:
                    errors?.results ??
                    "PESU results are not released for this semester yet.",
            };
        }

        return localState;
    }, [errors?.results, localState, results, syncedAt]);

    return {
        results: state.results,
        courses: state.courses,
        semesters: state.semesters,
        rawResults: state.rawResults,
        syncedAt: state.syncedAt,
        source: state.source,
        error: state.error,
        usingDemoData: state.source === "demo",
    };
}
